-- ============================================================
-- Performance improvements migration
-- ============================================================

-- 1. reorder_categories: unnest 기반 일괄 정렬 순서 업데이트
-- ============================================================
CREATE OR REPLACE FUNCTION public.reorder_categories(p_ids uuid[], p_orders int[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM unnest(p_ids, p_orders) AS v(id uuid, ord int)
  WHERE c.id = v.id;
END;
$$;

-- 2. reorder_items: unnest 기반 일괄 정렬 순서 업데이트
-- ============================================================
CREATE OR REPLACE FUNCTION public.reorder_items(p_ids uuid[], p_orders int[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.items AS i
  SET sort_order = v.ord
  FROM unnest(p_ids, p_orders) AS v(id uuid, ord int)
  WHERE i.id = v.id;
END;
$$;

-- 3. shipout_memos 읽지 않은 메모 partial index
-- ============================================================
CREATE INDEX IF NOT EXISTS shipout_memos_unread_idx
  ON public.shipout_memos (id)
  WHERE is_read = false;

-- 4. clients.name GIN trigram 인덱스 (pg_trgm 익스텐션 기존 존재 가정)
-- ============================================================
CREATE INDEX IF NOT EXISTS clients_name_trgm_idx
  ON public.clients
  USING gin (name gin_trgm_ops);

-- 5. get_layout_data: 레이아웃 초기 데이터 일괄 반환 RPC
--    factories 목록(json_agg)과 읽지 않은 메모 수를 한 번에 반환
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_layout_data(p_factory_id uuid DEFAULT NULL)
RETURNS TABLE(factories jsonb, memo_count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (
      SELECT COALESCE(json_agg(f ORDER BY f.created_at), '[]'::json)::jsonb
      FROM public.factories AS f
      WHERE f.deleted_at IS NULL
    ) AS factories,
    (
      SELECT COUNT(*)
      FROM public.shipout_memos AS m
      WHERE m.is_read = false
        AND (p_factory_id IS NULL OR m.factory_id = p_factory_id)
    ) AS memo_count;
END;
$$;
