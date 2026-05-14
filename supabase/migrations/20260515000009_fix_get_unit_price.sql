CREATE OR REPLACE FUNCTION public.get_unit_price(p_item_id uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
STABLE
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
