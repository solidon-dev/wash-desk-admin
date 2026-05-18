-- ============================================================
-- get_stats_summary RPC
-- 기간별(일/월/년) 출고 통계 집계 함수
--
-- 파라미터:
--   p_from      date        -- 조회 시작일
--   p_to        date        -- 조회 종료일
--   p_group_by  text        -- 'day' | 'month' | 'year'
--   p_client_id uuid        -- NULL이면 전체, 지정하면 해당 거래처만
--
-- 반환: json
--   { "rows": [{ "period": "2025-01", "qty": 1234, "amount": 5678000, "count": 45 }, ...] }
--
-- qty    : 해당 period 내 총 출고 수량
-- amount : quantity * unit_price (processed_at 기준 최신 단가, 없으면 0)
-- count  : 해당 period 내 distinct shipout_id 수
-- ============================================================
CREATE OR REPLACE FUNCTION get_stats_summary(
  p_from       date,
  p_to         date,
  p_group_by   text,
  p_client_id  uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
DECLARE
  v_ts_from  timestamptz := p_from::timestamptz;
  v_ts_to    timestamptz := (p_to + INTERVAL '1 day')::timestamptz;
  v_result   json;
BEGIN
  WITH
  -- ① 기간 내 출고 로그 (timestamptz 직접 비교 → 인덱스 활용)
  logs AS (
    SELECT
      il.shipout_id,
      il.item_id,
      il.quantity,
      il.processed_at
    FROM inventory_logs il
    JOIN shipouts s ON s.id = il.shipout_id
    WHERE il.log_type        = 'out'
      AND il.shipout_id      IS NOT NULL
      AND il.processed_at    >= v_ts_from
      AND il.processed_at    <  v_ts_to
      AND s.deleted_at       IS NULL
      AND (p_client_id IS NULL OR s.client_id = p_client_id)
  ),

  -- ② period 키 계산
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
      -- period 정렬용 date
      CASE p_group_by
        WHEN 'day'   THEN l.processed_at::date
        WHEN 'month' THEN date_trunc('month', l.processed_at)::date
        WHEN 'year'  THEN date_trunc('year',  l.processed_at)::date
        ELSE              l.processed_at::date
      END AS period_date
    FROM logs l
  ),

  -- ③ (period, shipout_id, item_id) 단위 집계 + 단가 기준일(최대 processed_at)
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

  -- ④ 유효 단가 pre-join (processed_at 기준 가장 최신 단가)
  item_prices_latest AS (
    SELECT DISTINCT ON (ia.period, ia.shipout_id, ia.item_id)
      ia.period,
      ia.period_date,
      ia.shipout_id,
      ia.item_id,
      ia.qty,
      COALESCE(ip.unit_price, 0) AS unit_price
    FROM item_agg ia
    LEFT JOIN item_prices ip
      ON  ip.item_id        = ia.item_id
      AND ip.effective_from <= ia.max_processed_at::date
    ORDER BY ia.period, ia.shipout_id, ia.item_id, ip.effective_from DESC
  ),

  -- ⑤ period 단위 최종 집계
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
