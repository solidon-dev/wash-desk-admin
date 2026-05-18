-- ① 단조증가 트리거 제거 (이전 날짜 설정을 허용하기 위해)
DROP TRIGGER IF EXISTS trg_item_price_date_monotonic ON public.item_prices;
DROP FUNCTION IF EXISTS public.check_item_price_date_monotonic();

-- ② reset_item_price RPC
--    특정 품목의 단가 이력을 전부 삭제하고 새 단일 레코드로 교체한다.
--    반환: 삭제된 행 수 (deleted_count)
CREATE OR REPLACE FUNCTION public.reset_item_price(
  p_item_id      uuid,
  p_unit_price   integer,
  p_effective_from date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
