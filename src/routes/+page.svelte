<script lang="ts">
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';

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
    { id: 'client-001', name: '그랜드호텔',     businessNo: '123-45-67890', email: 'grand@hotel.com',   managerName: '이담당', managerPhone: '010-1234-5678', hidden: false, createdAt: '2024-01-10' },
    { id: 'client-002', name: '오션뷰펜션',     businessNo: '234-56-78901', email: 'ocean@pension.com', managerName: '최담당', managerPhone: '010-2345-6789', hidden: false, createdAt: '2024-02-01' },
    { id: 'client-003', name: '제주리조트',     businessNo: '345-67-89012', email: 'jeju@resort.com',   managerName: '강담당', managerPhone: '010-3456-7890', hidden: false, createdAt: '2024-03-15' },
    { id: 'client-004', name: '힐사이드호텔',   businessNo: '456-78-90123', email: 'hill@hotel.com',    managerName: '임담당', managerPhone: '010-4567-8901', hidden: false, createdAt: '2024-04-01' },
    { id: 'client-005', name: '선셋펜션',       businessNo: '567-89-01234', email: 'sunset@pension.com',managerName: '오담당', managerPhone: '010-5678-9012', hidden: false, createdAt: '2024-05-20' },
    { id: 'client-006', name: '블루라군리조트', businessNo: '678-90-12345', email: 'blue@resort.com',   managerName: '신담당', managerPhone: '010-6789-0123', hidden: true,  createdAt: '2024-06-10' },
  ]);

  // 숨김 포함 여부 토글
  let showHidden = $state(false);

  // 검색 선택된 거래처 ID ('' 이면 전체)
  let selectedId = $state('');

  // 검색바에 넘길 아이템 목록 (숨김 제외)
  const searchItems = $derived(
    clients
      .filter((c) => !c.hidden)
      .map((c) => ({ id: c.id, label: c.name, sub: c.businessNo }))
  );

  // 테이블에 표시할 목록
  const visibleClients = $derived(
    clients.filter((c) => {
      if (!showHidden && c.hidden) return false;
      if (selectedId) return c.id === selectedId;
      return true;
    })
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
<div class="min-h-screen bg-base-200 px-8 py-6">
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
  <div class="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
    <table class="table table-sm w-full">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold w-[22%]">거래처명</th>
          <th class="text-xs font-bold w-[18%]">사업자번호</th>
          <th class="text-xs font-bold w-[16%]">담당자</th>
          <th class="text-xs font-bold w-[18%]">연락처</th>
          <th class="text-xs font-bold w-[20%]">이메일</th>
          <th class="text-xs font-bold w-[10%]">등록일</th>
          <th class="text-xs font-bold w-[6%] text-center">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if visibleClients.length === 0}
          <tr>
            <td colspan="7" class="py-16 text-center text-base-content/40 text-sm">
              {selectedId ? '선택된 거래처가 없습니다.' : '등록된 거래처가 없습니다.'}
            </td>
          </tr>
        {:else}
          {#each visibleClients as client (client.id)}
            <tr class="hover:bg-base-200 transition-colors {client.hidden ? 'opacity-40' : ''}">
              <td class="font-semibold text-base-content">
                {client.name}
                {#if client.hidden}
                  <span class="badge badge-ghost badge-xs ml-1">숨김</span>
                {/if}
              </td>
              <td class="text-base-content/70">{client.businessNo ?? '—'}</td>
              <td class="text-base-content/70">{client.managerName ?? '—'}</td>
              <td class="text-base-content/70">{client.managerPhone ?? '—'}</td>
              <td class="text-base-content/60 text-xs">{client.email ?? '—'}</td>
              <td class="text-base-content/50 text-xs">{formatDate(client.createdAt)}</td>
              <td>
                <div class="flex items-center justify-center gap-1">
                  {#if client.hidden}
                    <button
                      onclick={() => restoreClient(client.id)}
                      class="btn btn-ghost btn-xs text-success font-semibold"
                    >복원</button>
                  {:else}
                    <button
                      onclick={() => openEdit(client)}
                      class="btn btn-ghost btn-xs text-primary font-semibold"
                    >수정</button>
                    <div class="divider divider-horizontal mx-0 h-4"></div>
                    <button
                      onclick={() => openHide(client.id)}
                      class="btn btn-ghost btn-xs text-warning font-semibold"
                    >숨기기</button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
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
        <h3 class="text-lg font-extrabold text-base-content">
          {editingClient ? '거래처 수정' : '거래처 등록'}
        </h3>
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
