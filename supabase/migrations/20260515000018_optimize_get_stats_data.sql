-- ============================================================
-- get_stats_data 성능 최적화 (plpgsql 버전)
-- 기존 문제:
--   1. shipout 루프 안에 items 서브쿼리 → N+1 (1,719 loops)
--   2. items 루프 안에 item_prices 서브쿼리 → N×M (6,624 loops)
--   3. processed_at::date BETWEEN → 함수 캐스트로 인덱스 미사용
--   4. LANGUAGE sql + STABLE → 파라미터 바인딩 시 플래너 오동작 (23초)
--
-- 최적화 전략:
--   1. processed_at 범위를 timestamptz 비교로 변경 (인덱스 활용)
--   2. 단일 flat CTE로 전체 데이터 집계 (루프 제거, ~100ms)
--   3. DISTINCT ON으로 item_prices pre-join (서브쿼리 제거)
--   4. plpgsql + DECLARE 변수로 플래너 안정화
-- ============================================================
CREATE OR REPLACE FUNCTION get_stats_data(
  p_from       date,
  p_to         date,
  p_client_id  uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $func$
DECLARE
  v_ts_from timestamptz := p_from::timestamptz;
  v_ts_to   timestamptz := (p_to + INTERVAL '1 day')::timestamptz;
  v_result  json;
BEGIN
  WITH
  -- ① 기간 내 출고 로그 (timestamptz 직접 비교 → 인덱스 활용)
  logs AS (
    SELECT
      il.shipout_id,
      il.item_id,
      il.quantity,
      il.processed_at::date AS log_date
    FROM inventory_logs il
    WHERE il.log_type    = 'out'
      AND il.shipout_id  IS NOT NULL
      AND il.processed_at >= v_ts_from
      AND il.processed_at <  v_ts_to
  ),

  -- ② shipout × item 단위 집계 (한 번의 HashAgg — N+1 제거)
  item_agg AS (
    SELECT
      l.shipout_id,
      l.item_id,
      SUM(l.quantity)  AS qty,
      MAX(l.log_date)  AS max_date
    FROM logs l
    GROUP BY l.shipout_id, l.item_id
  ),

  -- ③ 유효 단가 pre-join (DISTINCT ON — 서브쿼리 루프 제거)
  item_prices_latest AS (
    SELECT DISTINCT ON (ia.shipout_id, ia.item_id)
      ia.shipout_id,
      ia.item_id,
      COALESCE(ip.unit_price, 0) AS unit_price
    FROM item_agg ia
    LEFT JOIN item_prices ip
      ON  ip.item_id        = ia.item_id
      AND ip.effective_from <= ia.max_date
    ORDER BY ia.shipout_id, ia.item_id, ip.effective_from DESC
  ),

  -- ④ item 메타 join
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
    JOIN items      i   ON i.id   = ia.item_id
    JOIN categories cat ON cat.id = i.category_id
    JOIN item_prices_latest ipl
      ON  ipl.shipout_id = ia.shipout_id
      AND ipl.item_id    = ia.item_id
  ),

  -- ⑤ shipout별 items JSON 배열
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

  -- ⑥ 기간 내 logs에 존재하는 shipout_id (EXISTS 대체)
  active_shipout_ids AS (
    SELECT DISTINCT shipout_id FROM logs
  ),

  -- ⑦ 최종 shipouts JSON 배열
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
    FROM shipouts s
    JOIN clients            c   ON c.id  = s.client_id
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

-- ============================================================
-- 성능 인덱스: shipout 출고 로그 날짜 범위 조회 최적화
-- (데이터 증가 시 Seq Scan → Index Scan 자동 전환)
-- ============================================================
CREATE INDEX IF NOT EXISTS inventory_logs_shipout_processed_at_idx
  ON inventory_logs (processed_at)
  WHERE shipout_id IS NOT NULL AND log_type = 'out';
