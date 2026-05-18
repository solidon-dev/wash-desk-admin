-- reorder_categories / reorder_items unnest 수정
-- 다중 배열 병렬 unnest는 서브쿼리 방식으로 처리

CREATE OR REPLACE FUNCTION public.reorder_categories(p_ids uuid[], p_orders int[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM (
    SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord
  ) AS v
  WHERE c.id = v.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_items(p_ids uuid[], p_orders int[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.items AS i
  SET sort_order = v.ord
  FROM (
    SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord
  ) AS v
  WHERE i.id = v.id;
END;
$$;
