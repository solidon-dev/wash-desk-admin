<script lang="ts">
  import Icon from '@iconify/svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import TableCard from '$lib/components/TableCard.svelte';
  import type { PageData } from './$types';
  import { formatPhone, displayPhone } from '$lib/utils/phone';

  type Props = {
    data: PageData & {
      clients: ClientRow[];
      q: string;
      showHidden: boolean;
      role: string;
      factory_id: string | null;
      factories: { id: string; name: string }[];
    };
    form: { success?: boolean; error?: string } | null;
  };
  let { data, form }: Props = $props();

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

  const myRole      = $derived(data.role as 'super_admin' | 'factory_admin' | 'worker');
  const myFactoryId = $derived(data.factory_id);
  const factories   = $derived(data.factories);

  const clients = $derived(data.clients);

  // 서버 액션 성공 시 재로드
  $effect(() => {
    if (form?.success) closeModal();
    if (form?.error)   saveError = form.error ?? '';
  });

  // ── 검색 / 필터 (URL 파라미터 기반)
  const searchItems = $derived(
    clients
      .filter(c => !c.deleted_at)
      .map(c => ({ id: c.id, label: c.name, sub: c.business_number ?? undefined }))
  );

  function navTo(params: { q?: string; showHidden?: boolean }) {
    const q          = params.q          ?? data.q;
    const showHidden = params.showHidden ?? data.showHidden;
    const parts: string[] = [];
    if (q)          parts.push(`q=${encodeURIComponent(q)}`);
    if (showHidden) parts.push('showHidden=true');
    goto(parts.length ? `?${parts.join('&')}` : '?');
  }

  let selectedId  = $state('');

  function onSearchSelect(id: string) { selectedId = id; }
  function onSearchInput()            { selectedId = ''; }

  // ── 계약 상태 계산
  type ContractStatus = 'active' | 'pending' | 'expired' | 'none';

  function contractStatus(start: string | null, end: string | null): ContractStatus {
    if (!start && !end) return 'none';
    const today = new Date().toISOString().slice(0, 10);
    if (start && today < start) return 'pending';
    if (end   && today > end)   return 'expired';
    return 'active';
  }

  const statusMeta: Record<ContractStatus, { label: string; cls: string }> = {
    active:  { label: '진행중',  cls: 'badge-success'  },
    pending: { label: '시작 전', cls: 'badge-warning'  },
    expired: { label: '종료됨',  cls: 'badge-error'    },
    none:    { label: '—',       cls: 'badge-ghost'    },
  };

  // ── 페이지네이션 (클라이언트 필터)
  const PAGE_SIZE = 10;
  let currentPage = $state(1);

  const filteredClients = $derived(
    clients.filter(c => {
      if (!data.showHidden && c.deleted_at !== null) return false;
      if (selectedId) return c.id === selectedId;
      return true;
    })
  );

  $effect(() => { void filteredClients; currentPage = 1; });

  const totalPages    = $derived(Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE)));
  const visibleClients = $derived(filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

  function formatDate(v: string | null) { return v ? v.slice(0, 10) : '—'; }

  // ── 모달
  let showModal      = $state(false);
  let editingClient  = $state<ClientRow | null>(null);
  let formName             = $state('');
  let formBusinessNo       = $state('');
  let formEmail            = $state('');
  let formManagerName      = $state('');
  let formManagerPhone     = $state('');
  let formContractStart    = $state('');
  let formContractEnd      = $state('');
  let formFactoryId        = $state('');
  let saveError            = $state('');

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

  // ── 숨기기 확인
  let hideTargetId = $state<string | null>(null);
  function openHide(id: string) { hideTargetId = id; }
  function cancelHide()         { hideTargetId = null; }
</script>

<div class="min-h-full bg-base-200 px-8 py-10">
  <h2 class="text-2xl font-extrabold text-base-content mb-5">거래처 관리</h2>

  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="거래처명 검색..."
      items={searchItems}
      onselect={onSearchSelect}
      oninput={onSearchInput}
      onenter={(q) => navTo({ q })}
      initialValue={data.q}
      class="w-56 sm:w-64"
    />

    <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 font-semibold">
      <input
        type="checkbox"
        checked={data.showHidden}
        onchange={(e) => navTo({ showHidden: e.currentTarget.checked })}
        class="checkbox checkbox-sm checkbox-primary"
      />
      숨김 포함
    </label>

    <button onclick={openAdd} class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto sm:w-auto w-full">
      <Icon icon="lucide:plus" class="w-4 h-4" />
      <span class="hidden sm:inline">거래처 등록</span>
      <span class="sm:hidden">등록</span>
    </button>
  </div>

  <TableCard>
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <!-- 거래처명 -->
          <th class="text-xs font-bold w-[22%]">거래처명</th>
          <!-- 사업자번호 - xl 이상 -->
          <th class="text-xs font-bold hidden xl:table-cell w-[14%]">사업자번호</th>
          <!-- 담당자 - lg 이상 -->
          <th class="text-xs font-bold hidden lg:table-cell w-[12%]">담당자</th>
          <!-- 연락처 - lg 이상 -->
          <th class="text-xs font-bold hidden lg:table-cell w-[14%]">연락처</th>
          <!-- 거래 시작일 - lg 이상 -->
          <th class="text-xs font-bold hidden lg:table-cell w-[12%] whitespace-nowrap">거래 시작일</th>
          <!-- 거래 종료일 - lg 이상 -->
          <th class="text-xs font-bold hidden lg:table-cell w-[12%] whitespace-nowrap">거래 종료일</th>
          <!-- 계약 상태 - sm 이상 -->
          <th class="text-xs font-bold hidden sm:table-cell w-[10%] text-center whitespace-nowrap">계약 상태</th>
          <!-- 액션 -->
          <th class="text-xs font-bold w-[8%] text-center">관리</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredClients.length === 0}
          <tr>
            <td colspan="8" class="py-16 text-center text-base-content/40 text-sm">
              등록된 거래처가 없습니다.
            </td>
          </tr>
        {:else}
          {#each visibleClients as c (c.id)}
            {@const status = contractStatus(c.contract_start_date, c.contract_end_date)}
            <tr class="hover:bg-base-200 transition-colors {c.deleted_at ? 'opacity-40' : ''}">

              <!-- 거래처명 (항상 표시) -->
              <td class="font-semibold text-base-content">
                <span class="truncate block">{c.name}</span>
                {#if c.deleted_at}
                  <span class="badge badge-ghost badge-xs ml-1">숨김</span>
                {/if}
                <!-- 모바일: 요약 정보 -->
                <div class="lg:hidden mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {#if c.manager_phone}
                    <span class="text-xs text-base-content/50">{displayPhone(c.manager_phone)}</span>
                  {/if}
                  <!-- sm 미만에서 상태 배지 -->
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

              <!-- 계약 상태 배지 -->
              <td class="hidden sm:table-cell text-center">
                {#if status !== 'none'}
                  <span class="badge badge-sm {statusMeta[status].cls}">{statusMeta[status].label}</span>
                {:else}
                  <span class="text-base-content/30 text-xs">—</span>
                {/if}
              </td>

              <!-- 관리 버튼 -->
              <td>
                <div class="flex items-center justify-center gap-1">
                  <button
                    onclick={() => openEdit(c)}
                    class="btn btn-ghost btn-xs"
                    title="수정"
                  >
                    <Icon icon="lucide:pencil" class="w-3.5 h-3.5" />
                  </button>
                  {#if c.deleted_at}
                    <form method="POST" action="?/restore" use:enhance>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" class="btn btn-ghost btn-xs text-success" title="복원">
                        <Icon icon="lucide:eye" class="w-3.5 h-3.5" />
                      </button>
                    </form>
                  {:else}
                    <button
                      onclick={() => openHide(c.id)}
                      class="btn btn-ghost btn-xs text-warning"
                      title="숨기기"
                    >
                      <Icon icon="lucide:eye-off" class="w-3.5 h-3.5" />
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

  <div class="mt-4">
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={filteredClients.length}
      pageSize={PAGE_SIZE}
      onpage={(p) => (currentPage = p)}
    />
  </div>
</div>

<!-- ───────────── 등록/수정 모달 ───────────── -->
{#if showModal}
  <dialog open class="modal modal-open">
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={closeModal} onkeydown={closeModal}></div>
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 600px;">

      <!-- 헤더 -->
      <div class="flex items-center justify-between mb-5 shrink-0">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-extrabold text-base-content">
            {editingClient ? '거래처 수정' : '거래처 등록'}
          </h3>
          {#if editingClient}
            {@const st = contractStatus(editingClient.contract_start_date, editingClient.contract_end_date)}
            {#if st !== 'none'}
              <span class="badge badge-sm {statusMeta[st].cls}">{statusMeta[st].label}</span>
            {/if}
          {/if}
        </div>
        <button onclick={closeModal} class="btn btn-ghost btn-sm btn-circle">
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- 폼 -->
      <form
        method="POST"
        action={editingClient ? '?/update' : '?/create'}
        use:enhance={({ formData }) => {
          saveError = '';
          if (editingClient) formData.set('id', editingClient.id);
          // factory_admin은 factory_id 서버에서 자동 세팅
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

          <!-- 거래처명 -->
          <div>
            <label for="cName" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">거래처명 <span class="text-error">*</span></span>
            </label>
            <input
              id="cName"
              name="name"
              type="text"
              bind:value={formName}
              placeholder="거래처명 입력"
              required
              class="input input-bordered input-sm w-full"
            />
          </div>

          <!-- 사업자번호 -->
          <div>
            <label for="cBizNo" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">사업자번호</span>
            </label>
            <input
              id="cBizNo"
              name="business_number"
              type="text"
              bind:value={formBusinessNo}
              placeholder="000-00-00000"
              class="input input-bordered input-sm w-full"
            />
          </div>

          <!-- 이메일 -->
          <div>
            <label for="cEmail" class="label pb-1">
              <span class="label-text text-xs font-bold text-base-content/60">이메일</span>
            </label>
            <input
              id="cEmail"
              name="email"
              type="email"
              bind:value={formEmail}
              placeholder="example@email.com"
              class="input input-bordered input-sm w-full"
            />
          </div>

          <!-- 담당자 / 연락처 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cMgrName" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">담당자</span>
              </label>
              <input
                id="cMgrName"
                name="manager_name"
                type="text"
                bind:value={formManagerName}
                placeholder="담당자명"
                class="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label for="cMgrPhone" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">연락처</span>
              </label>
              <input
                id="cMgrPhone"
                name="manager_phone"
                type="tel"
                bind:value={formManagerPhone}
                oninput={() => { formManagerPhone = formatPhone(formManagerPhone); }}
                placeholder="010-0000-0000"
                class="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          <!-- 계약 기간 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cStartDate" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">거래 시작일</span>
              </label>
              <input
                id="cStartDate"
                name="contract_start_date"
                type="date"
                bind:value={formContractStart}
                class="input input-bordered input-sm w-full"
              />
            </div>
            <div>
              <label for="cEndDate" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">거래 종료일</span>
              </label>
              <input
                id="cEndDate"
                name="contract_end_date"
                type="date"
                bind:value={formContractEnd}
                class="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          <!-- 공장 선택 (super_admin만) -->
          {#if myRole === 'super_admin'}
            <div>
              <label for="cFactory" class="label pb-1">
                <span class="label-text text-xs font-bold text-base-content/60">소속 공장 <span class="text-error">*</span></span>
              </label>
              <select
                id="cFactory"
                bind:value={formFactoryId}
                class="select select-bordered select-sm w-full"
              >
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

<!-- ───────────── 숨기기 확인 모달 ───────────── -->
{#if hideTargetId}
  {@const target = clients.find(c => c.id === hideTargetId)}
  <dialog open class="modal modal-open">
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={cancelHide} onkeydown={cancelHide}></div>
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold text-base-content mb-2">거래처 숨기기</h3>
      <p class="text-sm text-base-content/70 mb-6">
        <span class="font-bold text-warning">{target?.name}</span> 거래처를 숨기겠습니까?<br />
        <span class="text-xs text-base-content/40">숨긴 항목은 '숨김 포함' 체크 시 다시 확인할 수 있습니다.</span>
      </p>
      <div class="modal-action">
        <button onclick={cancelHide} class="btn btn-ghost font-bold">취소</button>
        <form method="POST" action="?/hide" use:enhance={() => {
          return async ({ update }) => { await update(); hideTargetId = null; };
        }}>
          <input type="hidden" name="id" value={hideTargetId} />
          <button type="submit" class="btn btn-warning font-bold">숨기기</button>
        </form>
      </div>
    </div>
  </dialog>
{/if}
