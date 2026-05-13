-- item_prices 테이블에는 client_id 컬럼이 없으므로
-- check_item_price_date_monotonic 트리거 함수에서 client_id 참조 제거
CREATE OR REPLACE FUNCTION public.check_item_price_date_monotonic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  max_date date;
BEGIN
  SELECT MAX(effective_from)
    INTO max_date
    FROM public.item_prices
   WHERE item_id = NEW.item_id
     AND id      <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF max_date IS NOT NULL AND NEW.effective_from <= max_date THEN
    RAISE EXCEPTION
      'effective_from(%) must be after the current latest date(%) for this item.',
      NEW.effective_from, max_date;
  END IF;

  RETURN NEW;
END;
$$;
