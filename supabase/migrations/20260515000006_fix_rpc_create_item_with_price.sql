-- ============================================================
-- create_item_with_price RPC 재정의
-- DB 실제 스키마:
--   items: client_id, category_id, name_ko, sort_order (factory_id 없음)
--   item_prices: item_id, unit_price, effective_from (client_id 없음)
-- ============================================================

-- 기존 오버로드 전부 제거
DROP FUNCTION IF EXISTS public.create_item_with_price(uuid,uuid,text,text,text,text,integer,uuid,integer,date);
DROP FUNCTION IF EXISTS public.create_item_with_price(uuid,uuid,text,integer,date);
DROP FUNCTION IF EXISTS public.create_item_with_price(uuid,uuid,text,text);

-- 재생성
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
