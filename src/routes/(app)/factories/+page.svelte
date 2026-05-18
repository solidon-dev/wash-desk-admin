<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import { modal, SearchBar, Pagination, TableCard, createListStore } from '$lib';
  import { submitAction } from '$lib/utils/action';
  import { supabase } from '$lib/supabase/client';
  import type { PageData } from './$types';

  // ── 타입
  type Factory = {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    created_at: string;
    deleted_at: string | null;
  };

  type Props = { data: PageData & { factories: Factory[]; total: number; page: number; PAGE_SIZE: number; showHidden: boolean; q: string; role: string } };
  let { data }: Props = $props();

  const isSuperAdmin = $derived(data.role === 'super_admin');
  const totalPages   = $derived(Math.max(1, Math.ceil(data.total / data.PAGE_SIZE)));

  // ── createListStore
  const list = createListStore(() => data.factories);

  // ── URL 이동 헬퍼
  function navTo(params: { q?: string; page?: number; hidden?: boolean }) {
    const q      = params.q      ?? data.q;
    const page   = params.page   ?? 1;
    const hidden = params.hidden ?? data.showHidden;
    const parts: string[] = [];
    if (q)        parts.push(`q=${encodeURIComponent(q)}`);
    if (hidden)   parts.push('hidden=1');
    if (page > 1) parts.push(`page=${page}`);
    goto(parts.length ? `?${parts.join('&')}` : '?');
  }

  // ── 검색 suggestions
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

  function onSearchSelect(id: string) {
    const found = suggestions.find(s => s.id === id);
    suggestions = [];
    navTo({ q: found?.label ?? '' });
  }

  function formatDate(iso: string) { return iso.slice(0, 10); }

  // ── 폼 상태
  let editingFactory = $state<Factory | null>(null);
  let formName       = $state('');
  let formAddress    = $state('');
  let formPhone      = $state('');

  // ── 에러 모달
  let errorMessage = $state('');
  function showErrorModal(message?: string) {
    errorMessage = message ?? '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
    modal.open(errorContent);
  }

  // ── 모달 열기
  function openAdd() {
    editingFactory = null;
    formName = ''; formAddress = ''; formPhone = '';
    modal.open(factoryFormModal);
  }

  function openEdit(f: Factory) {
    editingFactory = f;
    formName    = f.name;
    formAddress = f.address ?? '';
    formPhone   = f.phone   ?? '';
    modal.open(factoryFormModal);
  }

  // ── 액션 핸들러
  async function handleSave() {
    if (!formName.trim()) { showErrorModal('공장명을 입력해주세요.'); return; }

    const payload: Record<string, string> = {
      name:    formName.trim(),
      address: formAddress.trim(),
      phone:   formPhone.trim(),
    };

    if (editingFactory) {
      const id   = editingFactory.id;
      payload.id = id;
      const prev = data.factories.find(f => f.id === id);
      const optimistic: Factory = {
        ...(prev ?? editingFactory),
        name:    formName.trim(),
        address: formAddress.trim() || null,
        phone:   formPhone.trim()   || null,
      };
      list.override(id, optimistic);
      modal.close();

      const saved = await submitAction<Factory>('update', payload, {
        responseKey: 'factory',
        onRollback: () => list.clear(id),
        onError: showErrorModal,
      });
      list.clear(id);
      if (saved) list.override(id, saved);
    } else {
      modal.close();
      await submitAction('create', payload, {
        onError: showErrorModal,
        revalidate: true,
      });
    }
  }

  async function handleHide() {
    if (!editingFactory) return;
    const id   = editingFactory.id;
    const prev = data.factories.find(f => f.id === id);
    list.override(id, { ...(prev ?? editingFactory), deleted_at: new Date().toISOString() });
    modal.close();

    const saved = await submitAction<Factory>('hide', { id }, {
      responseKey: 'factory',
      onRollback: () => list.clear(id),
      onError: showErrorModal,
    });
    list.clear(id);
    if (saved) list.override(id, saved);
  }

  async function handleRestore() {
    if (!editingFactory) return;
    const id   = editingFactory.id;
    const prev = data.factories.find(f => f.id === id);
    list.override(id, { ...(prev ?? editingFactory), deleted_at: null });
    modal.close();

    const saved = await submitAction<Factory>('restore', { id }, {
      responseKey: 'factory',
      onRollback: () => list.clear(id),
      onError: showErrorModal,
    });
    list.clear(id);
    if (saved) list.override(id, saved);
  }
</script>

{#snippet errorContent()}
  <div class="modal-box rounded-2xl p-6 max-w-sm">
    <div class="flex items-start gap-3">
      <Icon icon="lucide:circle-alert" class="w-5 h-5 text-error shrink-0 mt-0.5" />
      <div class="flex-1">
        <h3 class="font-bold text-base mb-1">오류가 발생했습니다</h3>
        <p class="text-sm text-base-content/70">{errorMessage}</p>
      </div>
    </div>
    <div class="modal-action mt-4">
      <button onclick={modal.close} class="btn btn-sm btn-ghost font-bold">확인</button>
    </div>
  </div>
{/snippet}

{#snippet factoryFormModal()}
  <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 480px;">
    <div class="flex items-center justify-between mb-5 shrink-0">
      <div class="flex items-center gap-2 flex-wrap">
        <h3 class="text-lg font-extrabold text-base-content">{editingFactory ? '공장 수정' : '공장 등록'}</h3>
        {#if editingFactory?.deleted_at}
          <span class="badge badge-sm badge-error gap-1">
            <Icon icon="lucide:ban" class="w-3 h-3" />비활성화
          </span>
        {/if}
      </div>
      <button onclick={modal.close} class="btn btn-ghost btn-sm btn-circle">
        <Icon icon="lucide:x" class="w-5 h-5" />
      </button>
    </div>

    <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
      <div>
        <label for="fName" class="label pb-1">
          <span class="label-text text-xs font-bold text-base-content/60">공장명 *</span>
        </label>
        <input id="fName" type="text" bind:value={formName} placeholder="예) 본사 세탁공장" class="input input-bordered w-full text-sm" />
      </div>
      <div>
        <label for="fAddress" class="label pb-1">
          <span class="label-text text-xs font-bold text-base-content/60">주소</span>
        </label>
        <input id="fAddress" type="text" bind:value={formAddress} placeholder="예) 서울시 강남구 테헤란로 123" class="input input-bordered w-full text-sm" />
      </div>
      <div>
        <label for="fPhone" class="label pb-1">
          <span class="label-text text-xs font-bold text-base-content/60">전화번호</span>
        </label>
        <input id="fPhone" type="text" bind:value={formPhone} placeholder="02-0000-0000" class="input input-bordered w-full text-sm" />
      </div>
    </div>

    <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0 flex justify-between">
      <div>
        {#if editingFactory && isSuperAdmin}
          {#if editingFactory.deleted_at}
            <button onclick={handleRestore} class="btn btn-sm btn-success gap-1.5 font-bold">
              <Icon icon="lucide:circle-check" class="w-4 h-4" />활성화
            </button>
          {:else}
            <button onclick={handleHide} class="btn btn-sm btn-error btn-outline gap-1.5 font-bold">
              <Icon icon="lucide:ban" class="w-4 h-4" />비활성화
            </button>
          {/if}
        {/if}
      </div>
      <div class="flex gap-2">
        <button onclick={modal.close} class="btn btn-ghost font-bold">취소</button>
        <button onclick={handleSave} class="btn btn-primary font-bold">
          {editingFactory ? '저장' : '등록'}
        </button>
      </div>
    </div>
  </div>
{/snippet}

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
        {#if list.items.length === 0}
          <tr>
            <td colspan="5" class="py-16 text-center text-base-content/40 text-sm">
              {data.q ? '검색 결과가 없습니다.' : '등록된 공장이 없습니다.'}
            </td>
          </tr>
        {:else}
          {#each list.items as factory (factory.id)}
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
