<script lang="ts">
  import Icon from '@iconify/svelte';

  type ClientType = 'hotel' | 'pension' | 'resort' | 'etc';
  interface Client {
    id: string;
    name: string;
    type: ClientType;
    address: string;
    phone?: string;
    businessNo?: string;
    ownerName?: string;
    email?: string;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    memo?: string;
    createdAt: string;
  }

  let clients = $state<Client[]>([
    { id: 'client-001', name: '그랜드호텔',    type: 'hotel',   address: '서울시 중구',    phone: '02-1111-2222', businessNo: '123-45-67890', ownerName: '김대표', managerName: '이담당', managerPhone: '010-1234-5678', memo: '', createdAt: '2024-01-10' },
    { id: 'client-002', name: '오션뷰펜션',    type: 'pension', address: '강원도 강릉시',  phone: '033-222-3333', businessNo: '234-56-78901', ownerName: '박사장', managerName: '최담당', managerPhone: '010-2345-6789', memo: '', createdAt: '2024-02-01' },
    { id: 'client-003', name: '제주리조트',    type: 'resort',  address: '제주시 애월읍',  phone: '064-333-4444', businessNo: '345-67-89012', ownerName: '정대표', managerName: '강담당', managerPhone: '010-3456-7890', memo: '', createdAt: '2024-03-15' },
    { id: 'client-004', name: '힐사이드호텔',  type: 'hotel',   address: '경기도 가평군',  phone: '031-444-5555', businessNo: '456-78-90123', ownerName: '윤사장', managerName: '임담당', managerPhone: '010-4567-8901', memo: '', createdAt: '2024-04-01' },
    { id: 'client-005', name: '선셋펜션',      type: 'pension', address: '전남 여수시',    phone: '061-555-6666', businessNo: '567-89-01234', ownerName: '한대표', managerName: '오담당', managerPhone: '010-5678-9012', memo: '', createdAt: '2024-05-20' },
    { id: 'client-006', name: '블루라군리조트', type: 'resort',  address: '경남 거제시',    phone: '055-666-7777', businessNo: '678-90-12345', ownerName: '서사장', managerName: '신담당', managerPhone: '010-6789-0123', memo: '', createdAt: '2024-06-10' },
  ]);

  let searchQuery = $state('');
  let typeFilter = $state('all');

  const typeFilters = [
    { value: 'all',     label: '전체'   },
    { value: 'hotel',   label: '호텔'   },
    { value: 'pension', label: '펜션'   },
    { value: 'resort',  label: '리조트' },
    { value: 'etc',     label: '기타'   },
  ];

  const filteredClients = $derived(
    clients.filter((c) => {
      const matchType   = typeFilter === 'all' || c.type === typeFilter;
      const q           = searchQuery.trim().toLowerCase();
      const matchSearch = !q
        || c.name.toLowerCase().includes(q)
        || (c.ownerName   ?? '').toLowerCase().includes(q)
        || (c.managerName ?? '').toLowerCase().includes(q)
        || (c.businessNo  ?? '').toLowerCase().includes(q)
        || (c.phone       ?? '').toLowerCase().includes(q);
      return matchType && matchSearch;
    })
  );

  const typeLabel = {
    hotel:   '호텔',
    pension: '펜션',
    resort:  '리조트',
    etc:     '기타',
  };

  const typeBadge = {
    hotel:   'badge-info',
    pension: 'badge-success',
    resort:  'badge-warning',
    etc:     'badge-ghost',
  };

  function formatDate(iso: string) {
    return iso.slice(0, 10);
  }

  let showTypeDropdown = $state(false);
  let showModal        = $state(false);
  let editingClient = $state<Client | null>(null);
  let formName         = $state('');
  let formType         = $state<ClientType>('hotel');
  let formAddress      = $state('');
  let formPhone        = $state('');
  let formBusinessNo   = $state('');
  let formOwnerName    = $state('');
  let formEmail        = $state('');
  let formManagerName  = $state('');
  let formManagerPhone = $state('');
  let formManagerEmail = $state('');
  let formMemo         = $state('');

  function openAdd() {
    editingClient    = null;
    formName         = '';
    formType         = 'hotel';
    formAddress      = '';
    formPhone        = '';
    formBusinessNo   = '';
    formOwnerName    = '';
    formEmail        = '';
    formManagerName  = '';
    formManagerPhone = '';
    formManagerEmail = '';
    formMemo         = '';
    showModal        = true;
  }

  function openEdit(client: Client) {
    editingClient    = client;
    formName         = client.name;
    formType         = client.type;
    formAddress      = client.address      ?? '';
    formPhone        = client.phone        ?? '';
    formBusinessNo   = client.businessNo   ?? '';
    formOwnerName    = client.ownerName    ?? '';
    formEmail        = client.email        ?? '';
    formManagerName  = client.managerName  ?? '';
    formManagerPhone = client.managerPhone ?? '';
    formManagerEmail = client.managerEmail ?? '';
    formMemo         = client.memo         ?? '';
    showModal        = true;
  }

  function closeModal() { showModal = false; }

  function handleSave() {
    if (!formName.trim()) return;
    const payload = {
      name:         formName.trim(),
      type:         formType,
      address:      formAddress.trim(),
      phone:        formPhone.trim()        || undefined,
      businessNo:   formBusinessNo.trim()   || undefined,
      ownerName:    formOwnerName.trim()    || undefined,
      email:        formEmail.trim()        || undefined,
      managerName:  formManagerName.trim()  || undefined,
      managerPhone: formManagerPhone.trim() || undefined,
      managerEmail: formManagerEmail.trim() || undefined,
      memo:         formMemo.trim()         || undefined,
    };
    if (editingClient) {
      const idx = clients.findIndex(c => c.id === editingClient!.id);
      if (idx !== -1) clients[idx] = { ...clients[idx], ...payload };
    } else {
      clients.push({ ...payload, id: crypto.randomUUID(), createdAt: new Date().toISOString().slice(0, 10) });
    }
    closeModal();
  }

  let deleteTargetId = $state<string | null>(null);
  function openDelete(id: string) { deleteTargetId = id; }
  function confirmDelete() {
    if (deleteTargetId) clients = clients.filter(c => c.id !== deleteTargetId);
    deleteTargetId = null;
  }
  function cancelDelete() { deleteTargetId = null; }
</script>

<!-- ───────────────────────────── 메인 컨텐츠 ───────────────────────────── -->
<div class="min-h-screen bg-base-200 px-8 py-6">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">거래처 관리</h2>

  <!-- 필터 / 검색 / 등록 버튼 바 -->
  <div class="flex items-center gap-3 mb-5">

    <!-- 타입 필터 드롭다운 (DaisyUI dropdown) -->
    <div class="dropdown">
      <button
        tabindex="0"
        role="button"
        onclick={() => showTypeDropdown = !showTypeDropdown}
        class="btn btn-sm btn-outline bg-base-100 border-base-300 font-semibold gap-2 whitespace-nowrap"
      >
        {typeFilters.find(f => f.value === typeFilter)?.label ?? '전체'}
        <Icon icon="lucide:chevron-down" class="w-4 h-4 transition-transform {showTypeDropdown ? 'rotate-180' : ''}" />
      </button>

      {#if showTypeDropdown}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <ul
          tabindex="0"
          role="menu"
          class="dropdown-content menu bg-base-100 rounded-box border border-base-300 shadow-lg z-10 min-w-max p-1 mt-1"
          onmouseleave={() => showTypeDropdown = false}
        >
          {#each typeFilters as f (f.value)}
            <li role="none">
              <button
                role="menuitem"
                onclick={() => { typeFilter = f.value; showTypeDropdown = false; }}
                class="flex items-center justify-between gap-3 text-sm font-semibold {typeFilter === f.value ? 'active' : ''}"
              >
                <span>{f.label}</span>
                {#if f.value !== 'all'}
                  <span class="badge badge-ghost badge-sm">{clients.filter(c => c.type === f.value).length}</span>
                {:else}
                  <span class="badge badge-ghost badge-sm">{clients.length}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- 검색 인풋 -->
    <label class="input input-bordered input-sm flex items-center gap-2 bg-base-100 w-72">
      <Icon icon="lucide:search" class="w-4 h-4 text-base-content/40 shrink-0" />
      <input
        type="text"
        placeholder="거래처명, 담당자, 사업자번호..."
        bind:value={searchQuery}
        class="grow text-sm"
      />
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
          <th class="w-20 text-xs font-bold">유형</th>
          <th class="text-xs font-bold">거래처명</th>
          <th class="w-32 text-xs font-bold">사업자번호</th>
          <th class="w-24 text-xs font-bold">대표자</th>
          <th class="w-24 text-xs font-bold">담당자</th>
          <th class="w-36 text-xs font-bold">담당자 연락처</th>
          <th class="w-28 text-xs font-bold">등록일</th>
          <th class="w-24 text-xs font-bold text-center">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredClients.length === 0}
          <tr>
            <td colspan="8" class="py-16 text-center text-base-content/40 text-sm">
              검색 결과가 없습니다.
            </td>
          </tr>
        {:else}
          {#each filteredClients as client (client.id)}
            <tr class="hover:bg-base-200 transition-colors">
              <td>
                {#if client.type === 'hotel'}
                  <span class="badge badge-info badge-sm font-bold whitespace-nowrap">
                    {typeLabel[client.type]}
                  </span>
                {:else if client.type === 'pension'}
                  <span class="badge badge-success badge-sm font-bold whitespace-nowrap">
                    {typeLabel[client.type]}
                  </span>
                {:else if client.type === 'resort'}
                  <span class="badge badge-secondary badge-sm font-bold whitespace-nowrap">
                    {typeLabel[client.type]}
                  </span>
                {:else}
                  <span class="badge badge-ghost badge-sm font-bold whitespace-nowrap">
                    {typeLabel[client.type] ?? client.type}
                  </span>
                {/if}
              </td>
              <td class="font-semibold text-base-content">{client.name}</td>
              <td class="text-base-content/70">{client.businessNo ?? '—'}</td>
              <td class="text-base-content/70">{client.ownerName ?? '—'}</td>
              <td class="text-base-content/70">{client.managerName ?? '—'}</td>
              <td class="text-base-content/70">{client.managerPhone ?? '—'}</td>
              <td class="text-base-content/50 text-xs">{formatDate(client.createdAt)}</td>
              <td>
                <div class="flex items-center justify-center gap-1">
                  <button
                    onclick={() => openEdit(client)}
                    class="btn btn-ghost btn-xs text-primary font-semibold"
                  >수정</button>
                  <div class="divider divider-horizontal mx-0 h-4"></div>
                  <button
                    onclick={() => openDelete(client.id)}
                    class="btn btn-ghost btn-xs text-error font-semibold"
                  >삭제</button>
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
    <div class="modal-box w-full max-w-2xl rounded-2xl p-6">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between mb-6">
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

      <!-- 폼 -->
      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="grid grid-cols-2 gap-x-4 gap-y-4">

          <!-- 거래처명 -->
          <div class="col-span-2">
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

          <!-- 유형 선택 -->
          <div class="col-span-2">
            <p class="label-text text-xs font-bold text-base-content/60 mb-2">유형</p>
            <div class="flex gap-2 flex-wrap">
              {#each typeFilters.filter(f => f.value !== 'all') as f (f.value)}
                <button
                  type="button"
                  onclick={() => formType = f.value as ClientType}
                  class="btn btn-sm font-bold whitespace-nowrap {formType === f.value ? 'btn-primary' : 'btn-outline btn-ghost'}"
                >
                  {f.label}
                </button>
              {/each}
            </div>
          </div>

          <!-- 주소 -->
          <div class="col-span-2">
            <label for="cAddr" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">주소</span>
            </label>
            <input
              id="cAddr"
              type="text"
              bind:value={formAddress}
              placeholder="주소를 입력하세요"
              class="input input-bordered w-full text-sm"
            />
          </div>

          <!-- 전화번호 -->
          <div>
            <label for="cPhone" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">전화번호</span>
            </label>
            <input
              id="cPhone"
              type="text"
              bind:value={formPhone}
              placeholder="02-0000-0000"
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

          <!-- 대표자명 -->
          <div>
            <label for="cOwner" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">대표자명</span>
            </label>
            <input
              id="cOwner"
              type="text"
              bind:value={formOwnerName}
              placeholder="홍길동"
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

          <!-- 담당자명 -->
          <div>
            <label for="cMgrName" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">담당자명</span>
            </label>
            <input
              id="cMgrName"
              type="text"
              bind:value={formManagerName}
              placeholder="김담당"
              class="input input-bordered w-full text-sm"
            />
          </div>

          <!-- 담당자 연락처 -->
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

          <!-- 담당자 이메일 -->
          <div>
            <label for="cMgrEmail" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">담당자 이메일</span>
            </label>
            <input
              id="cMgrEmail"
              type="email"
              bind:value={formManagerEmail}
              placeholder="manager@hotel.com"
              class="input input-bordered w-full text-sm"
            />
          </div>

          <!-- 메모 -->
          <div class="col-span-2">
            <label for="cMemo" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">메모</span>
            </label>
            <textarea
              id="cMemo"
              bind:value={formMemo}
              rows="3"
              placeholder="특이사항을 입력하세요"
              class="textarea textarea-bordered w-full text-sm resize-none"
            ></textarea>
          </div>
        </div>

        <!-- 모달 액션 버튼 -->
        <div class="modal-action mt-6 pt-4 border-t border-base-200">
          <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
          <button type="submit" class="btn btn-primary font-bold">
            {editingClient ? '저장' : '등록'}
          </button>
        </div>
      </form>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────────── 삭제 확인 모달 ───────────────────────────── -->
{#if deleteTargetId}
  {@const target = clients.find(c => c.id === deleteTargetId)}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) cancelDelete(); }}
  >
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">거래처 삭제</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-error">{target?.name}</span> 거래처를 삭제하시겠습니까?<br />
        <span class="text-xs text-base-content/40">관련 세탁물 데이터가 모두 삭제됩니다.</span>
      </p>
      <div class="modal-action">
        <button onclick={cancelDelete} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmDelete} class="btn btn-error font-bold">삭제</button>
      </div>
    </div>
  </dialog>
{/if}
