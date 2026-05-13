<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';
  import {
    getFactories,
    createFactory,
    updateFactory,
    hideFactory,
    restoreFactory,
    type Factory,
  } from '$lib/api/factories';

  // ── 데이터 ──
  let factories = $state<Factory[]>([]);
  let loading   = $state(true);
  let saveError = $state('');

  onMount(async () => {
    try {
      factories = await getFactories();
    } finally {
      loading = false;
    }
  });

  // ── 검색 / 필터 ──
  let selectedId  = $state('');
  let showHidden  = $state(false);

  const searchItems = $derived(
    factories
      .filter((f) => f.deleted_at === null)
      .map((f) => ({ id: f.id, label: f.name, sub: f.address ?? undefined }))
  );

  // ── 페이지네이션 ──
  const PAGE_SIZE = 10;
  let currentPage = $state(1);

  const filteredFactories = $derived(
    factories.filter((f) => {
      const isHidden = f.deleted_at !== null;
      if (!showHidden && isHidden) return false;
      if (selectedId) return f.id === selectedId;
      return true;
    })
  );

  $effect(() => { void selectedId; void showHidden; currentPage = 1; });

  const totalPages       = $derived(Math.max(1, Math.ceil(filteredFactories.length / PAGE_SIZE)));
  const visibleFactories = $derived(filteredFactories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

  function formatDate(iso: string) { return iso.slice(0, 10); }

  // ── 등록/수정 모달 ──
  let showModal      = $state(false);
  let editingFactory = $state<Factory | null>(null);
  let formName       = $state('');
  let formAddress    = $state('');
  let formPhone      = $state('');
  let saving         = $state(false);

  function openAdd() {
    editingFactory = null;
    formName    = '';
    formAddress = '';
    formPhone   = '';
    saveError   = '';
    showModal   = true;
  }

  function openEdit(f: Factory) {
    editingFactory = f;
    formName    = f.name;
    formAddress = f.address ?? '';
    formPhone   = f.phone   ?? '';
    saveError   = '';
    showModal   = true;
  }

  function closeModal() { showModal = false; }

  async function handleSave() {
    if (!formName.trim()) return;
    saving    = true;
    saveError = '';

    const payload = {
      name:    formName.trim(),
      address: formAddress.trim() || null,
      phone:   formPhone.trim()   || null,
    };

    try {
      if (editingFactory) {
        const updated = await updateFactory(editingFactory.id, payload);
        const idx = factories.findIndex((f) => f.id === editingFactory!.id);
        if (idx !== -1) factories[idx] = updated;
      } else {
        const created = await createFactory(payload);
        factories.push(created);
      }
      closeModal();
    } catch (e: unknown) {
      saveError = e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.';
    } finally {
      saving = false;
    }
  }

  // ── 숨기기 확인 ──
  let hideTargetId = $state<string | null>(null);
  function openHide(id: string) { hideTargetId = id; }
  function cancelHide() { hideTargetId = null; }

  async function confirmHide() {
    if (!hideTargetId) return;
    const id = hideTargetId;
    hideTargetId = null;
    try {
      await hideFactory(id);
      const idx = factories.findIndex((f) => f.id === id);
      if (idx !== -1) factories[idx] = { ...factories[idx], deleted_at: new Date().toISOString() };
      if (selectedId === id) selectedId = '';
    } catch {
      // 에러는 조용히 무시하지 않고 토스트 추가 예정
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreFactory(id);
      const idx = factories.findIndex((f) => f.id === id);
      if (idx !== -1) factories[idx] = { ...factories[idx], deleted_at: null };
      // 모달 내부에서 호출된 경우 editingFactory 도 갱신
      if (editingFactory?.id === id) {
        editingFactory = { ...editingFactory, deleted_at: null };
      }
    } catch {
      // TODO: 에러 처리
    }
  }
</script>

<!-- ───────────────────────────── 메인 컨텐츠 ───────────────────────────── -->
<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">세탁공장 관리</h2>

  <!-- 검색 / 숨김 토글 / 등록 버튼 바 -->
  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="공장명, 주소 검색..."
      items={searchItems}
      onselect={(id) => (selectedId = id)}
      class="w-64 sm:w-72"
    />

    <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 font-semibold">
      <input type="checkbox" bind:checked={showHidden} class="checkbox checkbox-sm" />
      숨김 포함
    </label>

    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto sm:w-auto w-full">
      <Icon icon="lucide:plus" class="w-4 h-4" />
      공장 등록
    </button>
  </div>

  <!-- 공장 테이블 -->
  <TableCard>
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold w-[50%] sm:w-[40%] lg:w-[24%] xl:w-[20%]">공장명</th>
          <th class="text-xs font-bold hidden lg:table-cell lg:w-[38%] xl:w-[36%]">주소</th>
          <th class="text-xs font-bold hidden lg:table-cell lg:w-[18%] xl:w-[16%]">전화번호</th>
          <th class="text-xs font-bold hidden lg:table-cell whitespace-nowrap lg:w-[10%] xl:w-[10%]">등록일</th>
          <th class="text-xs font-bold text-center whitespace-nowrap w-[50%] sm:w-[60%] lg:w-[10%] xl:w-[14%]">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr>
            <td colspan="5" class="py-16 text-center">
              <span class="loading loading-spinner loading-md text-primary"></span>
            </td>
          </tr>
        {:else if filteredFactories.length === 0}
          <tr>
            <td colspan="5" class="py-16 text-center text-base-content/40 text-sm">
              {selectedId ? '선택된 공장이 없습니다.' : '등록된 공장이 없습니다.'}
            </td>
          </tr>
        {:else}
          {#each visibleFactories as factory (factory.id)}
            {@const isHidden = factory.deleted_at !== null}
            <tr class="hover:bg-base-200 transition-colors {isHidden ? 'opacity-40' : ''}">

              <!-- 공장명 -->
              <td class="font-semibold text-base-content">
                <span>{factory.name}</span>
                {#if isHidden}
                  <span class="badge badge-ghost badge-xs ml-1">숨김</span>
                {/if}
                <!-- lg 미만 인라인 -->
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {#if factory.phone}<span class="text-xs text-base-content/50">{factory.phone}</span>{/if}
                  {#if factory.address}<span class="text-xs text-base-content/40">{factory.address}</span>{/if}
                  <span class="text-xs text-base-content/30">{formatDate(factory.created_at)}</span>
                </div>
              </td>

              <!-- 주소 -->
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{factory.address ?? '—'}</td>

              <!-- 전화번호 -->
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{factory.phone ?? '—'}</td>

              <!-- 등록일 -->
              <td class="text-base-content/50 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(factory.created_at)}</td>

              <!-- 액션 -->
              <td>
                <div class="flex items-center justify-center">
                  <button
                    onclick={() => openEdit(factory)}
                    class="btn btn-ghost btn-xs text-primary font-semibold"
                  >수정</button>
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
      totalItems={filteredFactories.length}
      pageSize={PAGE_SIZE}
      onpage={(p) => (currentPage = p)}
    />
  </div>
</div>

<!-- ───────────────────────── 공장 등록/수정 모달 ───────────────────────── -->
{#if showModal}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
  >
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 480px;">

      <!-- 헤더 -->
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-extrabold text-base-content">
            {editingFactory ? '공장 수정' : '공장 등록'}
          </h3>
          {#if editingFactory}
            {#if editingFactory.deleted_at !== null}
              <button
                type="button"
                onclick={() => handleRestore(editingFactory!.id)}
                class="btn btn-xs btn-success gap-1 font-bold"
              >
                <Icon icon="lucide:eye" class="w-3.5 h-3.5" />
                복원
              </button>
            {:else}
              <button
                type="button"
                onclick={() => { openHide(editingFactory!.id); closeModal(); }}
                class="btn btn-xs btn-warning gap-1 font-bold"
              >
                <Icon icon="lucide:eye-off" class="w-3.5 h-3.5" />
                숨기기
              </button>
            {/if}
          {/if}
        </div>
        <button onclick={closeModal} aria-label="닫기" class="btn btn-ghost btn-sm btn-circle">
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- 폼 -->
      <form
        onsubmit={(e) => { e.preventDefault(); handleSave(); }}
        class="flex flex-col flex-1 overflow-hidden"
      >
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">

          <!-- 공장명 -->
          <div>
            <label for="fName" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">공장명 *</span>
            </label>
            <input id="fName" type="text" bind:value={formName} placeholder="예) 본사 세탁공장"
              class="input input-bordered w-full text-sm" required />
          </div>

          <!-- 주소 -->
          <div>
            <label for="fAddress" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">주소</span>
            </label>
            <input id="fAddress" type="text" bind:value={formAddress} placeholder="예) 서울시 강남구 테헤란로 123"
              class="input input-bordered w-full text-sm" />
          </div>

          <!-- 전화번호 -->
          <div>
            <label for="fPhone" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">전화번호</span>
            </label>
            <input id="fPhone" type="text" bind:value={formPhone} placeholder="02-0000-0000"
              class="input input-bordered w-full text-sm" />
          </div>

          <!-- 에러 메시지 -->
          {#if saveError}
            <div class="alert alert-error gap-2 rounded-xl py-3 px-4 text-sm font-semibold">
              <Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          {/if}
        </div>

        <!-- 액션 버튼 -->
        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0">
          <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
          <button type="submit" class="btn btn-primary font-bold" disabled={saving}>
            {#if saving}
              <span class="loading loading-spinner loading-xs"></span>
            {/if}
            {editingFactory ? '저장' : '등록'}
          </button>
        </div>
      </form>
    </div>
  </dialog>
{/if}

<!-- ───────────────────────────── 숨기기 확인 모달 ───────────────────────────── -->
{#if hideTargetId}
  {@const target = factories.find((f) => f.id === hideTargetId)}
  <dialog
    class="modal modal-open"
    onmousedown={(e) => { if (e.target === e.currentTarget) cancelHide(); }}
  >
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">공장 숨기기</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-warning">{target?.name}</span> 공장을 숨기시겠습니까?<br />
        <span class="text-xs text-base-content/40">숨긴 공장은 셀렉터에 표시되지 않으며, 언제든 복원할 수 있습니다.</span>
      </p>
      <div class="modal-action">
        <button onclick={cancelHide} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmHide} class="btn btn-warning font-bold">숨기기</button>
      </div>
    </div>
  </dialog>
{/if}
