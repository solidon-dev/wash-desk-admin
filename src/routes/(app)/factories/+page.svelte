<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';
  import { supabase } from '$lib/supabase/client';
  import type { PageData } from './$types';

  type Factory = {
    id: string; name: string; address: string | null;
    phone: string | null; created_at: string; deleted_at: string | null;
  };
  type Props = {
    data: PageData & { factories: Factory[]; total: number; page: number; PAGE_SIZE: number; showHidden: boolean; q: string };
    form: { success?: boolean; error?: string } | null;
  };
  let { data, form }: Props = $props();

  const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.PAGE_SIZE)));

  // ── URL 이동 헬퍼 ──
  function navTo(params: { q?: string; page?: number; hidden?: boolean }) {
    const q       = params.q       ?? data.q;
    const page    = params.page    ?? 1;
    const hidden  = params.hidden  ?? data.showHidden;
    const parts: string[] = [];
    if (q)           parts.push(`q=${encodeURIComponent(q)}`);
    if (hidden)      parts.push('hidden=1');
    if (page > 1)    parts.push(`page=${page}`);
    goto(parts.length ? `?${parts.join('&')}` : '?');
  }

  // ── 검색 드롭다운 suggestions (debounce, URL 변경 없음) ──
  let suggestions = $state<{ id: string; label: string; sub?: string }[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout>;

  async function fetchSuggestions(q: string) {
    if (!q.trim()) { suggestions = []; return; }
    let sq = supabase.from('factories').select('id, name, address').ilike('name', `%${q.trim()}%`).limit(8);
    if (!data.showHidden) sq = sq.is('deleted_at', null);
    const { data: rows } = await sq;
    suggestions = (rows ?? []).map(r => ({ id: r.id, label: r.name, sub: r.address ?? undefined }));
  }

  function onSearchInput(q: string) {
    clearTimeout(debounceTimer);
    if (!q.trim()) { suggestions = []; return; }
    debounceTimer = setTimeout(() => fetchSuggestions(q), 180);
  }

  // 드롭다운에서 선택 or 다 지워서 '' 들어오면
  function onSearchSelect(id: string) {
    const found = suggestions.find(s => s.id === id);
    suggestions = [];
    navTo({ q: found?.label ?? '' });
  }

  function formatDate(iso: string) { return iso.slice(0, 10); }

  // ── 등록/수정 모달 ──
  let showModal      = $state(false);
  let editingFactory = $state<Factory | null>(null);
  let formName       = $state('');
  let formAddress    = $state('');
  let formPhone      = $state('');
  let saveError      = $state('');
  let saving         = $state(false);

  $effect(() => {
    if (form?.success) closeModal();
    if (form?.error)   saveError = form.error ?? '';
  });

  function openAdd() {
    editingFactory = null;
    formName = ''; formAddress = ''; formPhone = ''; saveError = '';
    showModal = true;
  }
  function openEdit(f: Factory) {
    editingFactory = f;
    formName = f.name; formAddress = f.address ?? ''; formPhone = f.phone ?? ''; saveError = '';
    showModal = true;
  }
  function closeModal() { showModal = false; saveError = ''; }


</script>

<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">세탁공장 관리</h2>

  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="공장명 검색..."
      items={suggestions}
      onselect={onSearchSelect}
      oninput={onSearchInput}
      onenter={(q) => navTo({ q })}
      initialValue={data.q}
      class="w-60 sm:w-72"
    />

    <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 font-semibold">
      <input type="checkbox" checked={data.showHidden}
        onchange={(e) => navTo({ hidden: (e.target as HTMLInputElement).checked })}
        class="checkbox checkbox-sm" />
      비활성화 포함
    </label>

    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto sm:w-auto w-full">
      <Icon icon="lucide:plus" class="w-4 h-4" />공장 등록
    </button>
  </div>

  {#if form?.error && !showModal}
    <div class="alert alert-error mb-4 gap-2 text-sm font-semibold">
      <Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" /><span>{form.error}</span>
    </div>
  {/if}

  <TableCard>
    <table class="table table-sm w-full">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold">공장명</th>
          <th class="text-xs font-bold hidden lg:table-cell">주소</th>
          <th class="text-xs font-bold hidden lg:table-cell">전화번호</th>
          <th class="text-xs font-bold hidden lg:table-cell whitespace-nowrap">등록일</th>
          <th class="text-xs font-bold text-center whitespace-nowrap">액션</th>
        </tr>
      </thead>
      <tbody>
        {#if data.factories.length === 0}
          <tr>
            <td colspan="5" class="py-16 text-center text-base-content/40 text-sm">
              {data.q ? '검색 결과가 없습니다.' : '등록된 공장이 없습니다.'}
            </td>
          </tr>
        {:else}
          {#each data.factories as factory (factory.id)}
            {@const isHidden = factory.deleted_at !== null}
            <tr class="hover:bg-base-200 transition-colors {isHidden ? 'opacity-40' : ''}">
              <td class="font-semibold text-base-content">
                <span>{factory.name}</span>
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {#if factory.phone}<span class="text-xs text-base-content/50">{factory.phone}</span>{/if}
                  {#if factory.address}<span class="text-xs text-base-content/40">{factory.address}</span>{/if}
                  <span class="text-xs text-base-content/30">{formatDate(factory.created_at)}</span>
                </div>
              </td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{factory.address ?? '—'}</td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell">{factory.phone ?? '—'}</td>
              <td class="text-base-content/50 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(factory.created_at)}</td>
              <td class="text-center">
                <button onclick={() => openEdit(factory)} class="btn btn-ghost btn-xs text-primary font-semibold">수정</button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </TableCard>

  <div class="mt-4">
    <Pagination
      currentPage={data.page}
      {totalPages}
      totalItems={data.total}
      pageSize={data.PAGE_SIZE}
      onpage={(p) => navTo({ page: p })}
    />
  </div>
</div>

<!-- 등록/수정 모달 -->
{#if showModal}
  <dialog class="modal modal-open" onmousedown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 480px;">
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-lg font-extrabold text-base-content">{editingFactory ? '공장 수정' : '공장 등록'}</h3>
          {#if editingFactory?.deleted_at !== null && editingFactory !== null}
            <span class="badge badge-sm badge-error gap-1"><Icon icon="lucide:ban" class="w-3 h-3" />비활성화</span>
          {/if}
        </div>
        <button onclick={closeModal} class="btn btn-ghost btn-sm btn-circle">
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>
      <form
        method="POST"
        action={editingFactory ? '?/update' : '?/create'}
        use:enhance={() => {
          saving = true; saveError = '';
          return async ({ result, update }) => {
            saving = false;
            if (result.type === 'failure') saveError = (result.data as { error?: string })?.error ?? '오류';
            await update();
          };
        }}
        class="flex flex-col flex-1 overflow-hidden"
      >
        {#if editingFactory}<input type="hidden" name="id" value={editingFactory.id} />{/if}
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          <div>
            <label for="fName" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">공장명 *</span></label>
            <input id="fName" name="name" type="text" bind:value={formName} placeholder="예) 본사 세탁공장" class="input input-bordered w-full text-sm" required />
          </div>
          <div>
            <label for="fAddress" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">주소</span></label>
            <input id="fAddress" name="address" type="text" bind:value={formAddress} placeholder="예) 서울시 강남구 테헤란로 123" class="input input-bordered w-full text-sm" />
          </div>
          <div>
            <label for="fPhone" class="label pb-1"><span class="label-text text-xs font-bold text-base-content/60">전화번호</span></label>
            <input id="fPhone" name="phone" type="text" bind:value={formPhone} placeholder="02-0000-0000" class="input input-bordered w-full text-sm" />
          </div>
          {#if saveError}
            <div class="alert alert-error gap-2 py-3 px-4 text-sm font-semibold">
              <Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" /><span>{saveError}</span>
            </div>
          {/if}
        </div>
        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0 flex justify-between">
          <div>
            {#if editingFactory}
              {#if editingFactory.deleted_at !== null}
                <button type="submit" form="form-factory-activate" class="btn btn-sm btn-success gap-1.5 font-bold">
                  <Icon icon="lucide:circle-check" class="w-4 h-4" />활성화
                </button>
              {:else}
                <button type="submit" form="form-factory-deactivate" class="btn btn-sm btn-error btn-outline gap-1.5 font-bold">
                  <Icon icon="lucide:ban" class="w-4 h-4" />비활성화
                </button>
              {/if}
            {/if}
          </div>
          <div class="flex gap-2">
            <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
            <button type="submit" class="btn btn-primary font-bold" disabled={saving}>
              {#if saving}<span class="loading loading-spinner loading-xs"></span>{/if}
              {editingFactory ? '저장' : '등록'}
            </button>
          </div>
        </div>
      </form>
    </div>
  </dialog>
{/if}

<!-- 비활성화 / 활성화 전용 form (모달 바깥, form 속성으로 연결) -->
{#if editingFactory}
  <form
    id="form-factory-deactivate"
    method="POST"
    action="?/hide"
    use:enhance={() => async ({ update }) => { await update(); closeModal(); }}
  >
    <input type="hidden" name="id" value={editingFactory.id} />
  </form>
  <form
    id="form-factory-activate"
    method="POST"
    action="?/restore"
    use:enhance={() => async ({ update }) => { await update(); closeModal(); }}
  >
    <input type="hidden" name="id" value={editingFactory.id} />
  </form>
{/if}
