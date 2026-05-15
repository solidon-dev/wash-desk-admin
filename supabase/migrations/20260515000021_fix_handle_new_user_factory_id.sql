-- handle_new_user 트리거: factory_id / role / phone 을 user_metadata 에서 함께 읽도록 수정
-- 기존 트리거는 factory_id 없이 profiles INSERT → profiles_factory_id_required 제약 위반 문제 수정

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
  -- user_metadata 에서 값 추출 (없으면 NULL / 기본값)
  v_factory_id := (NEW.raw_user_meta_data->>'factory_id')::uuid;
  v_phone      := NEW.raw_user_meta_data->>'phone';

  -- role: metadata 에 명시된 값이 유효한 enum 이면 사용, 아니면 'worker'
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'worker';
  END;

  IF v_role IS NULL THEN
    v_role := 'worker';
  END IF;

  -- phone 포맷 체크: 형식이 맞지 않으면 NULL 처리 (트리거 에러 방지)
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

  RETURN NEW;
END;
$$;
