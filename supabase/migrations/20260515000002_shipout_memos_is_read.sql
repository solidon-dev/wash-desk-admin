-- shipout_memos에 읽음 여부 컬럼 추가
ALTER TABLE public.shipout_memos ADD COLUMN is_read boolean NOT NULL DEFAULT false;
