export interface ClientMemo {
  id: string;
  clientId: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export const clients = [
  { id: 'client-001', name: '그랜드호텔' },
  { id: 'client-002', name: '오션뷰펜션' },
  { id: 'client-003', name: '제주리조트' },
  { id: 'client-004', name: '힐사이드호텔' },
  { id: 'client-005', name: '선셋펜션' },
  { id: 'client-006', name: '블루라군리조트' },
];

const initialMemos: ClientMemo[] = [
  {
    id: 'memo-001',
    clientId: 'client-001',
    title: '수거 시간 변경 요청',
    content: '다음주 월요일 수거 시간 오전 10시로 변경 부탁드립니다.\n기존 오후 2시에서 오전으로 변경해야 체크인 전 처리가 가능합니다.\n미리 확인해 주시면 감사하겠습니다.',
    isRead: false,
    createdAt: '2025-07-15T09:30:00',
  },
  {
    id: 'memo-002',
    clientId: 'client-002',
    title: '타올 추가 요청',
    content: '타올 추가 50장 필요합니다. 빠른 처리 부탁드려요.\n성수기라 투숙객이 많아 기존 수량으로는 부족합니다.\n가능하면 이번 주 안으로 납품해 주세요.',
    isRead: false,
    createdAt: '2025-07-16T14:20:00',
  },
  {
    id: 'memo-003',
    clientId: 'client-003',
    title: '이번달 청구서 확인 요청',
    content: '이번달 청구서 확인 부탁드립니다.\n금액이 지난달보다 다소 높게 나온 것 같아서요.\n세부 내역 첨부해 주시면 내부 결재 처리하겠습니다.',
    isRead: true,
    createdAt: '2025-07-14T11:00:00',
  },
  {
    id: 'memo-004',
    clientId: 'client-001',
    title: '시트 세탁 품질 불만',
    content: '시트 세탁 상태가 좋지 않습니다. 확인 부탁드립니다.\n일부 시트에 얼룩이 남아 있어 투숙객 컴플레인이 있었습니다.\n재세탁 또는 교체 조치 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-17T08:45:00',
  },
  {
    id: 'memo-005',
    clientId: 'client-004',
    title: '수건 납품 일정 문의',
    content: '이번 주 수건 납품 일정 확인 부탁드립니다.\n호텔 행사로 인해 목요일 이후에는 입고가 어렵습니다.\n수요일까지 가능한지 연락 주세요.',
    isRead: true,
    createdAt: '2025-07-13T16:00:00',
  },
  {
    id: 'memo-006',
    clientId: 'client-005',
    title: '객실 침구류 교체 주기 조정',
    content: '침구류 교체 주기를 주 2회에서 주 3회로 변경 요청드립니다.\n여름 성수기 동안만 한시적으로 적용 원합니다.\n9월부터는 다시 기존 주기로 되돌릴 예정입니다.',
    isRead: false,
    createdAt: '2025-07-18T10:15:00',
  },
  {
    id: 'memo-007',
    clientId: 'client-006',
    title: '특별 세탁물 처리 요청',
    content: '고객 VIP 투숙 관련 특별 세탁물이 있습니다.\n고급 소재(실크 소재 가운 포함)라 세심한 처리 부탁드립니다.\n별도 포장 후 반납해 주시면 감사하겠습니다.',
    isRead: false,
    createdAt: '2025-07-19T07:30:00',
  },
  {
    id: 'memo-008',
    clientId: 'client-002',
    title: '계약 갱신 관련 미팅 요청',
    content: '연간 계약 갱신 시기가 다가와 미팅 요청드립니다.\n이번에는 수거 횟수와 단가 조정에 대해 논의하고 싶습니다.\n편하신 날짜로 알려주시면 일정 맞추겠습니다.',
    isRead: true,
    createdAt: '2025-07-12T13:45:00',
  },
  {
    id: 'memo-009',
    clientId: 'client-003',
    title: '긴급 수거 요청',
    content: '오늘 오후 6시 이전 긴급 수거 요청드립니다.\n단체 행사 종료 후 대량 린넨이 발생했습니다.\n가능 여부 빠르게 확인 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-20T09:00:00',
  },
  {
    id: 'memo-010',
    clientId: 'client-004',
    title: '세탁물 분실 관련 문의',
    content: '지난주 수거 후 반납된 세탁물 중 베개 커버 5장이 누락되었습니다.\n확인 후 회신 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-21T10:30:00',
  },
  {
    id: 'memo-011',
    clientId: 'client-005',
    title: '납품 차량 변경 안내',
    content: '이번 주부터 납품 차량이 변경됩니다.\n기존 1톤 트럭에서 2.5톤으로 교체되니 참고 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-21T13:00:00',
  },
  {
    id: 'memo-012',
    clientId: 'client-006',
    title: '추가 세탁 품목 협의 요청',
    content: '기존 계약 품목 외 커튼 및 카펫 세탁도 가능한지 문의드립니다.\n가능하다면 단가 협의도 함께 진행하고 싶습니다.',
    isRead: false,
    createdAt: '2025-07-22T09:15:00',
  },
  {
    id: 'memo-013',
    clientId: 'client-001',
    title: '세탁 완료 확인 요청',
    content: '어제 수거한 세탁물 완료 예정일 확인 부탁드립니다.\n체크인 일정이 당겨져서 빠른 확인이 필요합니다.',
    isRead: false,
    createdAt: '2025-07-22T11:45:00',
  },
  {
    id: 'memo-014',
    clientId: 'client-002',
    title: '휴무일 수거 가능 여부',
    content: '다음 주 공휴일에도 수거가 가능한지 문의드립니다.\n투숙객이 많아 공휴일 무관하게 수거가 필요한 상황입니다.',
    isRead: false,
    createdAt: '2025-07-23T08:00:00',
  },
  {
    id: 'memo-015',
    clientId: 'client-003',
    title: '단가 인상 관련 협의 요청',
    content: '내달부터 단가 인상이 예정되어 있다는 안내를 받았습니다.\n구체적인 인상 폭과 적용 시기를 협의하고 싶습니다.',
    isRead: false,
    createdAt: '2025-07-23T14:30:00',
  },
  {
    id: 'memo-016',
    clientId: 'client-004',
    title: '린넨 수량 조정 요청',
    content: '객실 증설로 인해 린넨 납품 수량을 기존 대비 30% 늘려야 합니다.\n다음 달부터 적용 가능한지 확인 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-24T09:00:00',
  },
  {
    id: 'memo-017',
    clientId: 'client-005',
    title: '세탁 품질 개선 요청',
    content: '최근 납품된 타올에서 세제 잔여물이 느껴진다는 투숙객 컴플레인이 있었습니다.\n세탁 공정 확인 및 개선 조치 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-24T11:20:00',
  },
  {
    id: 'memo-018',
    clientId: 'client-006',
    title: '수거 요일 변경 요청',
    content: '기존 화·목 수거에서 월·수·금으로 변경 요청드립니다.\n청소 일정이 바뀌어 수거 주기 조정이 필요합니다.',
    isRead: false,
    createdAt: '2025-07-24T14:00:00',
  },
  {
    id: 'memo-019',
    clientId: 'client-001',
    title: '손상 세탁물 보상 요청',
    content: '지난 납품 시 시트 2장에 찢김이 발생하여 반납되었습니다.\n보상 또는 교체 처리 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-25T08:30:00',
  },
  {
    id: 'memo-020',
    clientId: 'client-002',
    title: '계절용 침구 세탁 의뢰',
    content: '겨울 시즌 준비를 위해 보관 중이던 계절용 이불 세탁을 의뢰드립니다.\n총 30채 분량이며 일정 조율 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-25T10:00:00',
  },
  {
    id: 'memo-021',
    clientId: 'client-003',
    title: '납품 시간 단축 요청',
    content: '체크아웃이 오전 11시로 앞당겨졌습니다.\n기존 오후 2시 납품을 오전 10시 이전으로 당겨주실 수 있는지 확인 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-25T13:45:00',
  },
  {
    id: 'memo-022',
    clientId: 'client-004',
    title: '신규 품목 추가 문의',
    content: '욕실 매트와 슬리퍼 세탁도 가능한지 문의드립니다.\n가능하다면 단가와 수거 방법도 안내해 주세요.',
    isRead: true,
    createdAt: '2025-07-26T09:30:00',
  },
  {
    id: 'memo-023',
    clientId: 'client-005',
    title: '세탁 완료 후 포장 방식 변경',
    content: '납품 시 개별 포장 방식을 비닐에서 종이 포장으로 변경 요청드립니다.\n친환경 정책 도입으로 인한 변경입니다.',
    isRead: true,
    createdAt: '2025-07-26T11:00:00',
  },
  {
    id: 'memo-024',
    clientId: 'client-006',
    title: '긴급 추가 수거 요청',
    content: '단체 투숙객 체크아웃으로 인해 오늘 추가 수거가 필요합니다.\n가능 여부 즉시 확인 부탁드립니다.',
    isRead: false,
    createdAt: '2025-07-27T07:00:00',
  },
  {
    id: 'memo-025',
    clientId: 'client-001',
    title: '연간 계약 조건 재검토 요청',
    content: '내년도 연간 계약 갱신을 앞두고 서비스 조건 재검토를 요청드립니다.\n수거 횟수, 납품 시간, 단가 등 전반적인 조건 협의 미팅을 원합니다.',
    isRead: false,
    createdAt: '2025-07-27T10:30:00',
  },
];

function createMemoStore() {
  let memos = $state<ClientMemo[]>(initialMemos);

  return {
    get memos() {
      return memos;
    },
    markRead(id: string) {
      const memo = memos.find((m) => m.id === id);
      if (memo) memo.isRead = true;
    },
    markAllRead() {
      memos.filter((m) => !m.isRead).forEach((m) => {
        m.isRead = true;
      });
    },
    deleteMemo(id: string) {
      memos = memos.filter((m) => m.id !== id);
    },
    getById(id: string): ClientMemo | undefined {
      return memos.find((m) => m.id === id);
    },
  };
}

export const memoStore = createMemoStore();
