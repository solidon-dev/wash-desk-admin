// ─── 카테고리 ────────────────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  towel: '타월',
  sheet: '시트',
  uniform: '유니폼',
  mop: '청소포',
  mat: '매트',
  apron: '앞치마',
  pillowcase: '베갯잇',
};

// DaisyUI CSS 변수 — 다크/라이트 테마 자동 대응
export const CATEGORY_COLORS: Record<string, string> = {
  towel:       'var(--color-primary)',
  sheet:       'var(--color-secondary)',
  uniform:     'var(--color-accent)',
  mop:         'var(--color-success)',
  mat:         'var(--color-warning)',
  apron:       'var(--color-error)',
  pillowcase:  'var(--color-info)',
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// ─── 거래처 ────────────────────────────────────────────────────────────────
export const clients = [
  { id: 'client-001', name: '그랜드호텔' },
  { id: 'client-002', name: '오션뷰펜션' },
  { id: 'client-003', name: '제주리조트' },
  { id: 'client-004', name: '힐사이드호텔' },
  { id: 'client-005', name: '선셋펜션' },
  { id: 'client-006', name: '블루라군리조트' },
];

// ─── 단가 ──────────────────────────────────────────────────────────────────
export const UNIT_PRICES: Record<string, number> = {
  대형타올: 800,
  소형타올: 600,
  바스타올: 900,
  싱글시트: 1200,
  더블시트: 1500,
  직원유니폼: 2500,
  주방앞치마: 700,
  바닥청소포: 400,
  현관매트: 1800,
  베갯잇: 500,
};

// ─── 품목 → 카테고리 ───────────────────────────────────────────────────────
export const ITEM_CATEGORY: Record<string, string> = {
  대형타올: 'towel',
  소형타올: 'towel',
  바스타올: 'towel',
  싱글시트: 'sheet',
  더블시트: 'sheet',
  직원유니폼: 'uniform',
  주방앞치마: 'apron',
  바닥청소포: 'mop',
  현관매트: 'mat',
  베갯잇: 'pillowcase',
};

// ─── 타입 ──────────────────────────────────────────────────────────────────
export interface ShipmentItem {
  itemName: string;
  category: string;
  quantity: number;
}

export interface Shipment {
  id: string;
  clientId: string;
  shippedAt: string;
  items: ShipmentItem[];
}

// ─── 샘플 데이터 ────────────────────────────────────────────────────────────
// NOW = 2026-05-12 기준
// 2026년 1~5월: 각 달 8~12건 / 2025년 1~12월: 각 달 5~8건

export const shipments: Shipment[] = [
  // ════════════════════════════════════════════════════
  // 2026년 1월 (11건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2601-001',
    clientId: 'client-001',
    shippedAt: '2026-01-03T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 180 },
      { itemName: '바스타올', category: 'towel', quantity: 120 },
      { itemName: '싱글시트', category: 'sheet', quantity: 80 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 100 },
    ],
  },
  {
    id: 'S2601-002',
    clientId: 'client-002',
    shippedAt: '2026-01-05T10:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 90 },
      { itemName: '더블시트', category: 'sheet', quantity: 40 },
      { itemName: '현관매트', category: 'mat', quantity: 15 },
    ],
  },
  {
    id: 'S2601-003',
    clientId: 'client-003',
    shippedAt: '2026-01-07T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 160 },
      { itemName: '바스타올', category: 'towel', quantity: 100 },
      { itemName: '더블시트', category: 'sheet', quantity: 70 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 20 },
    ],
  },
  {
    id: 'S2601-004',
    clientId: 'client-004',
    shippedAt: '2026-01-08T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 140 },
      { itemName: '싱글시트', category: 'sheet', quantity: 60 },
      { itemName: '주방앞치마', category: 'apron', quantity: 40 },
      { itemName: '바닥청소포', category: 'mop', quantity: 60 },
    ],
  },
  {
    id: 'S2601-005',
    clientId: 'client-005',
    shippedAt: '2026-01-10T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 70 },
      { itemName: '더블시트', category: 'sheet', quantity: 35 },
      { itemName: '현관매트', category: 'mat', quantity: 12 },
    ],
  },
  {
    id: 'S2601-006',
    clientId: 'client-006',
    shippedAt: '2026-01-12T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 130 },
      { itemName: '싱글시트', category: 'sheet', quantity: 75 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 90 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 15 },
    ],
  },
  {
    id: 'S2601-007',
    clientId: 'client-001',
    shippedAt: '2026-01-15T10:00:00',
    items: [
      { itemName: '바닥청소포', category: 'mop', quantity: 80 },
      { itemName: '현관매트', category: 'mat', quantity: 20 },
      { itemName: '주방앞치마', category: 'apron', quantity: 50 },
    ],
  },
  {
    id: 'S2601-008',
    clientId: 'client-003',
    shippedAt: '2026-01-18T09:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 110 },
      { itemName: '싱글시트', category: 'sheet', quantity: 55 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 80 },
    ],
  },
  {
    id: 'S2601-009',
    clientId: 'client-002',
    shippedAt: '2026-01-20T13:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 85 },
      { itemName: '주방앞치마', category: 'apron', quantity: 30 },
      { itemName: '바닥청소포', category: 'mop', quantity: 50 },
    ],
  },
  {
    id: 'S2601-010',
    clientId: 'client-004',
    shippedAt: '2026-01-23T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 150 },
      { itemName: '더블시트', category: 'sheet', quantity: 65 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 25 },
    ],
  },
  {
    id: 'S2601-011',
    clientId: 'client-005',
    shippedAt: '2026-01-27T10:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 60 },
      { itemName: '현관매트', category: 'mat', quantity: 18 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 60 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2026년 2월 (10건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2602-001',
    clientId: 'client-001',
    shippedAt: '2026-02-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 170 },
      { itemName: '바스타올', category: 'towel', quantity: 110 },
      { itemName: '더블시트', category: 'sheet', quantity: 90 },
    ],
  },
  {
    id: 'S2602-002',
    clientId: 'client-003',
    shippedAt: '2026-02-04T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 130 },
      { itemName: '싱글시트', category: 'sheet', quantity: 70 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 18 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 95 },
    ],
  },
  {
    id: 'S2602-003',
    clientId: 'client-006',
    shippedAt: '2026-02-06T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 120 },
      { itemName: '더블시트', category: 'sheet', quantity: 80 },
      { itemName: '현관매트', category: 'mat', quantity: 25 },
    ],
  },
  {
    id: 'S2602-004',
    clientId: 'client-002',
    shippedAt: '2026-02-10T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 95 },
      { itemName: '주방앞치마', category: 'apron', quantity: 45 },
      { itemName: '바닥청소포', category: 'mop', quantity: 70 },
    ],
  },
  {
    id: 'S2602-005',
    clientId: 'client-004',
    shippedAt: '2026-02-12T09:30:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 160 },
      { itemName: '싱글시트', category: 'sheet', quantity: 65 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 85 },
    ],
  },
  {
    id: 'S2602-006',
    clientId: 'client-005',
    shippedAt: '2026-02-14T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 75 },
      { itemName: '더블시트', category: 'sheet', quantity: 40 },
      { itemName: '바닥청소포', category: 'mop', quantity: 55 },
    ],
  },
  {
    id: 'S2602-007',
    clientId: 'client-001',
    shippedAt: '2026-02-17T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 28 },
      { itemName: '주방앞치마', category: 'apron', quantity: 55 },
      { itemName: '바닥청소포', category: 'mop', quantity: 90 },
    ],
  },
  {
    id: 'S2602-008',
    clientId: 'client-003',
    shippedAt: '2026-02-20T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 190 },
      { itemName: '바스타올', category: 'towel', quantity: 140 },
      { itemName: '싱글시트', category: 'sheet', quantity: 85 },
    ],
  },
  {
    id: 'S2602-009',
    clientId: 'client-006',
    shippedAt: '2026-02-24T13:00:00',
    items: [
      { itemName: '현관매트', category: 'mat', quantity: 30 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 110 },
      { itemName: '주방앞치마', category: 'apron', quantity: 35 },
    ],
  },
  {
    id: 'S2602-010',
    clientId: 'client-002',
    shippedAt: '2026-02-27T10:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 80 },
      { itemName: '더블시트', category: 'sheet', quantity: 50 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 12 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2026년 3월 (12건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2603-001',
    clientId: 'client-001',
    shippedAt: '2026-03-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 200 },
      { itemName: '바스타올', category: 'towel', quantity: 150 },
      { itemName: '더블시트', category: 'sheet', quantity: 100 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 120 },
    ],
  },
  {
    id: 'S2603-002',
    clientId: 'client-002',
    shippedAt: '2026-03-04T10:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 100 },
      { itemName: '싱글시트', category: 'sheet', quantity: 50 },
      { itemName: '현관매트', category: 'mat', quantity: 20 },
    ],
  },
  {
    id: 'S2603-003',
    clientId: 'client-003',
    shippedAt: '2026-03-06T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 175 },
      { itemName: '더블시트', category: 'sheet', quantity: 85 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 22 },
    ],
  },
  {
    id: 'S2603-004',
    clientId: 'client-004',
    shippedAt: '2026-03-08T11:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 165 },
      { itemName: '싱글시트', category: 'sheet', quantity: 75 },
      { itemName: '주방앞치마', category: 'apron', quantity: 50 },
      { itemName: '바닥청소포', category: 'mop', quantity: 80 },
    ],
  },
  {
    id: 'S2603-005',
    clientId: 'client-005',
    shippedAt: '2026-03-10T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 85 },
      { itemName: '더블시트', category: 'sheet', quantity: 45 },
      { itemName: '바닥청소포', category: 'mop', quantity: 65 },
    ],
  },
  {
    id: 'S2603-006',
    clientId: 'client-006',
    shippedAt: '2026-03-12T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 145 },
      { itemName: '싱글시트', category: 'sheet', quantity: 90 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 105 },
    ],
  },
  {
    id: 'S2603-007',
    clientId: 'client-001',
    shippedAt: '2026-03-14T10:00:00',
    items: [
      { itemName: '바닥청소포', category: 'mop', quantity: 95 },
      { itemName: '현관매트', category: 'mat', quantity: 35 },
      { itemName: '주방앞치마', category: 'apron', quantity: 60 },
    ],
  },
  {
    id: 'S2603-008',
    clientId: 'client-003',
    shippedAt: '2026-03-17T09:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 120 },
      { itemName: '싱글시트', category: 'sheet', quantity: 60 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 90 },
    ],
  },
  {
    id: 'S2603-009',
    clientId: 'client-002',
    shippedAt: '2026-03-19T13:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 95 },
      { itemName: '주방앞치마', category: 'apron', quantity: 35 },
      { itemName: '현관매트', category: 'mat', quantity: 22 },
    ],
  },
  {
    id: 'S2603-010',
    clientId: 'client-004',
    shippedAt: '2026-03-21T08:30:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 155 },
      { itemName: '더블시트', category: 'sheet', quantity: 70 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 30 },
    ],
  },
  {
    id: 'S2603-011',
    clientId: 'client-005',
    shippedAt: '2026-03-25T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 65 },
      { itemName: '바스타올', category: 'towel', quantity: 55 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 70 },
    ],
  },
  {
    id: 'S2603-012',
    clientId: 'client-006',
    shippedAt: '2026-03-28T11:30:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 20 },
      { itemName: '바닥청소포', category: 'mop', quantity: 75 },
      { itemName: '현관매트', category: 'mat', quantity: 28 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2026년 4월 (10건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2604-001',
    clientId: 'client-001',
    shippedAt: '2026-04-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 190 },
      { itemName: '바스타올', category: 'towel', quantity: 130 },
      { itemName: '더블시트', category: 'sheet', quantity: 95 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 115 },
    ],
  },
  {
    id: 'S2604-002',
    clientId: 'client-003',
    shippedAt: '2026-04-04T10:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 170 },
      { itemName: '싱글시트', category: 'sheet', quantity: 80 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 25 },
    ],
  },
  {
    id: 'S2604-003',
    clientId: 'client-006',
    shippedAt: '2026-04-07T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 140 },
      { itemName: '더블시트', category: 'sheet', quantity: 88 },
      { itemName: '현관매트', category: 'mat', quantity: 32 },
    ],
  },
  {
    id: 'S2604-004',
    clientId: 'client-002',
    shippedAt: '2026-04-09T11:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 105 },
      { itemName: '주방앞치마', category: 'apron', quantity: 55 },
      { itemName: '바닥청소포', category: 'mop', quantity: 85 },
    ],
  },
  {
    id: 'S2604-005',
    clientId: 'client-004',
    shippedAt: '2026-04-12T09:30:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 175 },
      { itemName: '싱글시트', category: 'sheet', quantity: 78 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 100 },
    ],
  },
  {
    id: 'S2604-006',
    clientId: 'client-005',
    shippedAt: '2026-04-15T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 80 },
      { itemName: '더블시트', category: 'sheet', quantity: 42 },
      { itemName: '바닥청소포', category: 'mop', quantity: 60 },
    ],
  },
  {
    id: 'S2604-007',
    clientId: 'client-001',
    shippedAt: '2026-04-17T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 22 },
      { itemName: '주방앞치마', category: 'apron', quantity: 48 },
      { itemName: '바닥청소포', category: 'mop', quantity: 88 },
    ],
  },
  {
    id: 'S2604-008',
    clientId: 'client-003',
    shippedAt: '2026-04-21T09:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 115 },
      { itemName: '싱글시트', category: 'sheet', quantity: 65 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 95 },
    ],
  },
  {
    id: 'S2604-009',
    clientId: 'client-002',
    shippedAt: '2026-04-24T13:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 90 },
      { itemName: '현관매트', category: 'mat', quantity: 18 },
      { itemName: '주방앞치마', category: 'apron', quantity: 38 },
    ],
  },
  {
    id: 'S2604-010',
    clientId: 'client-006',
    shippedAt: '2026-04-28T10:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 155 },
      { itemName: '더블시트', category: 'sheet', quantity: 72 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 17 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2026년 5월 (8건, ~12일 기준)
  // ════════════════════════════════════════════════════
  {
    id: 'S2605-001',
    clientId: 'client-001',
    shippedAt: '2026-05-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 185 },
      { itemName: '바스타올', category: 'towel', quantity: 125 },
      { itemName: '더블시트', category: 'sheet', quantity: 92 },
    ],
  },
  {
    id: 'S2605-002',
    clientId: 'client-003',
    shippedAt: '2026-05-03T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 125 },
      { itemName: '싱글시트', category: 'sheet', quantity: 72 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 98 },
    ],
  },
  {
    id: 'S2605-003',
    clientId: 'client-006',
    shippedAt: '2026-05-05T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 138 },
      { itemName: '현관매트', category: 'mat', quantity: 28 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 20 },
    ],
  },
  {
    id: 'S2605-004',
    clientId: 'client-002',
    shippedAt: '2026-05-07T11:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 88 },
      { itemName: '주방앞치마', category: 'apron', quantity: 42 },
      { itemName: '바닥청소포', category: 'mop', quantity: 72 },
    ],
  },
  {
    id: 'S2605-005',
    clientId: 'client-004',
    shippedAt: '2026-05-08T09:30:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 168 },
      { itemName: '싱글시트', category: 'sheet', quantity: 82 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 108 },
    ],
  },
  {
    id: 'S2605-006',
    clientId: 'client-005',
    shippedAt: '2026-05-09T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 78 },
      { itemName: '더블시트', category: 'sheet', quantity: 38 },
      { itemName: '바닥청소포', category: 'mop', quantity: 58 },
    ],
  },
  {
    id: 'S2605-007',
    clientId: 'client-001',
    shippedAt: '2026-05-10T10:00:00',
    items: [
      { itemName: '바닥청소포', category: 'mop', quantity: 82 },
      { itemName: '현관매트', category: 'mat', quantity: 24 },
      { itemName: '주방앞치마', category: 'apron', quantity: 52 },
    ],
  },
  {
    id: 'S2605-008',
    clientId: 'client-003',
    shippedAt: '2026-05-12T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 162 },
      { itemName: '더블시트', category: 'sheet', quantity: 78 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 18 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 1월 (6건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2501-001',
    clientId: 'client-001',
    shippedAt: '2025-01-05T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 150 },
      { itemName: '바스타올', category: 'towel', quantity: 100 },
      { itemName: '더블시트', category: 'sheet', quantity: 70 },
    ],
  },
  {
    id: 'S2501-002',
    clientId: 'client-002',
    shippedAt: '2025-01-08T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 75 },
      { itemName: '싱글시트', category: 'sheet', quantity: 40 },
      { itemName: '현관매트', category: 'mat', quantity: 12 },
    ],
  },
  {
    id: 'S2501-003',
    clientId: 'client-003',
    shippedAt: '2025-01-12T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 130 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 15 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 70 },
    ],
  },
  {
    id: 'S2501-004',
    clientId: 'client-004',
    shippedAt: '2025-01-16T11:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 120 },
      { itemName: '싱글시트', category: 'sheet', quantity: 55 },
      { itemName: '바닥청소포', category: 'mop', quantity: 50 },
    ],
  },
  {
    id: 'S2501-005',
    clientId: 'client-005',
    shippedAt: '2025-01-21T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 60 },
      { itemName: '더블시트', category: 'sheet', quantity: 30 },
      { itemName: '주방앞치마', category: 'apron', quantity: 25 },
    ],
  },
  {
    id: 'S2501-006',
    clientId: 'client-006',
    shippedAt: '2025-01-27T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 110 },
      { itemName: '더블시트', category: 'sheet', quantity: 60 },
      { itemName: '현관매트', category: 'mat', quantity: 15 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 2월 (5건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2502-001',
    clientId: 'client-001',
    shippedAt: '2025-02-04T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 145 },
      { itemName: '더블시트', category: 'sheet', quantity: 75 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 80 },
    ],
  },
  {
    id: 'S2502-002',
    clientId: 'client-003',
    shippedAt: '2025-02-08T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 100 },
      { itemName: '싱글시트', category: 'sheet', quantity: 50 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 14 },
    ],
  },
  {
    id: 'S2502-003',
    clientId: 'client-004',
    shippedAt: '2025-02-13T08:30:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 135 },
      { itemName: '바닥청소포', category: 'mop', quantity: 60 },
      { itemName: '주방앞치마', category: 'apron', quantity: 30 },
    ],
  },
  {
    id: 'S2502-004',
    clientId: 'client-002',
    shippedAt: '2025-02-19T11:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 70 },
      { itemName: '현관매트', category: 'mat', quantity: 14 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 65 },
    ],
  },
  {
    id: 'S2502-005',
    clientId: 'client-006',
    shippedAt: '2025-02-25T10:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 115 },
      { itemName: '더블시트', category: 'sheet', quantity: 65 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 16 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 3월 (7건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2503-001',
    clientId: 'client-001',
    shippedAt: '2025-03-03T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 160 },
      { itemName: '바스타올', category: 'towel', quantity: 110 },
      { itemName: '더블시트', category: 'sheet', quantity: 85 },
    ],
  },
  {
    id: 'S2503-002',
    clientId: 'client-003',
    shippedAt: '2025-03-07T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 110 },
      { itemName: '싱글시트', category: 'sheet', quantity: 60 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 75 },
    ],
  },
  {
    id: 'S2503-003',
    clientId: 'client-004',
    shippedAt: '2025-03-11T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 140 },
      { itemName: '싱글시트', category: 'sheet', quantity: 68 },
      { itemName: '바닥청소포', category: 'mop', quantity: 70 },
    ],
  },
  {
    id: 'S2503-004',
    clientId: 'client-002',
    shippedAt: '2025-03-14T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 88 },
      { itemName: '주방앞치마', category: 'apron', quantity: 35 },
      { itemName: '현관매트', category: 'mat', quantity: 18 },
    ],
  },
  {
    id: 'S2503-005',
    clientId: 'client-005',
    shippedAt: '2025-03-18T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 68 },
      { itemName: '더블시트', category: 'sheet', quantity: 35 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 60 },
    ],
  },
  {
    id: 'S2503-006',
    clientId: 'client-006',
    shippedAt: '2025-03-22T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 125 },
      { itemName: '더블시트', category: 'sheet', quantity: 72 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 18 },
    ],
  },
  {
    id: 'S2503-007',
    clientId: 'client-001',
    shippedAt: '2025-03-27T10:00:00',
    items: [
      { itemName: '바닥청소포', category: 'mop', quantity: 85 },
      { itemName: '주방앞치마', category: 'apron', quantity: 45 },
      { itemName: '현관매트', category: 'mat', quantity: 22 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 4월 (8건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2504-001',
    clientId: 'client-001',
    shippedAt: '2025-04-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 170 },
      { itemName: '더블시트', category: 'sheet', quantity: 90 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 100 },
    ],
  },
  {
    id: 'S2504-002',
    clientId: 'client-003',
    shippedAt: '2025-04-05T10:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 145 },
      { itemName: '싱글시트', category: 'sheet', quantity: 72 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 20 },
    ],
  },
  {
    id: 'S2504-003',
    clientId: 'client-006',
    shippedAt: '2025-04-08T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 130 },
      { itemName: '더블시트', category: 'sheet', quantity: 78 },
      { itemName: '현관매트', category: 'mat', quantity: 25 },
    ],
  },
  {
    id: 'S2504-004',
    clientId: 'client-002',
    shippedAt: '2025-04-11T11:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 90 },
      { itemName: '바닥청소포', category: 'mop', quantity: 65 },
      { itemName: '주방앞치마', category: 'apron', quantity: 38 },
    ],
  },
  {
    id: 'S2504-005',
    clientId: 'client-004',
    shippedAt: '2025-04-15T09:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 155 },
      { itemName: '싱글시트', category: 'sheet', quantity: 68 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 88 },
    ],
  },
  {
    id: 'S2504-006',
    clientId: 'client-005',
    shippedAt: '2025-04-19T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 72 },
      { itemName: '더블시트', category: 'sheet', quantity: 38 },
      { itemName: '바닥청소포', category: 'mop', quantity: 55 },
    ],
  },
  {
    id: 'S2504-007',
    clientId: 'client-001',
    shippedAt: '2025-04-23T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 24 },
      { itemName: '주방앞치마', category: 'apron', quantity: 50 },
      { itemName: '바닥청소포', category: 'mop', quantity: 78 },
    ],
  },
  {
    id: 'S2504-008',
    clientId: 'client-003',
    shippedAt: '2025-04-28T09:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 105 },
      { itemName: '싱글시트', category: 'sheet', quantity: 58 },
      { itemName: '현관매트', category: 'mat', quantity: 20 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 5월 (7건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2505-001',
    clientId: 'client-001',
    shippedAt: '2025-05-03T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 165 },
      { itemName: '바스타올', category: 'towel', quantity: 115 },
      { itemName: '더블시트', category: 'sheet', quantity: 88 },
    ],
  },
  {
    id: 'S2505-002',
    clientId: 'client-002',
    shippedAt: '2025-05-07T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 82 },
      { itemName: '현관매트', category: 'mat', quantity: 16 },
      { itemName: '주방앞치마', category: 'apron', quantity: 32 },
    ],
  },
  {
    id: 'S2505-003',
    clientId: 'client-003',
    shippedAt: '2025-05-10T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 148 },
      { itemName: '싱글시트', category: 'sheet', quantity: 65 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 18 },
    ],
  },
  {
    id: 'S2505-004',
    clientId: 'client-004',
    shippedAt: '2025-05-14T11:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 148 },
      { itemName: '싱글시트', category: 'sheet', quantity: 70 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 82 },
    ],
  },
  {
    id: 'S2505-005',
    clientId: 'client-005',
    shippedAt: '2025-05-18T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 65 },
      { itemName: '더블시트', category: 'sheet', quantity: 33 },
      { itemName: '바닥청소포', category: 'mop', quantity: 52 },
    ],
  },
  {
    id: 'S2505-006',
    clientId: 'client-006',
    shippedAt: '2025-05-22T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 122 },
      { itemName: '더블시트', category: 'sheet', quantity: 68 },
      { itemName: '현관매트', category: 'mat', quantity: 22 },
    ],
  },
  {
    id: 'S2505-007',
    clientId: 'client-001',
    shippedAt: '2025-05-28T10:00:00',
    items: [
      { itemName: '바닥청소포', category: 'mop', quantity: 75 },
      { itemName: '주방앞치마', category: 'apron', quantity: 42 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 78 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 6월 (6건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2506-001',
    clientId: 'client-001',
    shippedAt: '2025-06-03T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 178 },
      { itemName: '더블시트', category: 'sheet', quantity: 92 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 105 },
    ],
  },
  {
    id: 'S2506-002',
    clientId: 'client-003',
    shippedAt: '2025-06-07T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 115 },
      { itemName: '싱글시트', category: 'sheet', quantity: 62 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 19 },
    ],
  },
  {
    id: 'S2506-003',
    clientId: 'client-004',
    shippedAt: '2025-06-11T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 145 },
      { itemName: '싱글시트', category: 'sheet', quantity: 73 },
      { itemName: '바닥청소포', category: 'mop', quantity: 68 },
    ],
  },
  {
    id: 'S2506-004',
    clientId: 'client-002',
    shippedAt: '2025-06-16T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 92 },
      { itemName: '주방앞치마', category: 'apron', quantity: 40 },
      { itemName: '현관매트', category: 'mat', quantity: 17 },
    ],
  },
  {
    id: 'S2506-005',
    clientId: 'client-005',
    shippedAt: '2025-06-21T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 70 },
      { itemName: '더블시트', category: 'sheet', quantity: 36 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 62 },
    ],
  },
  {
    id: 'S2506-006',
    clientId: 'client-006',
    shippedAt: '2025-06-26T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 132 },
      { itemName: '더블시트', category: 'sheet', quantity: 75 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 16 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 7월 (8건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2507-001',
    clientId: 'client-001',
    shippedAt: '2025-07-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 195 },
      { itemName: '바스타올', category: 'towel', quantity: 135 },
      { itemName: '더블시트', category: 'sheet', quantity: 98 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 112 },
    ],
  },
  {
    id: 'S2507-002',
    clientId: 'client-002',
    shippedAt: '2025-07-05T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 95 },
      { itemName: '싱글시트', category: 'sheet', quantity: 48 },
      { itemName: '현관매트', category: 'mat', quantity: 18 },
    ],
  },
  {
    id: 'S2507-003',
    clientId: 'client-003',
    shippedAt: '2025-07-08T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 155 },
      { itemName: '싱글시트', category: 'sheet', quantity: 75 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 22 },
    ],
  },
  {
    id: 'S2507-004',
    clientId: 'client-004',
    shippedAt: '2025-07-12T11:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 162 },
      { itemName: '더블시트', category: 'sheet', quantity: 82 },
      { itemName: '바닥청소포', category: 'mop', quantity: 78 },
    ],
  },
  {
    id: 'S2507-005',
    clientId: 'client-005',
    shippedAt: '2025-07-16T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 75 },
      { itemName: '더블시트', category: 'sheet', quantity: 40 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 68 },
    ],
  },
  {
    id: 'S2507-006',
    clientId: 'client-006',
    shippedAt: '2025-07-19T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 140 },
      { itemName: '싱글시트', category: 'sheet', quantity: 80 },
      { itemName: '주방앞치마', category: 'apron', quantity: 42 },
    ],
  },
  {
    id: 'S2507-007',
    clientId: 'client-001',
    shippedAt: '2025-07-23T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 26 },
      { itemName: '바닥청소포', category: 'mop', quantity: 88 },
      { itemName: '현관매트', category: 'mat', quantity: 30 },
    ],
  },
  {
    id: 'S2507-008',
    clientId: 'client-003',
    shippedAt: '2025-07-28T09:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 118 },
      { itemName: '싱글시트', category: 'sheet', quantity: 62 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 85 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 8월 (7건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2508-001',
    clientId: 'client-001',
    shippedAt: '2025-08-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 188 },
      { itemName: '더블시트', category: 'sheet', quantity: 95 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 108 },
    ],
  },
  {
    id: 'S2508-002',
    clientId: 'client-003',
    shippedAt: '2025-08-06T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 122 },
      { itemName: '싱글시트', category: 'sheet', quantity: 66 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 21 },
    ],
  },
  {
    id: 'S2508-003',
    clientId: 'client-004',
    shippedAt: '2025-08-09T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 158 },
      { itemName: '싱글시트', category: 'sheet', quantity: 76 },
      { itemName: '바닥청소포', category: 'mop', quantity: 72 },
    ],
  },
  {
    id: 'S2508-004',
    clientId: 'client-002',
    shippedAt: '2025-08-13T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 96 },
      { itemName: '주방앞치마', category: 'apron', quantity: 44 },
      { itemName: '현관매트', category: 'mat', quantity: 19 },
    ],
  },
  {
    id: 'S2508-005',
    clientId: 'client-006',
    shippedAt: '2025-08-18T09:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 135 },
      { itemName: '더블시트', category: 'sheet', quantity: 78 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 92 },
    ],
  },
  {
    id: 'S2508-006',
    clientId: 'client-005',
    shippedAt: '2025-08-22T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 68 },
      { itemName: '더블시트', category: 'sheet', quantity: 36 },
      { itemName: '바닥청소포', category: 'mop', quantity: 55 },
    ],
  },
  {
    id: 'S2508-007',
    clientId: 'client-001',
    shippedAt: '2025-08-27T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 25 },
      { itemName: '주방앞치마', category: 'apron', quantity: 52 },
      { itemName: '현관매트', category: 'mat', quantity: 28 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 9월 (6건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2509-001',
    clientId: 'client-001',
    shippedAt: '2025-09-03T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 175 },
      { itemName: '바스타올', category: 'towel', quantity: 120 },
      { itemName: '더블시트', category: 'sheet', quantity: 90 },
    ],
  },
  {
    id: 'S2509-002',
    clientId: 'client-002',
    shippedAt: '2025-09-07T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 85 },
      { itemName: '현관매트', category: 'mat', quantity: 16 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 72 },
    ],
  },
  {
    id: 'S2509-003',
    clientId: 'client-003',
    shippedAt: '2025-09-11T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 142 },
      { itemName: '싱글시트', category: 'sheet', quantity: 70 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 20 },
    ],
  },
  {
    id: 'S2509-004',
    clientId: 'client-004',
    shippedAt: '2025-09-16T11:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 150 },
      { itemName: '더블시트', category: 'sheet', quantity: 80 },
      { itemName: '바닥청소포', category: 'mop', quantity: 74 },
    ],
  },
  {
    id: 'S2509-005',
    clientId: 'client-005',
    shippedAt: '2025-09-20T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 65 },
      { itemName: '더블시트', category: 'sheet', quantity: 34 },
      { itemName: '주방앞치마', category: 'apron', quantity: 28 },
    ],
  },
  {
    id: 'S2509-006',
    clientId: 'client-006',
    shippedAt: '2025-09-25T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 128 },
      { itemName: '싱글시트', category: 'sheet', quantity: 72 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 88 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 10월 (8건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2510-001',
    clientId: 'client-001',
    shippedAt: '2025-10-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 182 },
      { itemName: '더블시트', category: 'sheet', quantity: 94 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 110 },
    ],
  },
  {
    id: 'S2510-002',
    clientId: 'client-003',
    shippedAt: '2025-10-05T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 118 },
      { itemName: '싱글시트', category: 'sheet', quantity: 64 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 19 },
    ],
  },
  {
    id: 'S2510-003',
    clientId: 'client-006',
    shippedAt: '2025-10-08T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 138 },
      { itemName: '더블시트', category: 'sheet', quantity: 82 },
      { itemName: '현관매트', category: 'mat', quantity: 26 },
    ],
  },
  {
    id: 'S2510-004',
    clientId: 'client-002',
    shippedAt: '2025-10-12T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 92 },
      { itemName: '주방앞치마', category: 'apron', quantity: 42 },
      { itemName: '바닥청소포', category: 'mop', quantity: 68 },
    ],
  },
  {
    id: 'S2510-005',
    clientId: 'client-004',
    shippedAt: '2025-10-16T09:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 158 },
      { itemName: '싱글시트', category: 'sheet', quantity: 76 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 95 },
    ],
  },
  {
    id: 'S2510-006',
    clientId: 'client-005',
    shippedAt: '2025-10-20T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 72 },
      { itemName: '더블시트', category: 'sheet', quantity: 38 },
      { itemName: '바닥청소포', category: 'mop', quantity: 58 },
    ],
  },
  {
    id: 'S2510-007',
    clientId: 'client-001',
    shippedAt: '2025-10-23T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 27 },
      { itemName: '주방앞치마', category: 'apron', quantity: 54 },
      { itemName: '현관매트', category: 'mat', quantity: 32 },
    ],
  },
  {
    id: 'S2510-008',
    clientId: 'client-003',
    shippedAt: '2025-10-28T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 152 },
      { itemName: '싱글시트', category: 'sheet', quantity: 74 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 90 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 11월 (7건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2511-001',
    clientId: 'client-001',
    shippedAt: '2025-11-03T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 172 },
      { itemName: '바스타올', category: 'towel', quantity: 118 },
      { itemName: '더블시트', category: 'sheet', quantity: 88 },
    ],
  },
  {
    id: 'S2511-002',
    clientId: 'client-002',
    shippedAt: '2025-11-07T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 88 },
      { itemName: '싱글시트', category: 'sheet', quantity: 46 },
      { itemName: '현관매트', category: 'mat', quantity: 17 },
    ],
  },
  {
    id: 'S2511-003',
    clientId: 'client-003',
    shippedAt: '2025-11-10T08:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 148 },
      { itemName: '싱글시트', category: 'sheet', quantity: 72 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 22 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 86 },
    ],
  },
  {
    id: 'S2511-004',
    clientId: 'client-004',
    shippedAt: '2025-11-14T11:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 152 },
      { itemName: '더블시트', category: 'sheet', quantity: 84 },
      { itemName: '바닥청소포', category: 'mop', quantity: 76 },
    ],
  },
  {
    id: 'S2511-005',
    clientId: 'client-005',
    shippedAt: '2025-11-18T09:30:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 68 },
      { itemName: '더블시트', category: 'sheet', quantity: 35 },
      { itemName: '주방앞치마', category: 'apron', quantity: 30 },
    ],
  },
  {
    id: 'S2511-006',
    clientId: 'client-006',
    shippedAt: '2025-11-22T14:00:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 130 },
      { itemName: '싱글시트', category: 'sheet', quantity: 74 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 92 },
    ],
  },
  {
    id: 'S2511-007',
    clientId: 'client-001',
    shippedAt: '2025-11-27T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 24 },
      { itemName: '바닥청소포', category: 'mop', quantity: 82 },
      { itemName: '현관매트', category: 'mat', quantity: 28 },
    ],
  },

  // ════════════════════════════════════════════════════
  // 2025년 12월 (8건)
  // ════════════════════════════════════════════════════
  {
    id: 'S2512-001',
    clientId: 'client-001',
    shippedAt: '2025-12-02T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 185 },
      { itemName: '바스타올', category: 'towel', quantity: 128 },
      { itemName: '더블시트', category: 'sheet', quantity: 96 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 115 },
    ],
  },
  {
    id: 'S2512-002',
    clientId: 'client-003',
    shippedAt: '2025-12-05T10:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 124 },
      { itemName: '싱글시트', category: 'sheet', quantity: 68 },
      { itemName: '직원유니폼', category: 'uniform', quantity: 21 },
    ],
  },
  {
    id: 'S2512-003',
    clientId: 'client-006',
    shippedAt: '2025-12-08T08:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 142 },
      { itemName: '더블시트', category: 'sheet', quantity: 85 },
      { itemName: '현관매트', category: 'mat', quantity: 27 },
    ],
  },
  {
    id: 'S2512-004',
    clientId: 'client-002',
    shippedAt: '2025-12-10T11:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 98 },
      { itemName: '주방앞치마', category: 'apron', quantity: 46 },
      { itemName: '바닥청소포', category: 'mop', quantity: 72 },
    ],
  },
  {
    id: 'S2512-005',
    clientId: 'client-004',
    shippedAt: '2025-12-13T09:30:00',
    items: [
      { itemName: '바스타올', category: 'towel', quantity: 162 },
      { itemName: '싱글시트', category: 'sheet', quantity: 80 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 98 },
    ],
  },
  {
    id: 'S2512-006',
    clientId: 'client-005',
    shippedAt: '2025-12-17T14:00:00',
    items: [
      { itemName: '소형타올', category: 'towel', quantity: 75 },
      { itemName: '더블시트', category: 'sheet', quantity: 40 },
      { itemName: '바닥청소포', category: 'mop', quantity: 60 },
    ],
  },
  {
    id: 'S2512-007',
    clientId: 'client-001',
    shippedAt: '2025-12-20T10:00:00',
    items: [
      { itemName: '직원유니폼', category: 'uniform', quantity: 28 },
      { itemName: '주방앞치마', category: 'apron', quantity: 58 },
      { itemName: '현관매트', category: 'mat', quantity: 34 },
    ],
  },
  {
    id: 'S2512-008',
    clientId: 'client-003',
    shippedAt: '2025-12-27T09:00:00',
    items: [
      { itemName: '대형타올', category: 'towel', quantity: 155 },
      { itemName: '싱글시트', category: 'sheet', quantity: 78 },
      { itemName: '베갯잇', category: 'pillowcase', quantity: 96 },
    ],
  },
];
