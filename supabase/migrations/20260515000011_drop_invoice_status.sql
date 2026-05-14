-- invoices 불필요 컬럼 제거
ALTER TABLE public.invoices DROP COLUMN IF EXISTS status;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS cancelled_by;
