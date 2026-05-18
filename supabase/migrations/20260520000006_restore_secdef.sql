-- SECURITY INVOKER 전환 롤백
-- get_stats_data, get_stats_summary, get_billing_page_data,
-- cancel_inventory_log, create_item_with_price, delete_shipout,
-- execute_shipout, process_inventory_delta, process_inventory_out,
-- reorder_categories, reorder_items, reset_item_price, update_shipout
-- 모두 SECURITY DEFINER로 복구
--
-- 이유: SECURITY INVOKER 상태에서는 auth.uid()가 없을 경우(또는
-- RLS 평가 시) my_role()이 NULL을 반환해 아무 데이터도 조회되지 않음.
-- 이 함수들은 내부에서 여러 테이블을 조인하며 postgres 권한이 필요.

-- ── get_stats_data ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stats_data(p_from date, p_to date, p_client_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ts_from timestamptz := p_from::timestamptz;
  v_ts_to   timestamptz := (p_to + INTERVAL '1 day')::timestamptz;
  v_result  json;
BEGIN
  WITH
  logs AS (
    SELECT
      il.shipout_id,
      il.item_id,
      il.quantity,
      il.processed_at::date AS log_date
    FROM public.inventory_logs il
    WHERE il.log_type    = 'out'
      AND il.shipout_id  IS NOT NULL
      AND il.processed_at >= v_ts_from
      AND il.processed_at <  v_ts_to
  ),
  item_agg AS (
    SELECT
      l.shipout_id,
      l.item_id,
      SUM(l.quantity)  AS qty,
      MAX(l.log_date)  AS max_date
    FROM logs l
    GROUP BY l.shipout_id, l.item_id
  ),
  item_prices_latest AS (
    SELECT DISTINCT ON (ia.shipout_id, ia.item_id)
      ia.shipout_id,
      ia.item_id,
      COALESCE(ip.unit_price, 0) AS unit_price
    FROM item_agg ia
    LEFT JOIN public.item_prices ip
      ON  ip.item_id        = ia.item_id
      AND ip.effective_from <= ia.max_date
    ORDER BY ia.shipout_id, ia.item_id, ip.effective_from DESC
  ),
  item_meta AS (
    SELECT
      ia.shipout_id,
      ia.item_id,
      i.name_ko       AS item_name,
      i.category_id,
      cat.name        AS category_name,
      ia.qty,
      ipl.unit_price
    FROM item_agg ia
    JOIN public.items      i   ON i.id   = ia.item_id
    JOIN public.categories cat ON cat.id = i.category_id
    JOIN item_prices_latest ipl
      ON  ipl.shipout_id = ia.shipout_id
      AND ipl.item_id    = ia.item_id
  ),
  shipout_items AS (
    SELECT
      im.shipout_id,
      json_agg(
        json_build_object(
          'item_id',       im.item_id,
          'item_name',     im.item_name,
          'category_id',   im.category_id,
          'category_name', im.category_name,
          'quantity',      im.qty,
          'unit_price',    im.unit_price
        )
      ) AS items_json
    FROM item_meta im
    GROUP BY im.shipout_id
  ),
  active_shipout_ids AS (
    SELECT DISTINCT shipout_id FROM logs
  ),
  result AS (
    SELECT
      json_agg(
        json_build_object(
          'id',          s.id,
          'client_id',   s.client_id,
          'client_name', c.name,
          'created_at',  s.created_at,
          'items',       COALESCE(si.items_json, '[]'::json)
        )
        ORDER BY s.created_at
      ) AS shipouts_json
    FROM public.shipouts s
    JOIN public.clients            c   ON c.id  = s.client_id
    JOIN active_shipout_ids asi ON asi.shipout_id = s.id
    LEFT JOIN shipout_items si  ON si.shipout_id  = s.id
    WHERE s.deleted_at IS NULL
      AND (p_client_id IS NULL OR s.client_id = p_client_id)
  )

  SELECT json_build_object(
    'shipouts',
    COALESCE((SELECT shipouts_json FROM result), '[]'::json)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- ── get_stats_summary ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stats_summary(p_from date, p_to date, p_group_by text, p_client_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ts_from  timestamptz := p_from::timestamptz;
  v_ts_to    timestamptz := (p_to + INTERVAL '1 day')::timestamptz;
  v_result   json;
BEGIN
  WITH
  logs AS (
    SELECT
      il.shipout_id,
      il.item_id,
      il.quantity,
      il.processed_at
    FROM public.inventory_logs il
    JOIN public.shipouts s ON s.id = il.shipout_id
    WHERE il.log_type        = 'out'
      AND il.shipout_id      IS NOT NULL
      AND il.processed_at    >= v_ts_from
      AND il.processed_at    <  v_ts_to
      AND s.deleted_at       IS NULL
      AND (p_client_id IS NULL OR s.client_id = p_client_id)
  ),
  logs_with_period AS (
    SELECT
      l.shipout_id,
      l.item_id,
      l.quantity,
      l.processed_at,
      CASE p_group_by
        WHEN 'day'   THEN to_char(l.processed_at, 'YYYY-MM-DD')
        WHEN 'month' THEN to_char(date_trunc('month', l.processed_at), 'YYYY-MM')
        WHEN 'year'  THEN to_char(date_trunc('year',  l.processed_at), 'YYYY')
        ELSE              to_char(l.processed_at, 'YYYY-MM-DD')
      END AS period,
      CASE p_group_by
        WHEN 'day'   THEN l.processed_at::date
        WHEN 'month' THEN date_trunc('month', l.processed_at)::date
        WHEN 'year'  THEN date_trunc('year',  l.processed_at)::date
        ELSE              l.processed_at::date
      END AS period_date
    FROM logs l
  ),
  item_agg AS (
    SELECT
      lp.period,
      lp.period_date,
      lp.shipout_id,
      lp.item_id,
      SUM(lp.quantity)        AS qty,
      MAX(lp.processed_at)    AS max_processed_at
    FROM logs_with_period lp
    GROUP BY lp.period, lp.period_date, lp.shipout_id, lp.item_id
  ),
  item_prices_latest AS (
    SELECT DISTINCT ON (ia.period, ia.shipout_id, ia.item_id)
      ia.period,
      ia.period_date,
      ia.shipout_id,
      ia.item_id,
      ia.qty,
      COALESCE(ip.unit_price, 0) AS unit_price
    FROM item_agg ia
    LEFT JOIN public.item_prices ip
      ON  ip.item_id        = ia.item_id
      AND ip.effective_from <= ia.max_processed_at::date
    ORDER BY ia.period, ia.shipout_id, ia.item_id, ip.effective_from DESC
  ),
  period_agg AS (
    SELECT
      ipl.period,
      ipl.period_date,
      SUM(ipl.qty)                          AS qty,
      SUM(ipl.qty * ipl.unit_price)         AS amount,
      COUNT(DISTINCT ipl.shipout_id)        AS count
    FROM item_prices_latest ipl
    GROUP BY ipl.period, ipl.period_date
    ORDER BY ipl.period_date
  )

  SELECT json_build_object(
    'rows',
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'period', pa.period,
            'qty',    pa.qty,
            'amount', pa.amount,
            'count',  pa.count
          )
          ORDER BY pa.period_date
        )
        FROM period_agg pa
      ),
      '[]'::json
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

-- ── get_billing_page_data ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_billing_page_data(p_client_id uuid)
 RETURNS TABLE(categories jsonb, shipout_logs jsonb, invoices jsonb)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_categories   jsonb;
  v_logs         jsonb;
  v_invoices     jsonb;
BEGIN

  -- ── 1. categories ────────────────────────────────────────────────────────
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id',         c.id,
        'name',       c.name,
        'sort_order', c.sort_order
      )
      ORDER BY c.sort_order ASC
    )::jsonb,
    '[]'::jsonb
  )
  INTO v_categories
  FROM public.categories c
  WHERE c.client_id = p_client_id;

  -- ── 2. shipout_logs ───────────────────────────────────────────────────────
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'shipout_id',      il.shipout_id,
        'processed_at',    il.processed_at,
        'item_id',         il.item_id,
        'item_name_ko',    i.name_ko,
        'category_id',     i.category_id,
        'item_sort_order', i.sort_order,
        'quantity',        il.quantity,
        'unit_price',      COALESCE((
          SELECT ip.unit_price
          FROM public.item_prices ip
          WHERE ip.item_id = il.item_id
            AND ip.effective_from <= il.processed_at::date
          ORDER BY ip.effective_from DESC
          LIMIT 1
        ), (
          SELECT ip2.unit_price
          FROM public.item_prices ip2
          WHERE ip2.item_id = il.item_id
          ORDER BY ip2.effective_from ASC
          LIMIT 1
        ), 0),
        'price_from',      (
          SELECT ip3.effective_from
          FROM public.item_prices ip3
          WHERE ip3.item_id = il.item_id
            AND ip3.effective_from <= il.processed_at::date
          ORDER BY ip3.effective_from DESC
          LIMIT 1
        ),
        'price_to',        (
          SELECT (ip4.effective_from - INTERVAL '1 day')::date
          FROM public.item_prices ip4
          WHERE ip4.item_id = il.item_id
            AND ip4.effective_from > (
              SELECT COALESCE(
                (SELECT ip5.effective_from
                 FROM public.item_prices ip5
                 WHERE ip5.item_id = il.item_id
                   AND ip5.effective_from <= il.processed_at::date
                 ORDER BY ip5.effective_from DESC
                 LIMIT 1),
                (SELECT ip6.effective_from
                 FROM public.item_prices ip6
                 WHERE ip6.item_id = il.item_id
                 ORDER BY ip6.effective_from ASC
                 LIMIT 1)
              )
            )
          ORDER BY ip4.effective_from ASC
          LIMIT 1
        )
      )
      ORDER BY il.processed_at DESC
    )::jsonb,
    '[]'::jsonb
  )
  INTO v_logs
  FROM public.inventory_logs il
  INNER JOIN public.items i ON i.id = il.item_id
  INNER JOIN public.shipouts s ON s.id = il.shipout_id AND s.deleted_at IS NULL
  WHERE il.client_id  = p_client_id
    AND il.log_type   = 'out'
    AND il.shipout_id IS NOT NULL;

  -- ── 3. invoices (최근 50건, invoice_items 포함) ──────────────────────────
  SELECT COALESCE(
    json_agg(inv_row ORDER BY inv_row.created_at DESC)::jsonb,
    '[]'::jsonb
  )
  INTO v_invoices
  FROM (
    SELECT
      inv.id,
      inv.period_start,
      inv.period_end,
      inv.subtotal,
      inv.vat,
      inv.jeolsa,
      inv.total,
      inv.created_at,
      inv.snapshot_factory,
      inv.snapshot_client,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id',            ii.id,
              'item_name_ko',  ii.item_name_ko,
              'category_name', ii.category_name,
              'quantity',      ii.quantity,
              'unit_price',    ii.unit_price,
              'amount',        ii.amount,
              'sort_order',    ii.sort_order
            )
            ORDER BY ii.sort_order ASC
          )
          FROM public.invoice_items ii
          WHERE ii.invoice_id = inv.id
        ),
        '[]'::json
      ) AS invoice_items
    FROM public.invoices inv
    WHERE inv.client_id = p_client_id
    ORDER BY inv.created_at DESC
    LIMIT 50
  ) inv_row;

  RETURN QUERY SELECT v_categories, v_logs, v_invoices;
END;
$function$;

-- ── cancel_inventory_log ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_inventory_log(p_log_id uuid, p_cancelled_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_log       RECORD;
  v_new_qty   integer;
BEGIN
  -- 로그 조회 (FOR UPDATE 로 동시 취소 방지)
  SELECT id, inventory_id, item_id, quantity, log_type, shipout_id
    INTO v_log
    FROM inventory_logs
   WHERE id = p_log_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LOG_NOT_FOUND'
      USING DETAIL = format('log_id:%s 존재하지 않음', p_log_id);
  END IF;

  -- 출고 로그는 이 RPC로 취소하지 않음 (delete_shipout 사용)
  IF v_log.shipout_id IS NOT NULL THEN
    RAISE EXCEPTION 'USE_DELETE_SHIPOUT'
      USING DETAIL = format('log_id:%s 는 출고 로그입니다. delete_shipout RPC를 사용하세요.', p_log_id);
  END IF;

  -- 재고 복구: 입고(in)면 다시 빼고, 출고(out)면 다시 더함
  UPDATE inventory
     SET quantity   = CASE
                        WHEN v_log.log_type = 'in'  THEN quantity - v_log.quantity
                        ELSE                              quantity + v_log.quantity
                      END,
         updated_at = now()
   WHERE id = v_log.inventory_id
   RETURNING quantity INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_NOT_FOUND'
      USING DETAIL = format('inventory_id:%s 존재하지 않음', v_log.inventory_id);
  END IF;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK'
      USING DETAIL = format('재고가 부족합니다. 현재 복구 후 수량: %s', v_new_qty);
  END IF;

  -- 로그 하드딜리트
  DELETE FROM inventory_logs WHERE id = p_log_id;

  RETURN jsonb_build_object(
    'log_id',        p_log_id,
    'inventory_id',  v_log.inventory_id,
    'restored_qty',  v_new_qty,
    'ok',            true
  );
END;
$function$;

-- ── create_item_with_price ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_item_with_price(p_client_id uuid, p_category_id uuid, p_name_ko text, p_name_en text, p_name_zh text, p_nickname text, p_sort_order integer, p_unit_price integer, p_effective_from date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_item_id    uuid;
  v_sort_order integer;
BEGIN
  IF p_unit_price <= 0 THEN
    RAISE EXCEPTION 'unit_price must be greater than 0';
  END IF;

  INSERT INTO public.items (
    client_id, category_id, name_ko, name_en, name_zh, nickname, sort_order
  ) VALUES (
    p_client_id,
    p_category_id,
    p_name_ko,
    NULLIF(p_name_en, ''),
    NULLIF(p_name_zh, ''),
    NULLIF(p_nickname, ''),
    p_sort_order
  )
  RETURNING id, sort_order INTO v_item_id, v_sort_order;

  INSERT INTO public.item_prices (item_id, unit_price, effective_from)
  VALUES (v_item_id, p_unit_price, p_effective_from);

  RETURN json_build_object('id', v_item_id, 'sort_order', v_sort_order);
END;
$function$;

-- ── delete_shipout ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_shipout(p_shipout_id uuid, p_deleted_by uuid, p_restore_inventory boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_log RECORD;
BEGIN
  -- 이미 삭제된 건 재삭제 방지
  IF EXISTS (SELECT 1 FROM shipouts WHERE id = p_shipout_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'SHIPOUT_ALREADY_DELETED'
      USING DETAIL = format('shipout_id:%s 이미 삭제됨', p_shipout_id);
  END IF;

  IF p_restore_inventory THEN
    FOR v_log IN
      SELECT id, inventory_id, quantity
        FROM inventory_logs
       WHERE shipout_id = p_shipout_id
       FOR UPDATE
    LOOP
      UPDATE inventory
         SET quantity   = quantity + v_log.quantity,
             updated_at = now()
       WHERE id = v_log.inventory_id;
    END LOOP;
  END IF;

  -- shipouts soft delete (logs는 FK CASCADE 없이 유지 — 기록은 남김)
  UPDATE shipouts
     SET deleted_at = now()
   WHERE id = p_shipout_id;

  RETURN jsonb_build_object('shipout_id', p_shipout_id, 'ok', true);
END;
$function$;

-- ── execute_shipout ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.execute_shipout(p_factory_id uuid, p_client_id uuid, p_items jsonb, p_created_by uuid, p_memo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_shipout_id  uuid;
  v_item        jsonb;
  v_item_id     uuid;
  v_quantity    integer;
  v_inv_id      uuid;
  v_old_qty     integer;
  v_new_qty     integer;
  v_results     jsonb := '[]'::jsonb;
  v_seen_items  uuid[] := '{}';
BEGIN
  -- shipouts 행 먼저 생성
  INSERT INTO shipouts (factory_id, client_id, created_by, memo)
  VALUES (p_factory_id, p_client_id, p_created_by, p_memo)
  RETURNING id INTO v_shipout_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id  := (v_item->>'item_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    -- 동일 출고건 내 아이템 중복 방어
    IF v_item_id = ANY(v_seen_items) THEN
      RAISE EXCEPTION 'DUPLICATE_ITEM'
        USING DETAIL = format('item_id:%s 동일 출고에 중복', v_item_id),
              HINT   = format('item_id:%s', v_item_id);
    END IF;
    v_seen_items := array_append(v_seen_items, v_item_id);

    SELECT id, quantity
      INTO v_inv_id, v_old_qty
      FROM inventory
     WHERE factory_id = p_factory_id
       AND client_id  = p_client_id
       AND item_id    = v_item_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK'
        USING DETAIL = format('item_id:%s 재고 없음', v_item_id),
              HINT   = 'current_qty:0';
    END IF;

    v_new_qty := v_old_qty - v_quantity;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK'
        USING DETAIL = format('item_id:%s 재고 부족. 현재:%s', v_item_id, v_old_qty),
              HINT   = format('current_qty:%s', v_old_qty);
    END IF;

    UPDATE inventory
       SET quantity = v_new_qty, updated_at = now()
     WHERE id = v_inv_id;

    INSERT INTO inventory_logs (
      factory_id, client_id, item_id, inventory_id,
      log_type, quantity, after_quantity,
      shipout_id, created_by
    ) VALUES (
      p_factory_id, p_client_id, v_item_id, v_inv_id,
      'out', v_quantity, v_new_qty,
      v_shipout_id, p_created_by
    );

    v_results := v_results || jsonb_build_object(
      'item_id', v_item_id,
      'old_qty', v_old_qty,
      'new_qty', v_new_qty
    );
  END LOOP;

  RETURN jsonb_build_object(
    'shipout_id', v_shipout_id,
    'items', v_results
  );
END;
$function$;

-- ── process_inventory_delta ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_inventory_delta(p_factory_id uuid, p_client_id uuid, p_item_id uuid, p_delta integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_id          uuid;
  v_old_qty     integer;
  v_new_qty     integer;
BEGIN
  -- 행 잠금: 동시 요청이 같은 재고 행을 동시에 수정하지 못하도록
  SELECT id, quantity
    INTO v_id, v_old_qty
    FROM inventory
   WHERE factory_id = p_factory_id
     AND client_id  = p_client_id
     AND item_id    = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- 레코드 없음 → 신규 삽입 (출고인데 재고 없으면 에러)
    IF p_delta < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK'
        USING DETAIL = '재고가 없습니다.',
              HINT   = 'current_qty:0';
    END IF;

    INSERT INTO inventory (factory_id, client_id, item_id, quantity)
    VALUES (p_factory_id, p_client_id, p_item_id, p_delta)
    RETURNING id, quantity INTO v_id, v_new_qty;

    RETURN jsonb_build_object(
      'id',          v_id,
      'old_qty',     0,
      'new_qty',     v_new_qty
    );
  END IF;

  v_new_qty := v_old_qty + p_delta;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK'
      USING DETAIL = format('재고가 부족합니다. 현재 재고: %s', v_old_qty),
            HINT   = format('current_qty:%s', v_old_qty);
  END IF;

  UPDATE inventory
     SET quantity   = v_new_qty,
         updated_at = now()
   WHERE id = v_id;

  RETURN jsonb_build_object(
    'id',      v_id,
    'old_qty', v_old_qty,
    'new_qty', v_new_qty
  );
END;
$function$;

-- ── process_inventory_out ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_inventory_out(p_inventory_id uuid, p_quantity integer, p_created_by uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_qty   int;
  v_factory_id    uuid;
  v_client_id     uuid;
  v_item_id       uuid;
BEGIN
  -- 1. 해당 행을 잠금 (다른 트랜잭션은 여기서 대기)
  SELECT quantity, factory_id, client_id, item_id
  INTO v_current_qty, v_factory_id, v_client_id, v_item_id
  FROM public.inventory
  WHERE id = p_inventory_id
  FOR UPDATE;

  -- 2. 재고 부족 체크
  IF v_current_qty < p_quantity THEN
    RAISE EXCEPTION '재고 부족: 현재 % 개, 요청 % 개', v_current_qty, p_quantity;
  END IF;

  -- 3. 재고 차감
  UPDATE public.inventory
  SET quantity   = quantity - p_quantity,
      updated_at = now()
  WHERE id = p_inventory_id;

  -- 4. 로그 기록
  INSERT INTO public.inventory_logs (
    inventory_id, factory_id, client_id, item_id,
    log_type, quantity, created_by, note
  ) VALUES (
    p_inventory_id, v_factory_id, v_client_id, v_item_id,
    'out', p_quantity, p_created_by, p_note
  );

  RETURN json_build_object('success', true, 'remaining', v_current_qty - p_quantity);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- ── reorder_categories ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reorder_categories(p_ids uuid[], p_orders integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE c.id = v.id;
END;
$function$;

-- ── reorder_items ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reorder_items(p_ids uuid[], p_orders integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.items AS i
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE i.id = v.id;
END;
$function$;

-- ── reset_item_price ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_item_price(p_item_id uuid, p_unit_price integer, p_effective_from date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_deleted_count integer;
BEGIN
  -- 기존 단가 이력 전체 삭제
  DELETE FROM public.item_prices
  WHERE item_id = p_item_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 새 단일 레코드 insert
  INSERT INTO public.item_prices (item_id, unit_price, effective_from)
  VALUES (p_item_id, p_unit_price, p_effective_from);

  RETURN jsonb_build_object('deleted_count', v_deleted_count);
END;
$function$;

-- ── update_shipout ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_shipout(p_shipout_id uuid, p_items jsonb, p_updated_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_item        jsonb;
  v_item_id     uuid;
  v_new_qty     integer;
  v_log_id      uuid;
  v_old_log_qty integer;
  v_inv_id      uuid;
  v_inv_qty     integer;
  v_delta       integer;
  v_after_qty   integer;
  v_dup_count   integer;
BEGIN
  -- 삭제된 출고건 수정 불가
  IF EXISTS (SELECT 1 FROM shipouts WHERE id = p_shipout_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'SHIPOUT_DELETED'
      USING DETAIL = format('shipout_id:%s 는 이미 삭제된 출고건', p_shipout_id);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id := (v_item->>'item_id')::uuid;
    v_new_qty := (v_item->>'new_quantity')::integer;

    -- 중복 행 선제 확인 (데이터 이상 감지)
    SELECT COUNT(*) INTO v_dup_count
      FROM inventory_logs
     WHERE shipout_id = p_shipout_id
       AND item_id    = v_item_id;

    IF v_dup_count > 1 THEN
      RAISE EXCEPTION 'DATA_INTEGRITY_ERROR'
        USING DETAIL = format('shipout_id:%s item_id:%s 중복 로그 존재', p_shipout_id, v_item_id);
    END IF;

    SELECT id, quantity, inventory_id
      INTO v_log_id, v_old_log_qty, v_inv_id
      FROM inventory_logs
     WHERE shipout_id = p_shipout_id
       AND item_id    = v_item_id
     FOR UPDATE;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_delta := v_old_log_qty - v_new_qty;  -- 양수면 재고 복구, 음수면 추가 차감

    SELECT quantity INTO v_inv_qty
      FROM inventory
     WHERE id = v_inv_id
     FOR UPDATE;

    v_after_qty := v_inv_qty + v_delta;
    IF v_after_qty < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK'
        USING DETAIL = format('item_id:%s 재고 부족', v_item_id),
              HINT   = format('current_qty:%s', v_inv_qty);
    END IF;

    UPDATE inventory
       SET quantity = v_after_qty, updated_at = now()
     WHERE id = v_inv_id;

    IF v_new_qty = 0 THEN
      -- 수량 0 → 해당 로그 행 삭제 (soft delete 아닌 진짜 삭제, shipout은 남음)
      DELETE FROM inventory_logs WHERE id = v_log_id;
    ELSE
      UPDATE inventory_logs
         SET quantity = v_new_qty, after_quantity = v_after_qty
       WHERE id = v_log_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('shipout_id', p_shipout_id, 'ok', true);
END;
$function$;
