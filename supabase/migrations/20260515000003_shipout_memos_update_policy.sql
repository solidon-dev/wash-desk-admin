-- shipout_memos UPDATE 정책 추가 (읽음 처리용)
CREATE POLICY "shipout_memos_update_auth"
  ON public.shipout_memos FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
