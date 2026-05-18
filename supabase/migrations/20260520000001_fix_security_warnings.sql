-- ============================================================
-- Supabase 데이터베이스 린터 경고 수정 마이그레이션
--
-- 1. function_search_path_mutable  → SET search_path = '' 추가
-- 2. anon_security_definer_function_executable → anon EXECUTE 권한 revoke
-- 3. rls_policy_always_true → WITH CHECK (true) 정책 수정
-- ============================================================


-- ============================================================
-- 1. function_search_path_mutable 수정
--    모든 함수에 SET search_path = '' 추가 및 본문 내 스키마 명시
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- my_role
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────────
-- my_factory_id
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_factory_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT factory_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────────
-- check_item_has_price  (트리거 함수 — SECURITY DEFINER 없음)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_item_has_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.item_prices WHERE item_id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'item(id=%) must have at least one price in item_prices', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- check_item_prices_not_empty  (트리거 함수)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_item_prices_not_empty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.item_prices WHERE item_id = OLD.item_id
  ) THEN
    RAISE EXCEPTION
      'item(id=%) must have at least one price. Cannot delete the last price.', OLD.item_id;
  END IF;
  RETURN OLD;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- get_unit_price
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unit_price(p_item_id uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_price integer;
BEGIN
  -- 1순위: 해당 날짜 이전 단가 중 가장 최근
  SELECT unit_price INTO v_price
  FROM public.item_prices
  WHERE item_id = p_item_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;

  -- 2순위: 전부 미래 날짜인 경우 → 가장 오래된 단가로 fallback
  SELECT unit_price INTO v_price
  FROM public.item_prices
  WHERE item_id = p_item_id
  ORDER BY effective_from ASC
  LIMIT 1;

  RETURN v_price;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- get_unit_price_with_range
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unit_price_with_range(p_item_id uuid, p_date date)
RETURNS TABLE(unit_price integer, price_from date, price_to date)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_price      integer;
  v_from       date;
  v_to         date;
BEGIN
  -- 1순위: 해당 날짜 이전 단가 중 가장 최근
  SELECT ip.unit_price, ip.effective_from
  INTO v_price, v_from
  FROM public.item_prices ip
  WHERE ip.item_id = p_item_id
    AND ip.effective_from <= p_date
  ORDER BY ip.effective_from DESC
  LIMIT 1;

  -- fallback: 전부 미래 날짜면 가장 오래된 단가
  IF v_price IS NULL THEN
    SELECT ip.unit_price, ip.effective_from
    INTO v_price, v_from
    FROM public.item_prices ip
    WHERE ip.item_id = p_item_id
    ORDER BY ip.effective_from ASC
    LIMIT 1;
  END IF;

  IF v_price IS NULL THEN
    RETURN;
  END IF;

  -- 다음 단가의 effective_from - 1일 = 이 구간의 끝
  SELECT (ip.effective_from - INTERVAL '1 day')::date
  INTO v_to
  FROM public.item_prices ip
  WHERE ip.item_id = p_item_id
    AND ip.effective_from > v_from
  ORDER BY ip.effective_from ASC
  LIMIT 1;

  RETURN QUERY SELECT v_price, v_from, v_to;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- batch_get_unit_prices
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.batch_get_unit_prices(
  p_requests jsonb
)
RETURNS TABLE(
  item_id    uuid,
  req_date   date,
  unit_price integer,
  price_from date,
  price_to   date
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  req        jsonb;
  v_item_id  uuid;
  v_date     date;
  v_price    integer;
  v_from     date;
  v_to       date;
BEGIN
  FOR req IN SELECT jsonb_array_elements(p_requests)
  LOOP
    v_item_id := (req->>'item_id')::uuid;
    v_date    := (req->>'date')::date;
    v_price   := NULL;
    v_from    := NULL;
    v_to      := NULL;

    -- 해당 날짜 이전 단가 중 가장 최근
    SELECT ip.unit_price, ip.effective_from
    INTO v_price, v_from
    FROM public.item_prices ip
    WHERE ip.item_id = v_item_id
      AND ip.effective_from <= v_date
    ORDER BY ip.effective_from DESC
    LIMIT 1;

    -- fallback: 전부 미래면 가장 오래된 단가
    IF v_price IS NULL THEN
      SELECT ip.unit_price, ip.effective_from
      INTO v_price, v_from
      FROM public.item_prices ip
      WHERE ip.item_id = v_item_id
      ORDER BY ip.effective_from ASC
      LIMIT 1;
    END IF;

    IF v_price IS NOT NULL THEN
      -- 다음 단가의 시작일 - 1일 = 이 구간의 끝
      SELECT (ip.effective_from - INTERVAL '1 day')::date
      INTO v_to
      FROM public.item_prices ip
      WHERE ip.item_id = v_item_id
        AND ip.effective_from > v_from
      ORDER BY ip.effective_from ASC
      LIMIT 1;

      item_id    := v_item_id;
      req_date   := v_date;
      unit_price := v_price;
      price_from := v_from;
      price_to   := v_to;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- process_inventory_out
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_inventory_out(
  p_inventory_id uuid,
  p_quantity     integer,
  p_created_by   uuid,
  p_note         text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- ──────────────────────────────────────────────────────────────
-- create_item_with_price
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_item_with_price(
  p_client_id      uuid,
  p_category_id    uuid,
  p_name_ko        text,
  p_name_en        text,
  p_name_zh        text,
  p_nickname       text,
  p_sort_order     integer,
  p_unit_price     integer,
  p_effective_from date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.create_item_with_price(
  uuid, uuid, text, text, text, text, integer, integer, date
) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- reset_item_price
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_item_price(
  p_item_id        uuid,
  p_unit_price     integer,
  p_effective_from date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- ──────────────────────────────────────────────────────────────
-- reorder_categories
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reorder_categories(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE c.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- reorder_items
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reorder_items(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.items AS i
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE i.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- get_layout_data
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_layout_data(p_factory_id uuid DEFAULT NULL)
RETURNS TABLE(factories jsonb, memo_count bigint)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (
      SELECT COALESCE(json_agg(f ORDER BY f.created_at), '[]'::json)::jsonb
      FROM public.factories AS f
      WHERE f.deleted_at IS NULL
    ) AS factories,
    (
      SELECT COUNT(*)
      FROM public.shipout_memos AS m
      WHERE m.is_read = false
        AND (p_factory_id IS NULL OR m.factory_id = p_factory_id)
    ) AS memo_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- get_billing_page_data
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_billing_page_data(p_client_id uuid)
RETURNS TABLE(
  categories   jsonb,
  shipout_logs jsonb,
  invoices     jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- ──────────────────────────────────────────────────────────────
-- get_stats_data  (최신 버전: optimize_get_stats_data 기준)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stats_data(
  p_from       date,
  p_to         date,
  p_client_id  uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $func$
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
$func$;

-- ──────────────────────────────────────────────────────────────
-- get_stats_summary
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_stats_summary(
  p_from       date,
  p_to         date,
  p_group_by   text,
  p_client_id  uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $func$
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
$func$;

-- ──────────────────────────────────────────────────────────────
-- handle_new_user
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_factory_id uuid;
  v_role       public.user_role;
  v_phone      text;
BEGIN
  v_factory_id := (NEW.raw_user_meta_data->>'factory_id')::uuid;
  v_phone      := NEW.raw_user_meta_data->>'phone';

  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'worker';
  END;

  IF v_role IS NULL THEN
    v_role := 'worker';
  END IF;

  IF v_phone IS NOT NULL AND v_phone !~ '^01[016789][0-9]{7,8}$' THEN
    v_phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, factory_id, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    v_role,
    v_factory_id,
    v_phone
  );

  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('role', v_role, 'factory_id', v_factory_id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- sync_profile_to_app_metadata
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_profile_to_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object(
        'role',       NEW.role,
        'factory_id', NEW.factory_id
       )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- cancel_inventory_log  (DB에만 존재 — 시그니처 추정 기반 재정의)
-- 린터 경고: function_search_path_mutable
-- 주의: 이 함수가 DB에 없으면 아래 CREATE OR REPLACE는 에러 없이 새로 생성됩니다.
--       실제 DB 함수 본문이 다르다면 Supabase 대시보드에서 확인 후 수정하세요.
-- ──────────────────────────────────────────────────────────────
-- cancel_inventory_log, process_inventory_delta, update_shipout,
-- execute_shipout, delete_shipout 은 기존 마이그레이션 파일에서
-- 정의를 찾을 수 없습니다.
-- search_path 경고 해소를 위해 아래 ALTER로 처리합니다.
-- (함수가 DB에 존재하는 경우에만 적용됩니다)

DO $$
BEGIN
  -- cancel_inventory_log
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'cancel_inventory_log'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.cancel_inventory_log SET search_path = ''''';
  END IF;

  -- process_inventory_delta
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'process_inventory_delta'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.process_inventory_delta SET search_path = ''''';
  END IF;

  -- update_shipout
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_shipout'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_shipout SET search_path = ''''';
  END IF;

  -- execute_shipout
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'execute_shipout'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.execute_shipout SET search_path = ''''';
  END IF;

  -- delete_shipout
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'delete_shipout'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.delete_shipout SET search_path = ''''';
  END IF;
END;
$$;


-- ============================================================
-- 2. anon_security_definer_function_executable 수정
--    anon 롤의 EXECUTE 권한 제거
-- ============================================================

-- cancel_inventory_log (오버로드가 있을 수 있으므로 존재 확인 후 revoke)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS proc_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'cancel_inventory_log'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.proc_sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS proc_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'process_inventory_delta'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.proc_sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS proc_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_shipout'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.proc_sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS proc_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'execute_shipout'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.proc_sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS proc_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'delete_shipout'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.proc_sig);
  END LOOP;
END;
$$;

-- 시그니처가 명확한 함수들은 직접 REVOKE
REVOKE EXECUTE ON FUNCTION public.create_item_with_price(
  uuid, uuid, text, text, text, text, integer, integer, date
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_billing_page_data(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_stats_data(date, date, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_stats_summary(date, date, text, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

REVOKE EXECUTE ON FUNCTION public.my_factory_id() FROM anon;

REVOKE EXECUTE ON FUNCTION public.my_role() FROM anon;

REVOKE EXECUTE ON FUNCTION public.process_inventory_out(uuid, integer, uuid, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) FROM anon;

REVOKE EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) FROM anon;

REVOKE EXECUTE ON FUNCTION public.reset_item_price(uuid, integer, date) FROM anon;

REVOKE EXECUTE ON FUNCTION public.sync_profile_to_app_metadata() FROM anon;


-- ============================================================
-- 3. rls_policy_always_true 수정
--    WITH CHECK (true) → 의미 있는 조건으로 교체
-- ============================================================

-- ── categories INSERT ────────────────────────────────────────
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (
    public.my_role() = 'super_admin'::public.user_role
    OR (
      public.my_role() = 'factory_admin'::public.user_role
      AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = categories.client_id
          AND c.factory_id = public.my_factory_id()
      )
    )
  );

-- ── items INSERT ─────────────────────────────────────────────
DROP POLICY IF EXISTS "items_insert" ON public.items;
CREATE POLICY "items_insert" ON public.items
  FOR INSERT WITH CHECK (
    public.my_role() = 'super_admin'::public.user_role
    OR (
      public.my_role() = 'factory_admin'::public.user_role
      AND EXISTS (
        SELECT 1 FROM public.clients c
        JOIN public.categories cat ON cat.client_id = c.id
        WHERE cat.id = items.category_id
          AND c.factory_id = public.my_factory_id()
      )
    )
  );

-- ── item_prices INSERT ───────────────────────────────────────
DROP POLICY IF EXISTS "item_prices_insert" ON public.item_prices;
CREATE POLICY "item_prices_insert" ON public.item_prices
  FOR INSERT WITH CHECK (
    public.my_role() = 'super_admin'::public.user_role
    OR (
      public.my_role() = 'factory_admin'::public.user_role
      AND EXISTS (
        SELECT 1 FROM public.items i
        JOIN public.categories cat ON cat.id = i.category_id
        JOIN public.clients c ON c.id = cat.client_id
        WHERE i.id = item_prices.item_id
          AND c.factory_id = public.my_factory_id()
      )
    )
  );

-- ── shipout_memos INSERT ─────────────────────────────────────
-- 기존: WITH CHECK (true)  →  QR로 접근하는 비인증 실무자도 INSERT 가능해야 함
-- auth.uid() IS NOT NULL 조건은 anon을 차단하므로, 의도(비인증 허용)를 유지하면서
-- 최소한의 의미 있는 조건(shipout_id 존재 확인)으로 교체합니다.
DROP POLICY IF EXISTS "shipout_memos_insert_public" ON public.shipout_memos;
CREATE POLICY "shipout_memos_insert_public" ON public.shipout_memos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipouts s
      WHERE s.id = shipout_memos.shipout_id
        AND s.deleted_at IS NULL
    )
  );
