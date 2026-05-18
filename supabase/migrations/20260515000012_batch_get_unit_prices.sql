-- 배치 단가 조회: 여러 (item_id, date) 쌍을 한 번에 처리
-- 기존 get_unit_price_with_range를 N번 호출하던 것을 1번으로 대체
CREATE OR REPLACE FUNCTION public.batch_get_unit_prices(
  p_requests jsonb  -- [{"item_id": "uuid", "date": "YYYY-MM-DD"}, ...]
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
