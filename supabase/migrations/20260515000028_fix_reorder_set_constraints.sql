-- RPC 안에서 SET CONSTRAINTS DEFERRED 명시
-- PostgREST autocommit 모드에서도 UNIQUE 충돌 없이 일괄 UPDATE 가능하도록

CREATE OR REPLACE FUNCTION public.reorder_items(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET CONSTRAINTS items_category_id_sort_order_unique DEFERRED;
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
  SET CONSTRAINTS categories_client_id_sort_order_unique DEFERRED;
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE c.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) TO authenticated;
