-- get_unit_price_with_range:
-- 해당 날짜의 단가 + 구간 시작일(price_from) + 구간 종료일(price_to, 다음 단가 전날 or null)
CREATE OR REPLACE FUNCTION public.get_unit_price_with_range(p_item_id uuid, p_date date)
RETURNS TABLE(unit_price integer, price_from date, price_to date)
LANGUAGE plpgsql
STABLE
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
  -- v_to가 NULL이면 현재도 유효한 단가 (끝없음)

  RETURN QUERY SELECT v_price, v_from, v_to;
END;
$$;
