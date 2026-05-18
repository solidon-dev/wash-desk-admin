-- my_role, my_factory_id를 SECURITY DEFINER로 복구
-- 이 함수들은 RLS 정책 내에서 호출되므로 SECURITY DEFINER 필수

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_factory_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT factory_id FROM public.profiles WHERE id = auth.uid();
$$;
