-- UNIQUE 제약 제거 — PostgREST 환경에서 SET CONSTRAINTS가 트랜잭션 컨텍스트 문제로
-- 동작하지 않아 reorder 시 duplicate key 에러 발생
-- sort_order 무결성은 RPC + 앱 레벨에서 보장

ALTER TABLE public.items
  DROP CONSTRAINT IF EXISTS items_category_id_sort_order_unique;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_client_id_sort_order_unique;

-- 인덱스는 성능용으로만 유지
CREATE INDEX IF NOT EXISTS items_category_id_sort_order_idx
  ON public.items (category_id, sort_order);

CREATE INDEX IF NOT EXISTS categories_client_id_sort_order_idx
  ON public.categories (client_id, sort_order);

-- reorder RPC 원복 (SET CONSTRAINTS 불필요)
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
