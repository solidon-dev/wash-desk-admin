-- UNIQUE 제약을 DEFERRABLE INITIALLY DEFERRED로 교체
-- 이유: reorder RPC 내에서 동일 트랜잭션으로 여러 row를 UPDATE할 때
-- 각 UPDATE 직후 UNIQUE 검사가 발생해 충돌 → 트랜잭션 커밋 시점에만 검사하도록 변경

-- items
ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_category_id_sort_order_unique;
ALTER TABLE public.items
  ADD CONSTRAINT items_category_id_sort_order_unique
  UNIQUE (category_id, sort_order)
  DEFERRABLE INITIALLY DEFERRED;

-- categories
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_client_id_sort_order_unique;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_client_id_sort_order_unique
  UNIQUE (client_id, sort_order)
  DEFERRABLE INITIALLY DEFERRED;

-- reorder_items — DEFERRABLE이므로 음수 offset 단계 불필요, 단순 일괄 UPDATE로 변경
CREATE OR REPLACE FUNCTION public.reorder_items(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.items AS i
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE i.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) TO authenticated;

-- reorder_categories
CREATE OR REPLACE FUNCTION public.reorder_categories(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE c.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) TO authenticated;
