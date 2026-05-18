-- ============================================================
-- anon / authenticated SECURITY DEFINER 함수 EXECUTE 권한 전체 revoke
-- ============================================================

-- ── anon ─────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.cancel_inventory_log(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_item_with_price(uuid, uuid, text, text, text, text, integer, integer, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_shipout(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.execute_shipout(uuid, uuid, jsonb, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_billing_page_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_stats_data(date, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_stats_summary(date, date, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_factory_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_inventory_delta(uuid, uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_inventory_out(uuid, integer, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_item_price(uuid, integer, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_profile_to_app_metadata() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_shipout(uuid, jsonb, uuid) FROM anon;

-- ── authenticated ─────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.cancel_inventory_log(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_item_with_price(uuid, uuid, text, text, text, text, integer, integer, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_shipout(uuid, uuid, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_shipout(uuid, uuid, jsonb, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_billing_page_data(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_stats_data(date, date, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_stats_summary(date, date, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.my_factory_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.my_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_inventory_delta(uuid, uuid, uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_inventory_out(uuid, integer, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_item_price(uuid, integer, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_to_app_metadata() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_shipout(uuid, jsonb, uuid) FROM authenticated;

-- ── 정상적으로 호출되어야 하는 함수들에 authenticated GRANT 재부여 ──────
-- my_role, my_factory_id는 RLS 정책 내부에서 쓰이므로 authenticated는 필요
-- (RLS는 postgres 권한으로 실행되므로 사실 불필요하지만 앱에서 직접 호출할 수 있으므로 유지)
-- 앱에서 직접 rpc 호출하는 함수들만 authenticated 재부여
GRANT EXECUTE ON FUNCTION public.cancel_inventory_log(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item_with_price(uuid, uuid, text, text, text, text, integer, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_shipout(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_shipout(uuid, uuid, jsonb, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_page_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_data(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_summary(date, date, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_factory_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_inventory_delta(uuid, uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_inventory_out(uuid, integer, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_item_price(uuid, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shipout(uuid, jsonb, uuid) TO authenticated;
-- handle_new_user, sync_profile_to_app_metadata는 트리거 전용 → authenticated/anon 둘 다 미부여

-- ── pg_trgm extension을 extensions 스키마로 이전 ──────────────
-- (extension_in_public 경고 해결)
-- CASCADE로 의존 인덱스 제거 후 extensions 스키마에 재설치, 인덱스 재생성
DROP INDEX IF EXISTS public.clients_name_trgm_idx;
DROP INDEX IF EXISTS public.factories_name_trgm_idx;
DROP INDEX IF EXISTS public.profiles_full_name_trgm_idx;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS clients_name_trgm_idx ON public.clients USING gin (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS factories_name_trgm_idx ON public.factories USING gin (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_full_name_trgm_idx ON public.profiles USING gin (full_name extensions.gin_trgm_ops);
