-- ============================================================
-- 1. items sort_order 중복 정리 (ROW_NUMBER로 재배정)
-- ============================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY sort_order, created_at) - 1 AS new_order
  FROM public.items
)
UPDATE public.items i
SET sort_order = r.new_order
FROM ranked r
WHERE i.id = r.id;

-- ============================================================
-- 2. categories sort_order 중복 정리
-- ============================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY sort_order, created_at) - 1 AS new_order
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = r.new_order
FROM ranked r
WHERE c.id = r.id;

-- ============================================================
-- 3. UNIQUE 제약 추가
-- ============================================================
-- 기존 인덱스 제거 후 UNIQUE로 교체
DROP INDEX IF EXISTS public.items_category_id_sort_order_idx;

ALTER TABLE public.items
  ADD CONSTRAINT items_category_id_sort_order_unique UNIQUE (category_id, sort_order);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_client_id_sort_order_unique UNIQUE (client_id, sort_order);

-- ============================================================
-- 4. reorder_items — SWAP 방식으로 교체
--    UNIQUE 제약이 있으면 일괄 UPDATE 시 중간 충돌 발생 →
--    임시 음수 offset으로 밀어낸 뒤 최종값 세팅
-- ============================================================
CREATE OR REPLACE FUNCTION public.reorder_items(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_val integer := -100000;
BEGIN
  -- 1단계: 임시 음수 값으로 밀어 충돌 회피
  UPDATE public.items AS i
  SET sort_order = v.ord + offset_val
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE i.id = v.id;

  -- 2단계: 최종값 세팅
  UPDATE public.items AS i
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE i.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) TO authenticated;

-- ============================================================
-- 5. reorder_categories — SWAP 방식으로 교체
-- ============================================================
CREATE OR REPLACE FUNCTION public.reorder_categories(
  p_ids    uuid[],
  p_orders integer[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_val integer := -100000;
BEGIN
  -- 1단계: 임시 음수 값으로 밀어 충돌 회피
  UPDATE public.categories AS c
  SET sort_order = v.ord + offset_val
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE c.id = v.id;

  -- 2단계: 최종값 세팅
  UPDATE public.categories AS c
  SET sort_order = v.ord
  FROM (SELECT unnest(p_ids) AS id, unnest(p_orders) AS ord) AS v
  WHERE c.id = v.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) TO authenticated;
