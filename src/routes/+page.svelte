<script lang="ts">
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';

  interface Client {
    id: string;
    name: string;
    businessNo?: string;
    email?: string;
    managerName?: string;
    managerPhone?: string;
    hidden: boolean;
    createdAt: string;
  }

  let clients = $state<Client[]>([
    { id: 'client-001', name: '그랜드호텔',       businessNo: '123-45-67890', email: 'grand@hotel.com',       managerName: '이담당', managerPhone: '010-1234-5678', hidden: false, createdAt: '2024-01-10' },
    { id: 'client-002', name: '오션뷰펜션',       businessNo: '234-56-78901', email: 'ocean@pension.com',     managerName: '최담당', managerPhone: '010-2345-6789', hidden: false, createdAt: '2024-02-01' },
    { id: 'client-003', name: '제주리조트',       businessNo: '345-67-89012', email: 'jeju@resort.com',       managerName: '강담당', managerPhone: '010-3456-7890', hidden: false, createdAt: '2024-03-15' },
    { id: 'client-004', name: '힐사이드호텔',     businessNo: '456-78-90123', email: 'hill@hotel.com',        managerName: '임담당', managerPhone: '010-4567-8901', hidden: false, createdAt: '2024-04-01' },
    { id: 'client-005', name: '선셋펜션',         businessNo: '567-89-01234', email: 'sunset@pension.com',    managerName: '오담당', managerPhone: '010-5678-9012', hidden: false, createdAt: '2024-05-20' },
    { id: 'client-006', name: '블루라군리조트',   businessNo: '678-90-12345', email: 'blue@resort.com',       managerName: '신담당', managerPhone: '010-6789-0123', hidden: true,  createdAt: '2024-06-10' },
    { id: 'client-007', name: '스카이파크호텔',   businessNo: '789-01-23456', email: 'sky@hotel.com',         managerName: '권담당', managerPhone: '010-7890-1234', hidden: false, createdAt: '2024-07-03' },
    { id: 'client-008', name: '솔밭펜션',         businessNo: '890-12-34567', email: 'sol@pension.com',       managerName: '배담당', managerPhone: '010-8901-2345', hidden: false, createdAt: '2024-07-15' },
    { id: 'client-009', name: '해운대리조트',     businessNo: '901-23-45678', email: 'haeundae@resort.com',   managerName: '조담당', managerPhone: '010-9012-3456', hidden: false, createdAt: '2024-08-01' },
    { id: 'client-010', name: '경복궁호텔',       businessNo: '012-34-56789', email: 'gyeong@hotel.com',      managerName: '전담당', managerPhone: '010-0123-4567', hidden: false, createdAt: '2024-08-20' },
    { id: 'client-011', name: '나무아래펜션',     businessNo: '111-22-33333', email: 'tree@pension.com',      managerName: '고담당', managerPhone: '010-1111-2222', hidden: false, createdAt: '2024-09-05' },
    { id: 'client-012', name: '한라산리조트',     businessNo: '222-33-44444', email: 'halla@resort.com',      managerName: '문담당', managerPhone: '010-2222-3333', hidden: false, createdAt: '2024-09-18' },
    { id: 'client-013', name: '롯데시티호텔',     businessNo: '333-44-55555', email: 'lotte@hotel.com',       managerName: '양담당', managerPhone: '010-3333-4444', hidden: false, createdAt: '2024-10-02' },
    { id: 'client-014', name: '바다내음펜션',     businessNo: '444-55-66666', email: 'sea@pension.com',       managerName: '손담당', managerPhone: '010-4444-5555', hidden: false, createdAt: '2024-10-14' },
    { id: 'client-015', name: '설악워터피아',     businessNo: '555-66-77777', email: 'seorak@resort.com',     managerName: '백담당', managerPhone: '010-5555-6666', hidden: false, createdAt: '2024-11-01' },
    { id: 'client-016', name: '노보텔앰배서더',   businessNo: '666-77-88888', email: 'novotel@hotel.com',     managerName: '허담당', managerPhone: '010-6666-7777', hidden: false, createdAt: '2024-11-11' },
    { id: 'client-017', name: '산들바람펜션',     businessNo: '777-88-99999', email: 'wind@pension.com',      managerName: '남담당', managerPhone: '010-7777-8888', hidden: true,  createdAt: '2024-11-25' },
    { id: 'client-018', name: '비발디파크',       businessNo: '888-99-00000', email: 'vivaldi@resort.com',    managerName: '심담당', managerPhone: '010-8888-9999', hidden: false, createdAt: '2024-12-01' },
    { id: 'client-019', name: '파라다이스호텔',   businessNo: '999-00-11111', email: 'paradise@hotel.com',    managerName: '류담당', managerPhone: '010-9999-0000', hidden: false, createdAt: '2024-12-10' },
    { id: 'client-020', name: '초록숲펜션',       businessNo: '101-11-22222', email: 'forest@pension.com',    managerName: '구담당', managerPhone: '010-1010-2020', hidden: false, createdAt: '2024-12-20' },
    { id: 'client-021', name: '워커힐호텔',       businessNo: '202-22-33333', email: 'walkerhill@hotel.com',  managerName: '하담당', managerPhone: '010-2020-3030', hidden: false, createdAt: '2025-01-05' },
    { id: 'client-022', name: '동해안리조트',     businessNo: '303-33-44444', email: 'east@resort.com',       managerName: '주담당', managerPhone: '010-3030-4040', hidden: false, createdAt: '2025-01-15' },
    { id: 'client-023', name: '소나무펜션',       businessNo: '404-44-55555', email: 'pine@pension.com',      managerName: '두담당', managerPhone: '010-4040-5050', hidden: false, createdAt: '2025-02-01' },
    { id: 'client-024', name: '인터컨티넨탈',     businessNo: '505-55-66666', email: 'intercont@hotel.com',   managerName: '마담당', managerPhone: '010-5050-6060', hidden: false, createdAt: '2025-02-14' },
    { id: 'client-025', name: '남해금산리조트',   businessNo: '606-66-77777', email: 'namhae@resort.com',     managerName: '바담당', managerPhone: '010-6060-7070', hidden: false, createdAt: '2025-03-01' },
  ]);

  // 숨김 포함 여부 토글
  let showHidden = $state(false);

  // 검색 선택된 거래처 ID ('' 이면 전체)
  let selectedId = $state('');

  // 페이지네이션
  const PAGE_SIZE = 10;
  let currentPage = $state(1);

  // 검색바에 넘길 아이템 목록 (숨김 제외)
  const searchItems = $derived(
    clients
      .filter((c) => !c.hidden)
      .map((c) => ({ id: c.id, label: c.name, sub: c.businessNo }))
  );

  // 필터 적용된 전체 목록
  const filteredClients = $derived(
    clients.filter((c) => {
      if (!showHidden && c.hidden) return false;
      if (selectedId) return c.id === selectedId;
      return true;
    })
  );

  // 선택/필터 바뀌면 1페이지로
  $effect(() => {
    selectedId; showHidden;
    currentPage = 1;
  });

  const totalPages = $derived(Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE)));

  // 현재 페이지에 표시할 목록
  const visibleClients = $derived(
    filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  );

  function formatDate(iso: string) {
    return iso.slice(0, 10);
  }

  // ──────────── 모달 ────────────
  let showModal     = $state(false);
  let editingClient = $state<Client | null>(null);
  let formName         = $state('');
  let formBusinessNo   = $state('');
  let formEmail        = $state('');
  let formManagerName  = $state('');
  let formManagerPhone = $state('');

  function openAdd() {
    editingClient    = null;
    formName         = '';
    formBusinessNo   = '';
    formEmail        = '';
    formManagerName  = '';
    formManagerPhone = '';
    showModal        = true;
  }

  function openEdit(client: Client) {
    editingClient    = client;
    formName         = client.name;
    formBusinessNo   = client.businessNo   ?? '';
    formEmail        = client.email        ?? '';
    formManagerName  = client.managerName  ?? '';
    formManagerPhone = client.managerPhone ?? '';
    showModal        = true;
  }

  function closeModal() { showModal = false; }

  function handleSave() {
    if (!formName.trim()) return;
    const payload = {
      name:         formName.trim(),
      businessNo:   formBusinessNo.trim()   || undefined,
      email:        formEmail.trim()        || undefined,
      managerName:  formManagerName.trim()  || undefined,
      managerPhone: formManagerPhone.trim() || undefined,
    };
    if (editingClient) {
      const idx = clients.findIndex((c) => c.id === editingClient!.id);
      if (idx !== -1) clients[idx] = { ...clients[idx], ...payload };
    } else {
      clients.push({
        ...payload,
        id: crypto.randomUUID(),
        hidden: false,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
    closeModal();
  }

  // ──────────── 숨기기 확인 ────────────
  let hideTargetId = $state<string | null>(null);
  function openHide(id: string)  { hideTargetId = id; }
  function confirmHide() {
    if (hideTargetId) {
      const idx = clients.findIndex((c) => c.id === hideTargetId);
      if (idx !== -1) clients[idx].hidden = true;
      if (selectedId === hideTargetId) selectedId = '';
    }
    hideTargetId = null;
  }
  function cancelHide() { hideTargetId = null; }

  // 숨김 복원
  function restoreClient(id: string) {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx !== -1) clients[idx].hidden = false;
  }
</script>

<!-- ───────────────────────────── 메인 컨텐츠 ───────────────────────────── -->
<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">거래처 관리</h2>

  <!-- 검색 / 숨김 토글 / 등록 버튼 바 -->
  <div class="flex items-center gap-3 mb-5">

    <!-- 검색바 컴포넌트 -->
    <SearchBar
      placeholder="거래처명, 사업자번호 검색..."
      items={searchItems}
      onselect={(id) => (selectedId = id)}
      class="w-72"
    />

    <!-- 숨김 목록 포함 토글 -->
    <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 font-semibold">
      <input
        type="checkbox"
        bind:checked={showHidden}
        class="checkbox checkbox-sm"
      />
      숨김 포함
    </label>

    <div class="flex-1"></div>

    <!-- 거래처 등록 버튼 -->
    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap">
      <Icon icon="lucide:plus" class="w-4 h-4" />
      거래처 등록
    </button>
  </div>

  <!-- 거래처 테이블 -->
  <!-- table-sm 행 높이 ~36px × 10행 + thead ~36px = 396px -->
  <div class="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold">거래처명</th>
          <th class="text-xs font-bold hidden xl:table-cell w-[16%]">사업자번호</th>
          <th class="text-xs font-bold hidden lg:table-cell w-[12%]">담당자</th>
          <th class="text-xs font-bold w-[16%]">연락처</th>
          <th class="text-xs font-bold hidden xl:table-cell w-[20%]">이메일</th>
          <th class="text-xs font-bold hidden lg:table-cell w-[9%] whitespace-nowrap">등록일</th>
          <th class="text-xs font-bold text-center whitespace-nowrap w-[5%]">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredClients.length === 0}
          <tr>
            <td colspan="7" class="py-16 text-center text-base-content/40 text-sm">
              {selectedId ? '선택된 거래처가 없습니다.' : '등록된 거래처가 없습니다.'}
            </td>
          </tr>
        {:else}
          {#each visibleClients as client (client.id)}
            <tr class="hover:bg-base-200 transition-colors {client.hidden ? 'opacity-40' : ''}">
              <td class="font-semibold text-base-content">
                <span>{client.name}</span>
                {#if client.hidden}
                  <span class="badge badge-ghost badge-xs ml-1">숨김</span>
                {/if}
                <!-- lg 미만: 담당자·등록일 인라인 표시 -->
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {#if client.managerPhone}
                    <span class="text-xs text-base-content/50">{client.managerPhone}</span>
                  {/if}
                  <span class="text-xs text-base-content/30">{formatDate(client.createdAt)}</span>
                </div>
              </td>
              <td class="text-base-content/70 text-sm hidden xl:table-cell">{client.businessNo ?? '—'}</td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{client.managerName ?? '—'}</td>
              <td class="text-base-content/70 text-sm">{client.managerPhone ?? '—'}</td>
              <td class="text-base-content/60 text-xs hidden xl:table-cell">{client.email ?? '—'}</td>
              <td class="text-base-content/50 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(client.createdAt)}</td>
              <td>
                <div class="flex items-center justify-center">
                  <button
                    onclick={() => openEdit(client)}
                    class="btn btn-ghost btn-xs text-primary font-semibold"
                  >
                    {client.hidden ? '복원·수정' : '수정'}
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- 페이지네이션 -->
  <div class="mt-4">
    <Pagination
      {currentPage}
      {totalPages}
      totalItems={filteredClients.length}
      pageSize={PAGE_SIZE}
      onpage={(p) => (currentPage = p)}
    />
  </div>
</div>

<!-- ───────────────────────── 거래처 등록/수정 모달 ───────────────────────── -->
{#if showModal}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
  >
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 520px;">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-extrabold text-base-content">
            {editingClient ? '거래처 수정' : '거래처 등록'}
          </h3>
          {#if editingClient}
            {#if editingClient.hidden}
              <button
                type="button"
                onclick={() => { restoreClient(editingClient!.id); closeModal(); }}
                class="btn btn-xs btn-success gap-1 font-bold"
              >
                <Icon icon="lucide:eye" class="w-3.5 h-3.5" />
                복원
              </button>
            {:else}
              <button
                type="button"
                onclick={() => { openHide(editingClient!.id); closeModal(); }}
                class="btn btn-xs btn-warning gap-1 font-bold"
              >
                <Icon icon="lucide:eye-off" class="w-3.5 h-3.5" />
                숨기기
              </button>
            {/if}
          {/if}
        </div>
        <button
          onclick={closeModal}
          aria-label="닫기"
          class="btn btn-ghost btn-sm btn-circle"
        >
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- 폼 (스크롤 영역) -->
      <form
        onsubmit={(e) => { e.preventDefault(); handleSave(); }}
        class="flex flex-col flex-1 overflow-hidden"
      >
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">

          <!-- 거래처명 -->
          <div>
            <label for="cName" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">거래처명 *</span>
            </label>
            <input
              id="cName"
              type="text"
              bind:value={formName}
              placeholder="예) 그랜드 호텔"
              class="input input-bordered w-full text-sm"
            />
          </div>

          <!-- 사업자번호 -->
          <div>
            <label for="cBizNo" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">사업자번호</span>
            </label>
            <input
              id="cBizNo"
              type="text"
              bind:value={formBusinessNo}
              placeholder="000-00-00000"
              class="input input-bordered w-full text-sm"
            />
          </div>

          <!-- 거래처 이메일 -->
          <div>
            <label for="cEmail" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">거래처 이메일</span>
            </label>
            <input
              id="cEmail"
              type="email"
              bind:value={formEmail}
              placeholder="info@hotel.com"
              class="input input-bordered w-full text-sm"
            />
          </div>

          <!-- 담당자명 + 연락처 (2열) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cMgrName" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">담당자명</span>
              </label>
              <input
                id="cMgrName"
                type="text"
                bind:value={formManagerName}
                placeholder="홍길동"
                class="input input-bordered w-full text-sm"
              />
            </div>
            <div>
              <label for="cMgrPhone" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">담당자 연락처</span>
              </label>
              <input
                id="cMgrPhone"
                type="text"
                bind:value={formManagerPhone}
                placeholder="010-0000-0000"
                class="input input-bordered w-full text-sm"
              />
            </div>
          </div>
        </div>

        <!-- 모달 액션 버튼 -->
        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0">
          <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
          <button type="submit" class="btn btn-primary font-bold">
            {editingClient ? '저장' : '등록'}
          </button>
        </div>
      </form>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────────── 숨기기 확인 모달 ───────────────────────────── -->
{#if hideTargetId}
  {@const target = clients.find((c) => c.id === hideTargetId)}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) cancelHide(); }}
  >
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">거래처 숨기기</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-warning">{target?.name}</span> 거래처를 숨기시겠습니까?<br />
        <span class="text-xs text-base-content/40">숨긴 거래처는 목록에서 보이지 않으며, 언제든 복원할 수 있습니다.</span>
      </p>
      <div class="modal-action">
        <button onclick={cancelHide} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmHide} class="btn btn-warning font-bold">숨기기</button>
      </div>
    </div>
  </dialog>
{/if}
