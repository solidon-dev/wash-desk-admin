-- ============================================================
-- 테스트 샘플 데이터 (단가 변경 분기 확인용)
-- 거래처: 강남 그랜드호텔 (576b5258-bf14-44db-bcff-64d4c42e081b)
-- 공장:   3008d6ce-f262-44c2-a6e5-fe5f50bbcf70
-- ============================================================

-- 기존 테스트 shipout 정리
DELETE FROM inventory_logs WHERE shipout_id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002'
);
DELETE FROM shipouts WHERE id IN (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'aaaaaaaa-0002-0002-0002-000000000002'
);

-- ──────────────────────────────────────────────
-- shipout A: 2026-05-05 (단가변경 전 구간)
--   배스 타월  900원 × 200개
--   냅킨       400원 × 150개
--   목욕 가운  3000원 × 30개
-- ──────────────────────────────────────────────
INSERT INTO shipouts (id, factory_id, client_id, created_at)
VALUES ('bbbbbbbb-0001-0001-0001-000000000001',
        '3008d6ce-f262-44c2-a6e5-fe5f50bbcf70',
        '576b5258-bf14-44db-bcff-64d4c42e081b',
        '2026-05-05 09:00:00+00');

INSERT INTO inventory_logs (shipout_id, factory_id, client_id, inventory_id, item_id, log_type, quantity, processed_at)
VALUES
  ('bbbbbbbb-0001-0001-0001-000000000001','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   '60382b80-366c-4f01-9460-53a994781dbb','ecf37c13-badc-4c52-b777-3b596724800c','out',200,'2026-05-05 09:00:00+00'),
  ('bbbbbbbb-0001-0001-0001-000000000001','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   'c5f4486d-025d-4b7f-a027-d2b0314fed12','2f3da314-fc76-442c-945e-5eef731a6c55','out',150,'2026-05-05 09:00:00+00'),
  ('bbbbbbbb-0001-0001-0001-000000000001','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   'a669518a-06f2-4a7d-8d74-d7c9818268a3','fb08b293-3bd6-451c-af0d-8ea3e56de45f','out',30,'2026-05-05 09:00:00+00');

-- ──────────────────────────────────────────────
-- shipout B: 2026-05-10 (단가변경 전 구간)
--   배스 타월  900원 × 180개
--   냅킨       400원 × 120개
-- ──────────────────────────────────────────────
INSERT INTO shipouts (id, factory_id, client_id, created_at)
VALUES ('bbbbbbbb-0002-0002-0002-000000000002',
        '3008d6ce-f262-44c2-a6e5-fe5f50bbcf70',
        '576b5258-bf14-44db-bcff-64d4c42e081b',
        '2026-05-10 09:00:00+00');

INSERT INTO inventory_logs (shipout_id, factory_id, client_id, inventory_id, item_id, log_type, quantity, processed_at)
VALUES
  ('bbbbbbbb-0002-0002-0002-000000000002','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   '60382b80-366c-4f01-9460-53a994781dbb','ecf37c13-badc-4c52-b777-3b596724800c','out',180,'2026-05-10 09:00:00+00'),
  ('bbbbbbbb-0002-0002-0002-000000000002','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   'c5f4486d-025d-4b7f-a027-d2b0314fed12','2f3da314-fc76-442c-945e-5eef731a6c55','out',120,'2026-05-10 09:00:00+00');

-- ──────────────────────────────────────────────
-- shipout C: 2026-05-14 (단가변경 후 구간, 배스 타월 1500원)
--   배스 타월  1500원 × 100개  ← 단가 변경!
--   냅킨        400원 × 80개
--   목욕 가운  3000원 × 20개
-- ──────────────────────────────────────────────
INSERT INTO shipouts (id, factory_id, client_id, created_at)
VALUES ('bbbbbbbb-0003-0003-0003-000000000003',
        '3008d6ce-f262-44c2-a6e5-fe5f50bbcf70',
        '576b5258-bf14-44db-bcff-64d4c42e081b',
        '2026-05-14 09:00:00+00');

INSERT INTO inventory_logs (shipout_id, factory_id, client_id, inventory_id, item_id, log_type, quantity, processed_at)
VALUES
  ('bbbbbbbb-0003-0003-0003-000000000003','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   '60382b80-366c-4f01-9460-53a994781dbb','ecf37c13-badc-4c52-b777-3b596724800c','out',100,'2026-05-14 09:00:00+00'),
  ('bbbbbbbb-0003-0003-0003-000000000003','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   'c5f4486d-025d-4b7f-a027-d2b0314fed12','2f3da314-fc76-442c-945e-5eef731a6c55','out',80,'2026-05-14 09:00:00+00'),
  ('bbbbbbbb-0003-0003-0003-000000000003','3008d6ce-f262-44c2-a6e5-fe5f50bbcf70','576b5258-bf14-44db-bcff-64d4c42e081b',
   'a669518a-06f2-4a7d-8d74-d7c9818268a3','fb08b293-3bd6-451c-af0d-8ea3e56de45f','out',20,'2026-05-14 09:00:00+00');

SELECT '샘플 데이터 삽입 완료' as result;
