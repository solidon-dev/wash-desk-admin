<script lang="ts">
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';

  interface ClientMemo {
    id: string;
    clientId: string;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: string;
  }

  const clients = [
    { id: 'client-001', name: '그랜드호텔' },
    { id: 'client-002', name: '오션뷰펜션' },
    { id: 'client-003', name: '제주리조트' },
    { id: 'client-004', name: '힐사이드호텔' },
    { id: 'client-005', name: '선셋펜션' },
    { id: 'client-006', name: '블루라군리조트' },
  ];

  let memos = $state<ClientMemo[]>([
    { id: 'memo-001', clientId: 'client-001', title: '수거 시간 변경 요청', content: '다음주 월요일 수거 시간 오전 10시로 변경 부탁드립니다.\n기존 오후 2시에서 오전으로 변경해야 체크인 전 처리가 가능합니다.\n미리 확인해 주시면 감사하겠습니다.', isRead: false, createdAt: '2025-07-15T09:30:00' },
    { id: 'memo-002', clientId: 'client-002', title: '타올 추가 요청', content: '타올 추가 50장 필요합니다. 빠른 처리 부탁드려요.\n성수기라 투숙객이 많아 기존 수량으로는 부족합니다.\n가능하면 이번 주 안으로 납품해 주세요.', isRead: false, createdAt: '2025-07-16T14:20:00' },
    { id: 'memo-003', clientId: 'client-003', title: '이번달 청구서 확인 요청', content: '이번달 청구서 확인 부탁드립니다.\n금액이 지난달보다 다소 높게 나온 것 같아서요.\n세부 내역 첨부해 주시면 내부 결재 처리하겠습니다.', isRead: true, createdAt: '2025-07-14T11:00:00' },
    { id: 'memo-004', clientId: 'client-001', title: '시트 세탁 품질 불만', content: '시트 세탁 상태가 좋지 않습니다. 확인 부탁드립니다.\n일부 시트에 얼룩이 남아 있어 투숙객 컴플레인이 있었습니다.\n재세탁 또는 교체 조치 부탁드립니다.', isRead: false, createdAt: '2025-07-17T08:45:00' },
    { id: 'memo-005', clientId: 'client-004', title: '수건 납품 일정 문의', content: '이번 주 수건 납품 일정 확인 부탁드립니다.\n호텔 행사로 인해 목요일 이후에는 입고가 어렵습니다.\n수요일까지 가능한지 연락 주세요.', isRead: true, createdAt: '2025-07-13T16:00:00' },
    { id: 'memo-006', clientId: 'client-005', title: '객실 침구류 교체 주기 조정', content: '침구류 교체 주기를 주 2회에서 주 3회로 변경 요청드립니다.\n여름 성수기 동안만 한시적으로 적용 원합니다.\n9월부터는 다시 기존 주기로 되돌릴 예정입니다.', isRead: false, createdAt: '2025-07-18T10:15:00' },
    { id: 'memo-007', clientId: 'client-006', title: '특별 세탁물 처리 요청', content: '고객 VIP 투숙 관련 특별 세탁물이 있습니다.\n고급 소재(실크 소재 가운 포함)라 세심한 처리 부탁드립니다.\n별도 포장 후 반납해 주시면 감사하겠습니다.', isRead: false, createdAt: '2025-07-19T07:30:00' },
    { id: 'memo-008', clientId: 'client-002', title: '계약 갱신 관련 미팅 요청', content: '연간 계약 갱신 시기가 다가와 미팅 요청드립니다.\n이번에는 수거 횟수와 단가 조정에 대해 논의하고 싶습니다.\n편하신 날짜로 알려주시면 일정 맞추겠습니다.', isRead: true, createdAt: '2025-07-12T13:45:00' },
    { id: 'memo-009', clientId: 'client-003', title: '긴급 수거 요청', content: '오늘 오후 6시 이전 긴급 수거 요청드립니다.\n단체 행사 종료 후 대량 린넨이 발생했습니다.\n가능 여부 빠르게 확인 부탁드립니다.', isRead: false, createdAt: '2025-07-20T09:00:00' },
    { id: 'memo-010', clientId: 'client-004', title: '세탁물 분실 관련 문의', content: '지난주 수거 후 반납된 세탁물 중 베개 커버 5장이 누락되었습니다.\n확인 후 회신 부탁드립니다.', isRead: false, createdAt: '2025-07-21T10:30:00' },
    { id: 'memo-011', clientId: 'client-005', title: '납품 차량 변경 안내', content: '이번 주부터 납품 차량이 변경됩니다.\n기존 1톤 트럭에서 2.5톤으로 교체되니 참고 부탁드립니다.', isRead: false, createdAt: '2025-07-21T13:00:00' },
    { id: 'memo-012', clientId: 'client-006', title: '추가 세탁 품목 협의 요청', content: '기존 계약 품목 외 커튼 및 카펫 세탁도 가능한지 문의드립니다.\n가능하다면 단가 협의도 함께 진행하고 싶습니다.', isRead: false, createdAt: '2025-07-22T09:15:00' },
    { id: 'memo-013', clientId: 'client-001', title: '세탁 완료 확인 요청', content: '어제 수거한 세탁물 완료 예정일 확인 부탁드립니다.\n체크인 일정이 당겨져서 빠른 확인이 필요합니다.', isRead: false, createdAt: '2025-07-22T11:45:00' },
    { id: 'memo-014', clientId: 'client-002', title: '휴무일 수거 가능 여부', content: '다음 주 공휴일에도 수거가 가능한지 문의드립니다.\n투숙객이 많아 공휴일 무관하게 수거가 필요한 상황입니다.', isRead: false, createdAt: '2025-07-23T08:00:00' },
    { id: 'memo-015', clientId: 'client-003', title: '단가 인상 관련 협의 요청', content: '내달부터 단가 인상이 예정되어 있다는 안내를 받았습니다.\n구체적인 인상 폭과 적용 시기를 협의하고 싶습니다.', isRead: false, createdAt: '2025-07-23T14:30:00' },
    { id: 'memo-016', clientId: 'client-004', title: '린넨 수량 조정 요청', content: '객실 증설로 인해 린넨 납품 수량을 기존 대비 30% 늘려야 합니다.\n다음 달부터 적용 가능한지 확인 부탁드립니다.', isRead: false, createdAt: '2025-07-24T09:00:00' },
    { id: 'memo-017', clientId: 'client-005', title: '세탁 품질 개선 요청', content: '최근 납품된 타올에서 세제 잔여물이 느껴진다는 투숙객 컴플레인이 있었습니다.\n세탁 공정 확인 및 개선 조치 부탁드립니다.', isRead: false, createdAt: '2025-07-24T11:20:00' },
    { id: 'memo-018', clientId: 'client-006', title: '수거 요일 변경 요청', content: '기존 화·목 수거에서 월·수·금으로 변경 요청드립니다.\n청소 일정이 바뀌어 수거 주기 조정이 필요합니다.', isRead: false, createdAt: '2025-07-24T14:00:00' },
    { id: 'memo-019', clientId: 'client-001', title: '손상 세탁물 보상 요청', content: '지난 납품 시 시트 2장에 찢김이 발생하여 반납되었습니다.\n보상 또는 교체 처리 부탁드립니다.', isRead: false, createdAt: '2025-07-25T08:30:00' },
    { id: 'memo-020', clientId: 'client-002', title: '계절용 침구 세탁 의뢰', content: '겨울 시즌 준비를 위해 보관 중이던 계절용 이불 세탁을 의뢰드립니다.\n총 30채 분량이며 일정 조율 부탁드립니다.', isRead: false, createdAt: '2025-07-25T10:00:00' },
  ]);

  // 읽음 처리
  function markRead(id: string) {
    const memo = memos.find((m) => m.id === id);
    if (memo) memo.isRead = true;
  }

  function markAllRead() {
    memos.filter((m) => !m.isRead).forEach((m) => { m.isRead = true; });
  }

  function deleteMemo(id: string) {
    memos = memos.filter((m) => m.id !== id);
  }

  // 검색
  let selectedId = $state('');
  const searchItems = $derived(
    memos.map((m) => ({
      id: m.id,
      label: clients.find((c) => c.id === m.clientId)?.name ?? '알 수 없음',
      sub: m.title,
    }))
  );

  // 필터
  let statusFilter = $state<'all' | 'unread' | 'read'>('unread');
  let clientFilter = $state<string>('all');

  const unreadCount = $derived(memos.filter((m) => !m.isRead).length);

  const filteredMemos = $derived(
    memos.filter((m) => {
      if (selectedId) return m.id === selectedId;
      const matchStatus =
        statusFilter === 'all' ? true : statusFilter === 'unread' ? !m.isRead : m.isRead;
      const matchClient = clientFilter === 'all' || m.clientId === clientFilter;
      return matchStatus && matchClient;
    })
  );

  // 페이지네이션
  const PAGE_SIZE = 10;
  let currentPage = $state(1);
  $effect(() => { selectedId; statusFilter; clientFilter; currentPage = 1; });

  const totalPages = $derived(Math.max(1, Math.ceil(filteredMemos.length / PAGE_SIZE)));
  const visibleMemos = $derived(
    filteredMemos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  );

  function getClientName(clientId: string) {
    return clients.find((c) => c.id === clientId)?.name ?? '알 수 없음';
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  }

  function truncate(text: string, len = 40) {
    return text.length > len ? text.slice(0, len) + '…' : text;
  }

  // 상세 모달
  let viewingMemo = $state<ClientMemo | null>(null);

  function openMemo(memo: ClientMemo) {
    viewingMemo = memo;
  }

  function closeModal() {
    viewingMemo = null;
  }

  function confirmRead() {
    if (viewingMemo) markRead(viewingMemo.id);
    viewingMemo = null;
  }

  // 삭제 확인
  let deleteTargetId = $state<string | null>(null);

  function confirmDelete() {
    if (deleteTargetId) {
      deleteMemo(deleteTargetId);
      deleteTargetId = null;
      viewingMemo = null;
    }
  }
</script>

<!-- ───────────────────────────── 메인 컨텐츠 ───────────────────────────── -->
<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">
    메모 확인
    {#if unreadCount > 0}
      <span class="badge badge-primary font-bold ml-2">{unreadCount}</span>
    {/if}
  </h2>

  <!-- 검색 / 필터 / 버튼 바 -->
  <div class="flex flex-wrap items-center gap-3 mb-5">

    <!-- 검색바 컴포넌트 -->
    <SearchBar
      placeholder="거래처명, 제목 검색..."
      items={searchItems}
      onselect={(id) => (selectedId = id)}
      class="w-64 sm:w-72"
    />

    <!-- 상태 필터 탭 -->
    <div class="flex items-center gap-1">
      {#each ([
        { value: 'all',    label: '전체'    },
        { value: 'unread', label: '읽지않음' },
        { value: 'read',   label: '읽음'    },
      ] as const) as f (f.value)}
        <button
          class="btn btn-sm {statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}"
          onclick={() => { statusFilter = f.value; selectedId = ''; }}
        >
          {f.label}
        </button>
      {/each}
    </div>

    <!-- 거래처 필터 -->
    <select
      class="select select-bordered select-sm"
      bind:value={clientFilter}
      onchange={() => (selectedId = '')}
    >
      <option value="all">전체 거래처</option>
      {#each clients as client (client.id)}
        <option value={client.id}>{client.name}</option>
      {/each}
    </select>

    <!-- 전체 읽음 버튼 (항상 오른쪽 끝) -->
    <button
      class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto sm:w-auto w-full"
      disabled={unreadCount === 0}
      onclick={markAllRead}
    >
      <Icon icon="lucide:check-check" class="w-4 h-4" />
      <span class="hidden sm:inline">전체 읽음</span>
      <span class="sm:hidden">전체 읽음</span>
    </button>
  </div>

  <!-- 메모 테이블 -->
  <!-- table-sm 행 높이 ~36px × 10행 + thead ~36px = 396px -->
  <TableCard>
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold
            w-[62%] sm:w-[22%] lg:w-[18%]">거래처명</th>
          <th class="text-xs font-bold hidden sm:table-cell">제목</th>
          <th class="text-xs font-bold hidden lg:table-cell whitespace-nowrap
            lg:w-[16%]">날짜</th>
          <th class="text-xs font-bold text-center whitespace-nowrap
            w-[38%] sm:w-[10%] lg:w-[7%]">상태</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredMemos.length === 0}
          <tr>
            <td colspan="4" class="py-16 text-center text-base-content/40 text-sm">
              {selectedId ? '선택된 메모가 없습니다.' : '메모가 없습니다.'}
            </td>
          </tr>
        {:else}
          {#each visibleMemos as memo (memo.id)}
            <tr class="cursor-pointer hover:bg-base-200 transition-colors {memo.isRead ? 'opacity-40' : ''}" onclick={() => openMemo(memo)}>
              <td class="font-semibold text-base-content">
                <span>{getClientName(memo.clientId)}</span>
                <!-- sm 미만: 제목·날짜 인라인 표시 -->
                <div class="sm:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span class="text-xs text-base-content/50">{truncate(memo.title || memo.content, 20)}</span>
                  <span class="text-xs text-base-content/30">{formatDate(memo.createdAt)}</span>
                </div>
              </td>
              <td class="text-base-content/70 text-sm hidden sm:table-cell {!memo.isRead ? 'font-semibold text-base-content' : ''}">
                {truncate(memo.title || memo.content)}
              </td>
              <td class="text-base-content/50 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(memo.createdAt)}</td>
              <td>
                <div class="flex items-center justify-center">
                  {#if memo.isRead}
                    <button class="btn btn-ghost btn-xs text-base-content/30 font-semibold" onclick={(e) => e.stopPropagation()}>
                      <Icon icon="lucide:check" class="w-4 h-4" />
                    </button>
                  {:else}
                    <button class="btn btn-ghost btn-xs text-primary font-semibold" onclick={(e) => e.stopPropagation()}>
                      <Icon icon="lucide:circle" class="w-3 h-3" />
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </TableCard>

  <!-- 페이지네이션 -->
  <div class="mt-4">
    <Pagination
      {currentPage}
      {totalPages}
      totalItems={filteredMemos.length}
      pageSize={PAGE_SIZE}
      onpage={(p) => (currentPage = p)}
    />
  </div>
</div>

<!-- ───────────────────────── 상세 모달 ───────────────────────── -->
{#if viewingMemo}
  {@const memo = viewingMemo}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
  >
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 600px;">
      <!-- 모달 헤더 -->
      <div class="flex items-start justify-between mb-4 shrink-0">
        <div>
          <p class="text-xs font-bold text-base-content/40 uppercase tracking-wide mb-1">{getClientName(memo.clientId)}</p>
          <h3 class="text-lg font-extrabold text-base-content leading-snug">{memo.title}</h3>
        </div>
        <div class="flex items-center gap-1 shrink-0 ml-3">
          <button
            onclick={() => { deleteTargetId = memo.id; }}
            aria-label="삭제"
            class="btn btn-ghost btn-sm btn-circle text-error"
          >
            <Icon icon="lucide:trash-2" class="w-4 h-4" />
          </button>
          <button onclick={closeModal} aria-label="닫기" class="btn btn-ghost btn-sm btn-circle">
            <Icon icon="lucide:x" class="w-5 h-5" />
          </button>
        </div>
      </div>
      <p class="text-xs text-base-content/40 mb-4 shrink-0">
        <Icon icon="lucide:clock" class="w-3.5 h-3.5 inline mr-1" />{formatDate(memo.createdAt)}
      </p>
      <div class="divider my-0 shrink-0"></div>
      <div class="flex-1 overflow-y-auto py-4 text-sm text-base-content leading-relaxed whitespace-pre-wrap">
        {memo.content}
      </div>
      <div class="divider my-0 shrink-0"></div>
      <div class="flex justify-end items-center pt-4 shrink-0">
        <button onclick={closeModal} class="btn btn-ghost btn-sm font-bold">닫기</button>
        <button onclick={confirmRead} class="btn btn-primary btn-sm font-bold ml-2">확인</button>
      </div>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────── 삭제 확인 모달 ───────────────────────── -->
{#if deleteTargetId}
  {@const target = memos.find((m) => m.id === deleteTargetId)}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) deleteTargetId = null; }}
  >
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">메모 삭제</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-error">{target?.title}</span> 메모를 삭제하시겠습니까?<br />
        <span class="text-xs text-base-content/40">이 작업은 되돌릴 수 없습니다.</span>
      </p>
      <div class="modal-action">
        <button onclick={() => (deleteTargetId = null)} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmDelete} class="btn btn-error font-bold">삭제</button>
      </div>
    </div>
  </dialog>
{/if}
