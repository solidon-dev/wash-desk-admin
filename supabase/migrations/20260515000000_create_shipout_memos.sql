-- shipout에 대한 메모 테이블 (실무자가 QR 스캔 후 작성)
CREATE TABLE public.shipout_memos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipout_id  uuid NOT NULL REFERENCES public.shipouts(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',  -- 비로그인 실무자 이름 (자유 입력)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shipout_memos_shipout_id_idx ON public.shipout_memos(shipout_id);
CREATE INDEX shipout_memos_created_at_idx ON public.shipout_memos(created_at DESC);

-- RLS 활성화
ALTER TABLE public.shipout_memos ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (QR로 접근하는 실무자, 인증 없음)
CREATE POLICY "shipout_memos_insert_public"
  ON public.shipout_memos FOR INSERT
  WITH CHECK (true);

-- SELECT는 인증된 사용자만 (어드민/factory 사용자)
CREATE POLICY "shipout_memos_select_auth"
  ON public.shipout_memos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR auth.role() = 'service_role'
  );

-- DELETE는 인증된 사용자만
CREATE POLICY "shipout_memos_delete_auth"
  ON public.shipout_memos FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
