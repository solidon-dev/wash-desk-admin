-- ============================================================
-- 통계 페이지용 더미 데이터 생성
-- 기간: 2025-01-01 ~ 2026-04-30 (약 16개월)
-- 거래처: 강남 그랜드호텔 (576b5258-bf14-44db-bcff-64d4c42e081b) — 기존 데이터 있는 곳
-- 공장:   3008d6ce-f262-44c2-a6e5-fe5f50bbcf70 (기존 출고와 동일한 공장)
-- 전략:
--   1) 실제 출고가 있는 item_id 중 단가 > 1인 품목만 사용 (의미있는 금액)
--   2) 월별 3~6회 출고, 출고당 4~8개 품목, 수량 랜덤
--   3) generate_series로 날짜 루프, 출고마다 uuid 생성
-- ============================================================

DO $$
DECLARE
  v_client_id  uuid := '576b5258-bf14-44db-bcff-64d4c42e081b';
  v_factory_id uuid := '3008d6ce-f262-44c2-a6e5-fe5f50bbcf70';

  -- 사용할 품목 목록 (단가 있는 것 위주, 테스트 품목 제외)
  v_items uuid[] := ARRAY[
    'c9e3628a-de22-4c55-ba1b-ce35469d519d'::uuid,  -- 대타올
    '8b653453-e502-483f-96ee-993321c1b415'::uuid,  -- 소타올
    '579877b4-d615-433f-ae5e-ad0aa827d566'::uuid,  -- 중타올
    'bfc2e9a9-9f99-44b6-bcb8-ab4a18dee8b3'::uuid,  -- 페이스 타월
    'a2f92e90-20dd-487f-8db6-33b0c0ae2788'::uuid,  -- 핸드 타월
    'ecf37c13-badc-4c52-b777-3b596724800c'::uuid,  -- 배스 타월
    'fb1479e5-37fe-4d3a-8b15-0ea6f93374ed'::uuid,  -- 사우나 타월
    '9baa315c-0f8e-44be-b289-fb07e561a82a'::uuid,  -- 스파 타월
    '9b17e5d7-717b-414a-8614-439789fe3e9f'::uuid,  -- 스파 가운
    'fb08b293-3bd6-451c-af0d-8ea3e56de45f'::uuid,  -- 목욕 가운 (로브)
    'c367d3fd-153e-4c64-a392-a18dd5af0fa5'::uuid,  -- 싱글 시트
    '5ec6bae0-e2a9-4dbe-b1a6-5585c4d0c072'::uuid,  -- 더블 시트
    '2ad3d11f-a269-4bd0-9906-1d42ebff3297'::uuid,  -- 킹 시트
    'df3c1484-7000-4e8d-8b55-18698a946c5e'::uuid,  -- 베개커버
    '27dd33e2-413d-4f94-8a74-53a3aed86648'::uuid,  -- 이불커버 S
    '19938dd1-7040-4d3a-990c-c064400f52c8'::uuid,  -- 이불커버 D
    'e466ae9f-5caa-4580-a36a-9b63a5303b30'::uuid,  -- 상의
    'c6aaed16-d05f-4b48-acff-cdf15a561023'::uuid,  -- 바지
    '1f71fbd5-b465-4cb1-bcea-3640a37d4871'::uuid,  -- 앞치마
    '5f05c516-5f0b-4ac0-a716-396094c13a1e'::uuid,  -- 와이셔츠
    'a6f24572-0a8b-42a1-be12-1d6224ef383a'::uuid,  -- 재킷
    '05d3e8f1-6f9e-4d46-85f3-3cffbb27607b'::uuid,  -- 모자
    'e90404df-1ac8-4f76-aec9-c63512f71727'::uuid,  -- 대걸레 (몹)
    '7cae81da-e90b-4920-99bd-e1e227bfb712'::uuid,  -- 바닥 걸레
    '2f3da314-fc76-442c-945e-5eef731a6c55'::uuid,  -- 냅킨
    'a0f776f6-6ae2-43b1-aab8-7cca7bea83d4'::uuid,  -- 행주
    '7fc3a86a-84ac-404b-a737-0397cbba41c5'::uuid,  -- 사각 테이블보
    'de91477e-84a1-44fd-bd66-80f092ac60b4'::uuid,  -- 원형 테이블보
    '44dae6e9-ed63-4386-8269-630e32945a81'::uuid,  -- 테이블 러너
    '334bdc10-7609-4be6-a2e2-3c8482bcbbc5'::uuid,  -- 매트리스 커버
    '30059716-b4d6-45e0-a3f5-62b9b6088cb3'::uuid,  -- 베개
    '29ceadd0-3011-4626-8c0f-f3454f27e32f'::uuid   -- 랩 타월 (바디 랩)
  ];

  v_month_start  date;
  v_shipout_date date;
  v_shipout_id   uuid;
  v_inv_id       uuid;
  v_item_id      uuid;
  v_item_idx     int;
  v_qty          int;
  v_shipouts_per_month int;
  v_items_per_shipout  int;
  v_day_offset   int;
  v_seed         int;
  m              date;
  s              int;
  i              int;
BEGIN
  -- 2025-01 ~ 2026-04 월별 루프
  FOR m IN SELECT generate_series('2025-01-01'::date, '2026-04-01'::date, '1 month'::interval)::date LOOP
    v_month_start := m;

    -- 월마다 출고 횟수: 3~6회 (월에 따라 시드 변화)
    v_seed := EXTRACT(YEAR FROM m)::int * 100 + EXTRACT(MONTH FROM m)::int;
    v_shipouts_per_month := 3 + (v_seed * 7 + 13) % 4;  -- 3~6

    FOR s IN 1..v_shipouts_per_month LOOP
      -- 출고 날짜: 월 내 랜덤 (1~28일)
      v_day_offset := ((v_seed * s * 17 + s * 31) % 26) + 1;
      v_shipout_date := v_month_start + (v_day_offset - 1);

      -- 출고 레코드 생성
      v_shipout_id := gen_random_uuid();
      INSERT INTO shipouts (id, factory_id, client_id, created_at)
      VALUES (
        v_shipout_id,
        v_factory_id,
        v_client_id,
        v_shipout_date::timestamptz + make_interval(hours => (s * 3 % 12) + 7)
      );

      -- 출고당 품목 수: 4~8개
      v_items_per_shipout := 4 + (v_seed * s * 3 + 11) % 5;  -- 4~8

      FOR i IN 1..v_items_per_shipout LOOP
        -- 품목 순환 선택 (겹치면 건너뜀, 단순하게 인덱스로)
        v_item_idx := ((v_seed * s * 5 + i * 13 + i) % array_length(v_items, 1)) + 1;
        v_item_id := v_items[v_item_idx];

        -- inventory 레코드 (item_id + factory 기준 있으면 skip)
        SELECT id INTO v_inv_id FROM inventory
        WHERE item_id = v_item_id AND factory_id = v_factory_id AND client_id = v_client_id
        LIMIT 1;

        IF v_inv_id IS NULL THEN
          v_inv_id := gen_random_uuid();
          INSERT INTO inventory (id, item_id, factory_id, client_id, quantity)
          VALUES (v_inv_id, v_item_id, v_factory_id, v_client_id, 0)
          ON CONFLICT (factory_id, client_id, item_id) DO NOTHING;

          SELECT id INTO v_inv_id FROM inventory
          WHERE item_id = v_item_id AND factory_id = v_factory_id AND client_id = v_client_id
          LIMIT 1;
        END IF;

        -- 수량: 30~300 (품목/날짜/시드 조합)
        v_qty := 30 + ((v_seed * s + i * 7 + v_item_idx * 3) % 271);

        -- inventory_logs (partial unique index: shipout_id + item_id WHERE shipout_id IS NOT NULL)
        -- ON CONFLICT는 partial index에서 불가 → 중복 존재하면 skip
        IF NOT EXISTS (
          SELECT 1 FROM inventory_logs
          WHERE shipout_id = v_shipout_id AND item_id = v_item_id
        ) THEN
          INSERT INTO inventory_logs (
            id, inventory_id, factory_id, client_id, item_id,
            log_type, quantity, processed_at, shipout_id
          )
          VALUES (
            gen_random_uuid(),
            v_inv_id,
            v_factory_id,
            v_client_id,
            v_item_id,
            'out',
            v_qty,
            v_shipout_date::timestamptz + make_interval(hours => (s * 3 % 12) + 7),
            v_shipout_id
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE '더미 데이터 생성 완료';
END $$;
