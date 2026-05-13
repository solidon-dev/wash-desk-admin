<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';
  import { supabase } from '$lib/supabase/client';
  import type { PageData } from './$types';
  import { formatPhone, displayPhone } from '$lib/utils/phone';

  type ClientRow = {
    id: string;
    factory_id: string;
    name: string;
    business_number: string | null;
    email: string | null;
    manager_name: string | null;
    manager_phone: string | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
    created_at: string;
    deleted_at: string | null;
  };

  type Props = {
    data: PageData & {
      clients: ClientRow[];
      total: number;
      page: number;
      PAGE_SIZE: number;
      showHidden: boolean;
      q: string;
      role: string;
      factory_id: string | null;
      factories: { id: string; name: string }[];
    };
    form: { success?: boolean; error?: string } | null;
  };
  let { data, form }: Props = $props();

  const myRole      = $derived(data.role as 'super_admin' | 'factory_admin' | 'worker');
  const myFactoryId = $derived(data.factory_id);
  const factories   = $derived(data.factories);
  const totalPages  = $derived(Math.max(1, Math.ceil(data.total / data.PAGE_SIZE)));

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

  // ── 검색 드롭다운 (debounce, URL 변경 없음 — factories 동일 패턴)
  let suggestions = $state<{ id: string; label: string; sub?: string }[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout>;

  async function fetchSuggestions(q: string) {
    if (!q.trim()) { suggestions = []; return; }
    let sq = supabase
      .from('clients')
      .select('id, name, business_number')
      .ilike('name', `%${q.trim()}%`)
      .limit(8);
    if (!data.showHidden) sq = sq.is('deleted_at', null);
    const { data: rows } = await sq;
    suggestions = (rows ?? []).map(r => ({ id: r.id, label: r.name, sub: r.business_number ?? undefined }));
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

  // ── 계약 상태
  type ContractStatus = 'active' | 'pending' | 'expired' | 'none';

  function contractStatus(start: string | null, end: string | null): ContractStatus {
    if (!start && !end) return 'none';
    const today = new Date().toISOString().slice(0, 10);
    if (start && today < start) return 'pending';
    if (end   && today > end)   return 'expired';
    return 'active';
  }

  const statusMeta: Record<ContractStatus, { label: string; cls: string }> = {
    active:  { label: '진행중',  cls: 'badge-success' },
    pending: { label: '시작 전', cls: 'badge-warning' },
    expired: { label: '종료됨',  cls: 'badge-error'   },
    none:    { label: '—',       cls: 'badge-ghost'   },
  };

  function formatDate(v: string | null) { return v ? v.slice(0, 10) : '—'; }

  // ── 모달
  let showModal     = $state(false);
  let editingClient = $state<ClientRow | null>(null);
  let formName          = $state('');
  let formBusinessNo    = $state('');
  let formEmail         = $state('');
  let formManagerName   = $state('');
  let formManagerPhone  = $state('');
  let formContractStart = $state('');
  let formContractEnd   = $state('');
  let formFactoryId     = $state('');
  let saveError         = $state('');

  $effect(() => {
    if (form?.success) closeModal();
    if (form?.error)   saveError = form.error ?? '';
  });

  function openAdd() {
    editingClient     = null;
    formName          = '';
    formBusinessNo    = '';
    formEmail         = '';
    formManagerName   = '';
    formManagerPhone  = '';
    formContractStart = '';
    formContractEnd   = '';
    formFactoryId     = myRole === 'factory_admin' ? (myFactoryId ?? '') : (factories[0]?.id ?? '');
    saveError         = '';
    showModal         = true;
  }

  function openEdit(c: ClientRow) {
    editingClient     = c;
    formName          = c.name;
    formBusinessNo    = c.business_number ?? '';
    formEmail         = c.email           ?? '';
    formManagerName   = c.manager_name    ?? '';
    formManagerPhone  = c.manager_phone   ? displayPhone(c.manager_phone) : '';
    formContractStart = c.contract_start_date ?? '';
    formContractEnd   = c.contract_end_date   ?? '';
    formFactoryId     = c.factory_id;
    saveError         = '';
    showModal         = true;
  }

  function closeModal() { showModal = false; }
</script>

<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">거래처 관리</h2>

  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="거래처명 검색..."
      items={suggestions}
      onselect={onSearchSelect}
      oninput={onSearchInput}
      onenter={(q) => navTo({ q })}
      initialValue={data.q}
      class="w-60 sm:w-72"
    />

    <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 font-semibold">
      <input
        type="checkbox"
        checked={data.showHidden}
        onchange={(e) => navTo({ hidden: e.currentTarget.checked })}
        class="checkbox checkbox-sm checkbox-primary"
      />
      비활성화 포함
    </label>

    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto">
      <Icon icon="lucide:plus" class="w-4 h-4" />
      <span class="hidden sm:inline">거래처 등록</span>
      <span class="sm:hidden">등록</span>
    </button>
  </div>

  <TableCard>
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold w-[22%]">거래처명</th>
          <th class="text-xs font-bold hidden xl:table-cell w-[14%]">사업자번호</th>
          <th class="text-xs font-bold hidden lg:table-cell w-[12%]">담당자</th>
          <th class="text-xs font-bold hidden lg:table-cell w-[14%]">연락처</th>
          <th class="text-xs font-bold hidden lg:table-cell w-[12%] whitespace-nowrap">거래 시작일</th>
          <th class="text-xs font-bold hidden lg:table-cell w-[12%] whitespace-nowrap">거래 종료일</th>
          <th class="text-xs font-bold hidden sm:table-cell w-[10%] text-center whitespace-nowrap">계약 상태</th>
          <th class="text-xs font-bold w-[8%] text-center">관리</th>
        </tr>
      </thead>
      <tbody>
        {#if data.clients.length === 0}
          <tr>
            <td colspan="8" class="py-16 text-center text-base-content/40 text-sm">
              등록된 거래처가 없습니다.
            </td>
          </tr>
        {:else}
          {#each data.clients as c (c.id)}
            {@const status = contractStatus(c.contract_start_date, c.contract_end_date)}
            <tr class="hover:bg-base-200 transition-colors {c.deleted_at ? 'opacity-40' : ''}">

              <td class="font-semibold text-base-content">
                <span class="truncate block">{c.name}</span>
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {#if c.manager_phone}
                    <span class="text-xs text-base-content/50">{displayPhone(c.manager_phone)}</span>
                  {/if}
                  {#if status !== 'none'}
                    <span class="badge badge-xs sm:hidden {statusMeta[status].cls}">{statusMeta[status].label}</span>
                  {/if}
                </div>
              </td>

              <td class="text-base-content/70 text-sm hidden xl:table-cell truncate">{c.business_number ?? '—'}</td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell truncate">{c.manager_name ?? '—'}</td>
              <td class="text-base-content/70 text-sm hidden lg:table-cell truncate">
                {c.manager_phone ? displayPhone(c.manager_phone) : '—'}
              </td>
              <td class="text-base-content/60 text-xs hidden lg:table-cell">{formatDate(c.contract_start_date)}</td>
              <td class="text-base-content/60 text-xs hidden lg:table-cell">{formatDate(c.contract_end_date)}</td>

              <td class="hidden sm:table-cell text-center">
                {#if status !== 'none'}
                  <span class="badge badge-sm {statusMeta[status].cls}">{statusMeta[status].label}</span>
                {:else}
                  <span class="text-base-content/30 text-xs">—</span>
                {/if}
              </td>

              <td>
                <div class="flex items-center justify-center">
                  <button
                    onclick={() => openEdit(c)}
                    class="btn btn-ghost btn-xs"
                    title="수정"
                  >
                    <Icon icon="lucide:pencil" class="w-3.5 h-3.5" />
                  </button>
                </div>
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
      totalPages={totalPages}
      totalItems={data.total}
      pageSize={data.PAGE_SIZE}
      onpage={(p) => navTo({ page: p })}
    />
  </div>
</div>

<!-- ───────────── 등록/수정 모달 ───────────── -->
{#if showModal}
  <dialog open class="modal modal-open">
    <div
      class="modal-backdrop"
      role="button"
      tabindex="-1"
      onclick={closeModal}
      onkeydown={(e) => e.key === 'Escape' && closeModal()}
    ></div>
    <div class="modal-box max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 600px;">

      <!-- 헤더 -->
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-lg font-extrabold text-base-content">
            {editingClient ? '거래처 수정' : '거래처 등록'}
          </h3>
          {#if editingClient}
            {@const st = contractStatus(editingClient.contract_start_date, editingClient.contract_end_date)}
            {#if st !== 'none'}
              <span class="badge badge-sm {statusMeta[st].cls}">{statusMeta[st].label}</span>
            {/if}
            {#if editingClient.deleted_at}
              <span class="badge badge-sm badge-error gap-1">
                <Icon icon="lucide:ban" class="w-3 h-3" />
                비활성화
              </span>
            {/if}
          {/if}
        </div>
        <button onclick={closeModal} class="btn btn-ghost btn-sm btn-circle">
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- 수정 폼 -->
      <form
        method="POST"
        action={editingClient ? '?/update' : '?/create'}
        use:enhance={({ formData }) => {
          saveError = '';
          if (editingClient) formData.set('id', editingClient.id);
          if (myRole === 'super_admin') formData.set('factory_id', formFactoryId);
          return async ({ result, update }) => {
            if (result.type === 'failure') {
              saveError = (result.data as { error?: string })?.error ?? '오류가 발생했습니다.';
            } else {
              await update();
              closeModal();
            }
          };
        }}
        class="flex flex-col gap-0 overflow-hidden flex-1"
      >
        <div class="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">

          <div>
            <label for="cName" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">거래처명 <span class="text-error">*</span></span>
            </label>
            <input id="cName" name="name" type="text" bind:value={formName}
              placeholder="거래처명 입력" required class="input input-bordered w-full text-sm" />
          </div>

          <div>
            <label for="cBizNo" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">사업자번호</span>
            </label>
            <input id="cBizNo" name="business_number" type="text" bind:value={formBusinessNo}
              placeholder="000-00-00000" class="input input-bordered w-full text-sm" />
          </div>

          <div>
            <label for="cEmail" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">이메일</span>
            </label>
            <input id="cEmail" name="email" type="email" bind:value={formEmail}
              placeholder="example@email.com" class="input input-bordered w-full text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cMgrName" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">담당자</span>
              </label>
              <input id="cMgrName" name="manager_name" type="text" bind:value={formManagerName}
                placeholder="담당자명" class="input input-bordered w-full text-sm" />
            </div>
            <div>
              <label for="cMgrPhone" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">연락처</span>
              </label>
              <input id="cMgrPhone" name="manager_phone" type="tel" bind:value={formManagerPhone}
                oninput={() => { formManagerPhone = formatPhone(formManagerPhone); }}
                placeholder="010-0000-0000" class="input input-bordered w-full text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cStartDate" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">거래 시작일</span>
              </label>
              <input id="cStartDate" name="contract_start_date" type="date" bind:value={formContractStart}
                class="input input-bordered w-full text-sm" />
            </div>
            <div>
              <label for="cEndDate" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">거래 종료일</span>
              </label>
              <input id="cEndDate" name="contract_end_date" type="date" bind:value={formContractEnd}
                class="input input-bordered w-full text-sm" />
            </div>
          </div>

          {#if myRole === 'super_admin'}
            <div>
              <label for="cFactory" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">소속 공장 <span class="text-error">*</span></span>
              </label>
              <select id="cFactory" bind:value={formFactoryId} class="select select-bordered w-full text-sm">
                {#each factories as f (f.id)}
                  <option value={f.id}>{f.name}</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if saveError}
            <p class="text-error text-xs">{saveError}</p>
          {/if}
        </div>

        <div class="modal-action mt-5 pt-4 border-t border-base-200 shrink-0 flex justify-between">
          <div>
            {#if editingClient}
              {#if editingClient.deleted_at}
                <button type="submit" form="form-activate" class="btn btn-sm btn-success gap-1.5 font-bold">
                  <Icon icon="lucide:circle-check" class="w-4 h-4" />
                  활성화
                </button>
              {:else}
                <button type="submit" form="form-deactivate" class="btn btn-sm btn-error btn-outline gap-1.5 font-bold">
                  <Icon icon="lucide:ban" class="w-4 h-4" />
                  비활성화
                </button>
              {/if}
            {/if}
          </div>
          <div class="flex gap-2">
            <button type="button" onclick={closeModal} class="btn btn-ghost font-bold">취소</button>
            <button type="submit" class="btn btn-primary font-bold">
              {editingClient ? '저장' : '등록'}
            </button>
          </div>
        </div>
      </form>

    </div>
  </dialog>
{/if}

<!-- 비활성화 / 활성화 전용 form (모달 바깥, form 속성으로 연결) -->
{#if editingClient}
  <form
    id="form-deactivate"
    method="POST"
    action="?/hide"
    use:enhance={() => async ({ update }) => { await update(); closeModal(); }}
  >
    <input type="hidden" name="id" value={editingClient.id} />
  </form>
  <form
    id="form-activate"
    method="POST"
    action="?/restore"
    use:enhance={() => async ({ update }) => { await update(); closeModal(); }}
  >
    <input type="hidden" name="id" value={editingClient.id} />
  </form>
{/if}
