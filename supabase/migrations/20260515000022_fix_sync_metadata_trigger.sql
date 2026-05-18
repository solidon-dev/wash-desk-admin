-- trg_sync_profile_to_app_metadata 트리거를 INSERT 제외, UPDATE 전용으로 변경
-- INSERT 시에는 handle_new_user 트리거가 user_metadata 에 role/factory_id 를 이미 포함하므로
-- auth.users 를 다시 UPDATE 할 필요 없음. 또한 createUser() 트랜잭션 중 auth.users 를
-- 트리거에서 UPDATE 하면 "Database error creating new user" 충돌 발생

DROP TRIGGER IF EXISTS trg_sync_profile_to_app_metadata ON public.profiles;

CREATE TRIGGER trg_sync_profile_to_app_metadata
  AFTER UPDATE OF role, factory_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_app_metadata();
