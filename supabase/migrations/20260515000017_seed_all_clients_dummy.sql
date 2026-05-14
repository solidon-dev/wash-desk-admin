-- ============================================================
-- 나머지 거래처 더미 데이터 생성
-- 전략:
--   1) 거래처 성격별로 품목 구성 차별화
--   2) 거래처마다 items + item_prices 생성
--   3) 2025-01 ~ 2026-04 출고 더미 생성
--   4) 거래처별 규모 차이 반영 (대형=5~8회/월, 소형=2~4회/월)
-- ============================================================

DO $$
DECLARE
  v_factory_id uuid := '3008d6ce-f262-44c2-a6e5-fe5f50bbcf70';

  -- 카테고리 UUID
  cat_towel    uuid := '35bad892-35fe-4a73-995d-99b4319607ac'; -- 타올류
  cat_linen    uuid := '63e1c4ef-588b-442e-a10b-02f119c8dc06'; -- 린넨류
  cat_bed      uuid := 'bd35391e-05d8-4eb9-b609-e7ae4a27ddee'; -- 침구류
  cat_bath     uuid := 'f634ca27-971b-4f90-b911-432c2027cf13'; -- 욕실용품
  cat_uniform  uuid := 'd342f36e-ccef-42e8-9c65-70c9b51d9be4'; -- 유니폼
  cat_kitchen  uuid := '11b0beb5-1735-40f3-8a2d-a2fb6da68c35'; -- 주방용품
  cat_spa      uuid := '3593cc15-5d12-41f7-ae63-3c9a73d93095'; -- 스파·사우나
  cat_table    uuid := '4997cc2d-a569-4b7b-82d5-abc2de2a9b1f'; -- 테이블웨어
  cat_room     uuid := '88a4cdc6-c4c0-4782-b1e6-cc7e85c1bf1b'; -- 객실용품
  cat_curtain  uuid := '9f1d255f-56fd-4f34-ab28-05ee94fda604'; -- 커튼·암막

  -- 거래처 + 규모(shipouts/월) + 품목 목록
  -- 형식: (client_id, shipouts_min, shipouts_max, item_array)
  -- item_array: (name_ko, category_id, unit_price, sort_order)

  v_client_id     uuid;
  v_min_shipouts  int;
  v_max_shipouts  int;
  v_item_ids      uuid[];

  v_item_id    uuid;
  v_inv_id     uuid;
  v_shipout_id uuid;
  v_shipout_date date;
  v_month_start  date;
  v_seed         int;
  v_shipout_cnt  int;
  v_item_cnt     int;
  v_item_idx     int;
  v_qty          int;
  v_day_offset   int;
  m    date;
  s    int;
  i    int;

  -- 품목 임시 배열 (최대 12개)
  v_names      text[];
  v_cats       uuid[];
  v_prices     int[];
BEGIN

  -- ────────────────────────────────────────────────────────────
  -- 거래처별 반복 처리
  -- ────────────────────────────────────────────────────────────
  FOR v_client_id, v_min_shipouts, v_max_shipouts, v_names, v_cats, v_prices IN
    VALUES
      -- 호텔류 (대형)
      ('475f09f2-e980-4917-9f7d-df0f86916ab3'::uuid, 5, 8,
        ARRAY['대타올','소타올','배스타올','페이스타올','목욕가운','싱글시트','더블시트','베개커버','이불커버S','이불커버D','객실매트','슬리퍼'],
        ARRAY[cat_towel,cat_towel,cat_towel,cat_towel,cat_bath,cat_linen,cat_linen,cat_linen,cat_bed,cat_bed,cat_room,cat_room],
        ARRAY[500,300,700,250,2500,400,500,300,600,700,800,200]),
      ('048ca757-2f55-4534-9f43-6e33bfb1c722'::uuid, 5, 8,
        ARRAY['대타올','소타올','배스타올','페이스타올','목욕가운','싱글시트','더블시트','킹시트','베개커버','이불커버K','침대패드','스파타올'],
        ARRAY[cat_towel,cat_towel,cat_towel,cat_towel,cat_bath,cat_linen,cat_linen,cat_linen,cat_linen,cat_bed,cat_bed,cat_spa],
        ARRAY[500,300,700,250,2500,400,500,600,300,800,1000,700]),
      ('982fb302-5b9c-400c-b638-8f16cb9be358'::uuid, 4, 6,
        ARRAY['대타올','소타올','배스타올','싱글시트','더블시트','베개커버','이불커버S','이불커버D','객실복','상의','바지'],
        ARRAY[cat_towel,cat_towel,cat_towel,cat_linen,cat_linen,cat_linen,cat_bed,cat_bed,cat_room,cat_uniform,cat_uniform],
        ARRAY[500,300,700,400,500,300,600,700,1000,1500,1500]),
      ('1d38490b-9cc7-435b-af75-6bb118757f5c'::uuid, 5, 8,
        ARRAY['대타올','소타올','배스타올','페이스타올','목욕가운','싱글시트','더블시트','킹시트','베개커버','이불커버S','스파타올','사우나타올'],
        ARRAY[cat_towel,cat_towel,cat_towel,cat_towel,cat_bath,cat_linen,cat_linen,cat_linen,cat_linen,cat_bed,cat_spa,cat_spa],
        ARRAY[500,300,700,250,2500,400,500,600,300,600,700,600]),
      ('00997cc6-2b3a-4f38-be46-e8c46d06689b'::uuid, 5, 8,
        ARRAY['대타올','소타올','배스타올','페이스타올','목욕가운','싱글시트','더블시트','킹시트','베개커버','이불커버D','이불커버K','스파가운'],
        ARRAY[cat_towel,cat_towel,cat_towel,cat_towel,cat_bath,cat_linen,cat_linen,cat_linen,cat_linen,cat_bed,cat_bed,cat_spa],
        ARRAY[500,300,700,250,3000,400,500,600,300,700,800,3500]),

      -- 스파·피트니스류
      ('55dc44ff-137d-485a-a07d-aa5530044be7'::uuid, 4, 6,
        ARRAY['대타올','소타올','사우나타올','스파타올','스파가운','랩타올','바닥매트','수영복'],
        ARRAY[cat_towel,cat_towel,cat_spa,cat_spa,cat_spa,cat_spa,cat_bath,cat_uniform],
        ARRAY[500,300,600,700,4000,1500,800,2000]),
      ('0f780167-9aa3-46c6-bb15-c9b3e2fb1f15'::uuid, 3, 5,
        ARRAY['대타올','소타올','스파타올','운동복상의','운동복하의','수건'],
        ARRAY[cat_towel,cat_towel,cat_spa,cat_uniform,cat_uniform,cat_towel],
        ARRAY[500,300,700,1500,1500,300]),
      ('33859460-4187-4e80-b268-64a837ed2460'::uuid, 2, 4,
        ARRAY['소타올','스파타올','운동복상의','운동복하의','레깅스'],
        ARRAY[cat_towel,cat_spa,cat_uniform,cat_uniform,cat_uniform],
        ARRAY[300,700,1500,1500,2000]),
      ('219c33c5-6a51-4f0f-912b-74e42224cb45'::uuid, 3, 5,
        ARRAY['대타올','소타올','사우나타올','유니폼상의','유니폼하의','테이블보','냅킨'],
        ARRAY[cat_towel,cat_towel,cat_spa,cat_uniform,cat_uniform,cat_table,cat_table],
        ARRAY[500,300,600,1500,1500,2000,400]),

      -- 병원·의료류
      ('65aa9736-869f-4328-8e18-d6d3f5d60511'::uuid, 4, 6,
        ARRAY['환자복','수술복','시트','베개커버','타올','간호사유니폼','수술가운'],
        ARRAY[cat_uniform,cat_uniform,cat_linen,cat_linen,cat_towel,cat_uniform,cat_uniform],
        ARRAY[1500,2000,400,300,300,2500,3000]),
      ('1536c729-a61d-4c4e-8742-9512b6dd5086'::uuid, 3, 5,
        ARRAY['환자복','시트','베개커버','타올','유니폼'],
        ARRAY[cat_uniform,cat_linen,cat_linen,cat_towel,cat_uniform],
        ARRAY[1500,400,300,300,2000]),
      ('8771a1a2-0d02-418e-993a-7bc2e69aa7ee'::uuid, 4, 6,
        ARRAY['주방유니폼','앞치마','행주','주방타올','테이블보','냅킨','주방장갑'],
        ARRAY[cat_uniform,cat_uniform,cat_kitchen,cat_towel,cat_table,cat_table,cat_kitchen],
        ARRAY[2000,800,300,300,1500,400,500]),
      ('347eb30e-11ed-4fac-83e9-9d3be00dc7da'::uuid, 3, 5,
        ARRAY['주방유니폼','앞치마','행주','주방타올','냅킨'],
        ARRAY[cat_uniform,cat_uniform,cat_kitchen,cat_towel,cat_table],
        ARRAY[2000,800,300,300,400]),

      -- 요양원·복지관류
      ('362aa761-351e-4492-8d48-5d5e407417cd'::uuid, 3, 5,
        ARRAY['환자복','시트','베개커버','대타올','소타올','간호복','식사용앞치마'],
        ARRAY[cat_uniform,cat_linen,cat_linen,cat_towel,cat_towel,cat_uniform,cat_uniform],
        ARRAY[1500,400,300,500,300,2500,800]),
      ('aadcefdc-290f-4d9e-be47-25e3721df64d'::uuid, 3, 5,
        ARRAY['환자복','시트','베개커버','타올','요양복'],
        ARRAY[cat_uniform,cat_linen,cat_linen,cat_towel,cat_uniform],
        ARRAY[1500,400,300,300,2000]),
      ('10d722d6-f559-4517-96fe-2107b7d62a74'::uuid, 3, 5,
        ARRAY['대타올','소타올','수영타올','운동복상의','운동복하의'],
        ARRAY[cat_towel,cat_towel,cat_spa,cat_uniform,cat_uniform],
        ARRAY[500,300,600,1500,1500]),

      -- 웨딩홀·레지던스·오피스텔류
      ('20c79918-dd5b-4c18-90df-74a6e2a27b0a'::uuid, 3, 5,
        ARRAY['테이블보','사각테이블보','냅킨','테이블러너','유니폼상의','유니폼하의','앞치마'],
        ARRAY[cat_table,cat_table,cat_table,cat_table,cat_uniform,cat_uniform,cat_uniform],
        ARRAY[2000,2500,400,1000,1500,1500,800]),
      ('c2d5bc91-a0b7-41c7-bfaa-3aa5cb5fd76b'::uuid, 3, 5,
        ARRAY['대타올','소타올','싱글시트','더블시트','베개커버','이불커버S'],
        ARRAY[cat_towel,cat_towel,cat_linen,cat_linen,cat_linen,cat_bed],
        ARRAY[500,300,400,500,300,600]),
      ('e20e343a-bf25-4a21-80c4-5d524a38e14e'::uuid, 2, 4,
        ARRAY['대타올','소타올','유니폼상의','유니폼하의','청소포'],
        ARRAY[cat_towel,cat_towel,cat_uniform,cat_uniform,cat_kitchen],
        ARRAY[500,300,1500,1500,500]),

      -- 뷰티·살롱류
      ('2a3b1aef-6800-4580-8d41-6b9d145b5372'::uuid, 2, 4,
        ARRAY['소타올','페이스타올','케이프(미용)','유니폼상의','앞치마'],
        ARRAY[cat_towel,cat_towel,cat_bath,cat_uniform,cat_uniform],
        ARRAY[300,250,1000,1500,800]),
      ('964e92b9-273a-44ba-a8c9-9e16858c7bcd'::uuid, 2, 4,
        ARRAY['소타올','페이스타올','환자가운','시트','유니폼'],
        ARRAY[cat_towel,cat_towel,cat_bath,cat_linen,cat_uniform],
        ARRAY[300,250,1500,400,2000]),

      -- 어린이집·유치원류
      ('25b38193-69f0-4175-82ef-1ef93a552787'::uuid, 2, 3,
        ARRAY['대타올','소타올','낮잠시트','베개커버','유니폼'],
        ARRAY[cat_towel,cat_towel,cat_linen,cat_linen,cat_uniform],
        ARRAY[500,300,400,300,1500]),
      ('62b5cb23-9e26-43db-90bb-7e4146d2584b'::uuid, 2, 3,
        ARRAY['소타올','낮잠시트','베개커버','유니폼'],
        ARRAY[cat_towel,cat_linen,cat_linen,cat_uniform],
        ARRAY[300,400,300,1500]),
      ('da934e70-a43f-448d-8138-efa501608c7a'::uuid, 2, 3,
        ARRAY['소타올','낮잠시트','베개커버','앞치마'],
        ARRAY[cat_towel,cat_linen,cat_linen,cat_uniform],
        ARRAY[300,400,300,800])

  LOOP
    -- ── 1) 품목 + 단가 생성 ──────────────────────────────────
    v_item_ids := ARRAY[]::uuid[];

    FOR i IN 1..array_length(v_names, 1) LOOP
      v_item_id := gen_random_uuid();

      INSERT INTO items (id, client_id, category_id, name_ko, sort_order)
      VALUES (v_item_id, v_client_id, v_cats[i], v_names[i], i)
      ON CONFLICT (client_id, category_id, name_ko) DO NOTHING;

      -- 충돌 시 기존 id 조회
      SELECT id INTO v_item_id FROM items
      WHERE client_id = v_client_id AND category_id = v_cats[i] AND name_ko = v_names[i];

      -- 단가 등록 (없으면 insert)
      INSERT INTO item_prices (item_id, unit_price, effective_from)
      VALUES (v_item_id, v_prices[i], '2025-01-01')
      ON CONFLICT (item_id, effective_from) DO NOTHING;

      v_item_ids := array_append(v_item_ids, v_item_id);
    END LOOP;

    -- ── 2) 출고 더미 생성 (2025-01 ~ 2026-04) ─────────────────
    FOR m IN SELECT generate_series('2025-01-01'::date, '2026-04-01'::date, '1 month'::interval)::date LOOP
      v_month_start := m;
      v_seed := EXTRACT(YEAR FROM m)::int * 100 + EXTRACT(MONTH FROM m)::int
                + ('x' || encode(v_client_id::text::bytea, 'hex'))::bit(32)::int % 97;

      v_shipout_cnt := v_min_shipouts + (v_seed * 7 + 13) % (v_max_shipouts - v_min_shipouts + 1);

      FOR s IN 1..v_shipout_cnt LOOP
        v_day_offset   := ((v_seed * s * 17 + s * 31) % 26) + 1;
        v_shipout_date := v_month_start + (v_day_offset - 1);
        v_shipout_id   := gen_random_uuid();

        INSERT INTO shipouts (id, factory_id, client_id, created_at)
        VALUES (
          v_shipout_id, v_factory_id, v_client_id,
          v_shipout_date::timestamptz + make_interval(hours => (s * 3 % 12) + 7)
        );

        -- 품목 수: 3 ~ min(array_length, 6)
        v_item_cnt := 3 + (v_seed * s * 3 + 11) % (LEAST(array_length(v_item_ids, 1), 6) - 2);

        FOR i IN 1..v_item_cnt LOOP
          v_item_idx := ((v_seed * s * 5 + i * 13 + i) % array_length(v_item_ids, 1)) + 1;
          v_item_id  := v_item_ids[v_item_idx];

          -- inventory 조회/생성
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

          v_qty := 10 + ((v_seed * s + i * 7 + v_item_idx * 3) % 191);

          IF NOT EXISTS (SELECT 1 FROM inventory_logs WHERE shipout_id = v_shipout_id AND item_id = v_item_id) THEN
            INSERT INTO inventory_logs (
              id, inventory_id, factory_id, client_id, item_id,
              log_type, quantity, processed_at, shipout_id
            ) VALUES (
              gen_random_uuid(), v_inv_id, v_factory_id, v_client_id, v_item_id,
              'out', v_qty,
              v_shipout_date::timestamptz + make_interval(hours => (s * 3 % 12) + 7),
              v_shipout_id
            );
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;

    RAISE NOTICE '거래처 % 완료', v_client_id;
  END LOOP;

  RAISE NOTICE '전체 더미 데이터 생성 완료';
END $$;
