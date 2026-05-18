-- 구버전 create_item_with_price (p_sort_order 없이 sort_order=0 하드코딩) 제거
-- 이 함수가 남아 있으면 Supabase RPC 호출 시 오버로딩 매칭으로 구버전이 선택되어
-- 품목 추가 시 sort_order가 항상 0으로 세팅되는 버그가 발생함
DROP FUNCTION IF EXISTS public.create_item_with_price(uuid, uuid, text, integer);
