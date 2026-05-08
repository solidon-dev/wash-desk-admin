<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Factory {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    memo?: string;
    isHidden: boolean;
    createdAt: string;
  }

  let factories = $state<Factory[]>([
    { id: 'factory-001', name: '본사 세탁공장', address: '서울시 강남구', phone: '02-1234-5678', memo: '', isHidden: false, createdAt: '2024-01-01' },
    { id: 'factory-002', name: '부산 세탁공장', address: '부산시 해운대구', phone: '051-9876-5432', memo: '', isHidden: false, createdAt: '2024-01-01' },
    { id: 'factory-003', name: '제주 세탁공장', address: '제주시 노형동', phone: '064-111-2222', memo: '', isHidden: false, createdAt: '2024-03-01' },
  ]);
  let selectedFactoryId = $state('factory-001');

  let searchQuery    = $state('');
  let showHidden     = $state(false);

  const filteredFactories = $derived(
    factories.filter(f => {
      if (!showHidden && f.isHidden) return false;
      const q = searchQuery.trim().toLowerCase();
      return !q
        || f.name.toLowerCase().includes(q)
        || (f.address ?? '').toLowerCase().includes(q)
        || (f.phone   ?? '').toLowerCase().includes(q);
    })
  );

  // ── 모달 ──────────────────────────────────────────────────────
  let showModal       = $state(false);
  let editingFactory  = $state<Factory | null>(null);
  let formName        = $state('');
  let formAddress     = $state('');
  let formPhone       = $state('');
  let formMemo        = $state('');

  function openAdd() {
    editingFactory = null;
    formName    = '';
    formAddress = '';
    formPhone   = '';
    formMemo    = '';
    showModal   = true;
  }

  function openEdit(f: Factory) {
    editingFactory = f;
    formName    = f.name;
    formAddress = f.address ?? '';
    formPhone   = f.phone   ?? '';
    formMemo    = f.memo    ?? '';
    showModal   = true;
  }

  function closeModal() { showModal = false; }

  function handleSave() {
    if (!formName.trim()) return;
    const payload = {
      name:    formName.trim(),
      address: formAddress.trim() || undefined,
      phone:   formPhone.trim()   || undefined,
      memo:    formMemo.trim()    || undefined,
    };
    if (editingFactory) {
      const idx = factories.findIndex(f => f.id === editingFactory!.id);
      if (idx !== -1) Object.assign(factories[idx], payload);
    } else {
      factories.push({ ...payload, id: crypto.randomUUID(), isHidden: false, createdAt: new Date().toISOString().slice(0, 10) });
    }
    closeModal();
  }

  // ── 숨기기 확인 ───────────────────────────────────────────────
  let hideTargetId = $state<string | null>(null);
  const hideTarget = $derived(
    hideTargetId ? factories.find(f => f.id === hideTargetId) : null
  );
  function confirmToggleHidden() {
    if (hideTargetId) {
      const f = factories.find(f => f.id === hideTargetId);
      if (f) f.isHidden = !f.isHidden;
    }
    hideTargetId = null;
  }

  function formatDate(iso: string) { return iso.slice(0, 10); }
</script>

<div class="min-h-screen bg-base-200 px-8 py-6">

  <!-- 헤더 -->
  <div class="mb-5 flex items-center gap-3">
    <div>
      <h2 class="text-2xl font-extrabold">세탁공장 관리</h2>
      <p class="mt-0.5 text-sm text-base-content/50">운영 중인 세탁 사업장을 관리합니다</p>
    </div>
    <div class="flex-1"></div>

    <!-- 숨긴 공장 토글 -->
    <button
      onclick={() => (showHidden = !showHidden)}
      class="btn btn-sm gap-1.5 {showHidden ? 'btn-warning' : 'btn-ghost border border-base-300'}"
    >
      <Icon icon={showHidden ? 'lucide:eye' : 'lucide:eye-off'} class="h-4 w-4" />
      {showHidden ? '숨김 공장 표시 중' : '숨김 공장 보기'}
    </button>

    <!-- 검색 -->
    <label class="input input-bordered flex items-center gap-2 w-64">
      <Icon icon="lucide:search" class="h-4 w-4 text-base-content/40 shrink-0" />
      <input
        type="text"
        placeholder="공장명, 주소, 전화번호..."
        bind:value={searchQuery}
        class="grow text-sm"
      />
    </label>

    <!-- 공장 추가 버튼 -->
    <button
      onclick={openAdd}
      class="btn btn-primary btn-sm gap-2 whitespace-nowrap"
    >
      <Icon icon="lucide:plus" class="h-4 w-4" />
      공장 추가
    </button>
  </div>

  <!-- 테이블 카드 -->
  <div class="card card-bordered bg-base-100 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="table table-sm w-full">
        <thead>
          <tr>
            <th class="w-8">#</th>
            <th>공장명</th>
            <th class="w-52">주소</th>
            <th class="w-36">전화번호</th>
            <th>메모</th>
            <th class="w-28">등록일</th>
            <th class="w-20">상태</th>
            <th class="w-24 text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredFactories.length === 0}
            <tr>
              <td colspan="8" class="py-16 text-center text-sm text-base-content/40">
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 공장이 없습니다.'}
              </td>
            </tr>
          {:else}
            {#each filteredFactories as factory, i (factory.id)}
              <tr class="hover {factory.isHidden ? 'opacity-50' : ''}">
                <td class="text-xs text-base-content/40 font-mono">{i + 1}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon icon="lucide:factory" class="h-4 w-4 text-primary" />
                    </div>
                    <span class="font-semibold">{factory.name}</span>
                    {#if factory.id === selectedFactoryId}
                      <span class="badge badge-primary badge-sm">현재 선택</span>
                    {/if}
                  </div>
                </td>
                <td class="text-base-content/70">{factory.address ?? '—'}</td>
                <td class="text-base-content/70">{factory.phone ?? '—'}</td>
                <td class="text-base-content/50 text-xs">{factory.memo || '—'}</td>
                <td class="text-xs text-base-content/50">{formatDate(factory.createdAt)}</td>
                <td>
                  {#if factory.isHidden}
                    <span class="badge badge-warning badge-sm font-bold">숨김</span>
                  {:else}
                    <span class="badge badge-success badge-sm font-bold">운영 중</span>
                  {/if}
                </td>
                <td>
                  <div class="flex items-center justify-center gap-2">
                    <button
                      onclick={() => openEdit(factory)}
                      class="btn btn-ghost btn-xs text-primary"
                    >수정</button>
                    <div class="divider divider-horizontal mx-0 h-4"></div>
                    <button
                      onclick={() => (hideTargetId = factory.id)}
                      class="btn btn-ghost btn-xs {factory.isHidden ? 'text-success' : 'text-warning'}"
                    >
                      {factory.isHidden ? '복원' : '숨기기'}
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- 하단 카운트 -->
  <p class="mt-3 text-xs text-base-content/40">
    전체 {factories.length}개
    {#if factories.some(f => f.isHidden)}
      · 숨김 {factories.filter(f => f.isHidden).length}개
    {/if}
  </p>
</div>

<!-- ── 추가 / 수정 모달 ──────────────────────────────────────────── -->
{#if showModal}
  <dialog
    class="modal modal-open"
    onclose={closeModal}
  >
    <div class="modal-box w-full max-w-lg">
      <!-- 모달 헤더 -->
      <div class="mb-6 flex items-center justify-between">
        <h3 class="text-lg font-extrabold">
          {editingFactory ? '공장 수정' : '공장 추가'}
        </h3>
        <button
          onclick={closeModal}
          aria-label="닫기"
          class="btn btn-ghost btn-sm btn-circle"
        >
          <Icon icon="lucide:x" class="h-5 w-5" />
        </button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="grid grid-cols-2 gap-x-4 gap-y-4">

          <!-- 공장명 -->
          <div class="col-span-2 form-control">
            <label class="label" for="fName">
              <span class="label-text text-xs font-bold">공장명 <span class="text-error">*</span></span>
            </label>
            <input
              id="fName"
              type="text"
              bind:value={formName}
              placeholder="예) 본사 세탁공장"
              required
              class="input input-bordered w-full"
            />
          </div>

          <!-- 주소 -->
          <div class="col-span-2 form-control">
            <label class="label" for="fAddr">
              <span class="label-text text-xs font-bold">주소</span>
            </label>
            <input
              id="fAddr"
              type="text"
              bind:value={formAddress}
              placeholder="예) 서울시 강남구 테헤란로 123"
              class="input input-bordered w-full"
            />
          </div>

          <!-- 전화번호 -->
          <div class="form-control">
            <label class="label" for="fPhone">
              <span class="label-text text-xs font-bold">전화번호</span>
            </label>
            <input
              id="fPhone"
              type="text"
              bind:value={formPhone}
              placeholder="02-0000-0000"
              class="input input-bordered w-full"
            />
          </div>

          <!-- 메모 -->
          <div class="col-span-2 form-control">
            <label class="label" for="fMemo">
              <span class="label-text text-xs font-bold">메모</span>
            </label>
            <textarea
              id="fMemo"
              bind:value={formMemo}
              rows="3"
              placeholder="특이사항을 입력하세요"
              class="textarea textarea-bordered w-full resize-none"
            ></textarea>
          </div>
        </div>

        <div class="modal-action border-t border-base-200 pt-4 mt-6">
          <button
            type="button"
            onclick={closeModal}
            class="btn btn-ghost"
          >취소</button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!formName.trim()}
          >
            {editingFactory ? '저장' : '추가'}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button onclick={closeModal}>close</button>
    </form>
  </dialog>
{/if}

<!-- ── 숨기기 / 복원 확인 모달 ────────────────────────────────────── -->
{#if hideTargetId && hideTarget}
  <dialog class="modal modal-open">
    <div class="modal-box w-full max-w-sm">
      {#if hideTarget.isHidden}
        <h3 class="mb-2 text-base font-extrabold">공장 복원</h3>
        <p class="mb-6 text-sm text-base-content/70">
          <span class="font-bold text-primary">{hideTarget.name}</span>을(를) 다시 운영 중 상태로 복원할까요?
        </p>
      {:else}
        <h3 class="mb-2 text-base font-extrabold">공장 숨기기</h3>
        <p class="mb-1 text-sm text-base-content/70">
          <span class="font-bold text-warning">{hideTarget.name}</span>을(를) 숨깁니다.
        </p>
        <p class="mb-6 text-xs text-base-content/40">숨긴 공장은 셀렉터에서 표시되지 않습니다. 언제든 복원할 수 있습니다.</p>
      {/if}
      <div class="modal-action">
        <button
          onclick={() => (hideTargetId = null)}
          class="btn btn-ghost"
        >취소</button>
        <button
          onclick={confirmToggleHidden}
          class="btn {hideTarget.isHidden ? 'btn-primary' : 'btn-warning'}"
        >
          {hideTarget.isHidden ? '복원' : '숨기기'}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button onclick={() => (hideTargetId = null)}>close</button>
    </form>
  </dialog>
{/if}
