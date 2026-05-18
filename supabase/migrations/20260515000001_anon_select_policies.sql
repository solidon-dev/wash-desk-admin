-- shipout_memos에 대한 메모 페이지 접근 정책 추가
-- anon 사용자(QR로 접근하는 실무자)가 shipout_id로 shipouts/clients를 조회할 수 있도록

CREATE POLICY "shipouts_select_anon"
  ON public.shipouts FOR SELECT TO anon
  USING (true);

CREATE POLICY "clients_select_anon"
  ON public.clients FOR SELECT TO anon
  USING (true);
