-- ─────────────────────────────────────────────────────────────────────────
-- get_billing_page_data
--
-- 청구서 페이지 load에서 6번 순차 왕복하던 것을 1번 RPC 호출로 통합
--
-- 반환:
--   categories   jsonb  -- 해당 거래처 카테고리 배열
--   shipout_logs jsonb  -- 삭제되지 않은 shipout 소속 out 로그 + 단가 배열
--   invoices     jsonb  -- 발행 내역 (최근 50건, invoice_items 포함)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_billing_page_data(p_client_id uuid)
RETURNS TABLE(
  categories   jsonb,
  shipout_logs jsonb,
  invoices     jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_categories   jsonb;
  v_logs         jsonb;
  v_invoices     jsonb;
BEGIN

  -- ── 1. categories ───────────────────────────────────────────────────────
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

  -- ── 2. shipout_logs (inventory_logs out + 유효한 shipout + 단가) ────────
  --
  -- inventory_logs → items JOIN, shipouts deleted_at IS NULL 필터,
  -- 각 로그의 단가를 item_prices에서 서브쿼리로 한 번에 계산
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
          -- fallback: 미래 단가만 있는 경우 가장 오래된 것
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

  -- ── 3. invoices (최근 50건, invoice_items 포함) ─────────────────────────
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
