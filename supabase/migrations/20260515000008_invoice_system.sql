-- 1. invoice_memos 테이블 삭제
DROP TABLE IF EXISTS public.invoice_memos CASCADE;

-- 2. invoices에 jeolsa 컬럼 추가 (VAT 절사액)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS jeolsa integer NOT NULL DEFAULT 0;

-- 3. invoices에 status 컬럼 추가
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'issued'
  CHECK (status IN ('issued', 'cancelled'));

-- 4. invoices에 cancelled_at, cancelled_by 추가
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);

-- 5. invoice_attachments에 storage_path 컬럼 추가
ALTER TABLE public.invoice_attachments ADD COLUMN IF NOT EXISTS storage_path text;

-- 6. Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS 정책
CREATE POLICY "invoices_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "invoices_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'invoices');
