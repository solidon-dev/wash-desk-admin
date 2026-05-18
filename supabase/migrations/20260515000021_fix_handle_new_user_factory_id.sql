-- handle_new_user 트리거:
--   1. user_metadata 에서 role / factory_id / phone 읽어 profiles INSERT
--   2. app_metadata 에도 role / factory_id 동기화 (sync 트리거가 INSERT 에 미적용이므로 여기서 처리)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factory_id uuid;
  v_role       public.user_role;
  v_phone      text;
BEGIN
  v_factory_id := (NEW.raw_user_meta_data->>'factory_id')::uuid;
  v_phone      := NEW.raw_user_meta_data->>'phone';

  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'worker';
  END;

  IF v_role IS NULL THEN
    v_role := 'worker';
  END IF;

  IF v_phone IS NOT NULL AND v_phone !~ '^01[016789][0-9]{7,8}$' THEN
    v_phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, factory_id, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    v_role,
    v_factory_id,
    v_phone
  );

  -- app_metadata 에 role / factory_id 동기화 (hooks.server.ts 가 JWT 클레임으로 세션 구성)
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('role', v_role, 'factory_id', v_factory_id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
