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
