-- ============================================================
-- PUBLIC EXECUTE 권한 제거 및 필요 롤에만 명시적 재부여
-- (anon_security_definer / authenticated_security_definer 경고 해결)
-- =X/postgres (PUBLIC) 가 anon 포함이므로 PUBLIC 전체 revoke 필요
-- ============================================================

-- ── PUBLIC revoke ─────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.cancel_inventory_log(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_item_with_price(uuid, uuid, text, text, text, text, integer, integer, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_shipout(uuid, uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_shipout(uuid, uuid, jsonb, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_billing_page_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_stats_data(date, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_stats_summary(date, date, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_factory_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_inventory_delta(uuid, uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_inventory_out(uuid, integer, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reorder_categories(uuid[], integer[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reorder_items(uuid[], integer[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_item_price(uuid, integer, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_profile_to_app_metadata() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_shipout(uuid, jsonb, uuid) FROM PUBLIC;

-- ── authenticated 재부여 (앱에서 rpc 호출하는 함수들) ──────────
-- handle_new_user, sync_profile_to_app_metadata 는 트리거 전용 → 미부여
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
