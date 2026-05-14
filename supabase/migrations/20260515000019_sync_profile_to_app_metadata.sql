-- profiles 변경 시 auth.users.app_metadata에 role, factory_id 동기화
-- hooks.server.ts가 DB 조회 없이 JWT 클레임만으로 세션을 구성할 수 있게 함

CREATE OR REPLACE FUNCTION public.sync_profile_to_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object(
        'role',       NEW.role,
        'factory_id', NEW.factory_id
       )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 기존 트리거 제거 후 재생성
DROP TRIGGER IF EXISTS trg_sync_profile_to_app_metadata ON public.profiles;

CREATE TRIGGER trg_sync_profile_to_app_metadata
  AFTER INSERT OR UPDATE OF role, factory_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_app_metadata();

-- 기존 유저 전체 app_metadata 일괄 동기화 (마이그레이션 최초 실행 시)
UPDATE auth.users u
SET raw_app_meta_data = raw_app_meta_data
  || jsonb_build_object(
      'role',       p.role,
      'factory_id', p.factory_id
     )
FROM public.profiles p
WHERE u.id = p.id;
