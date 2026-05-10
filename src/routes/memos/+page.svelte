<script lang="ts">
  import Icon from '@iconify/svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import TableCard from '$lib/components/TableCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { memoStore, clients } from '$lib/memoStore.svelte';
  import type { ClientMemo } from '$lib/memoStore.svelte';

  // ── 검색 ────────────────────────────────────────────────────
  let selectedId = $state('');
  const searchItems = $derived(
    memoStore.memos.map((m) => ({
      id: m.id,
      label: clients.find((c) => c.id === m.clientId)?.name ?? '알 수 없음',
      sub: m.title,
    }))
  );

  // ── 필터 ────────────────────────────────────────────────────
  let statusFilter = $state<'all' | 'unread' | 'read'>('all');
  let clientFilter = $state<string>('all');

  // ── 파생값 ──────────────────────────────────────────────────
  const unreadCount = $derived(memoStore.memos.filter((m) => !m.isRead).length);

  const filteredMemos = $derived(
    memoStore.memos.filter((m) => {
      if (selectedId) return m.id === selectedId;
      const matchStatus =
        statusFilter === 'all' ? true : statusFilter === 'unread' ? !m.isRead : m.isRead;
      const matchClient = clientFilter === 'all' || m.clientId === clientFilter;
      return matchStatus && matchClient;
    })
  );

  // ── 페이지네이션 ─────────────────────────────────────────────
  const PAGE_SIZE = 10;
  let currentPage = $state(1);
  $effect(() => { filteredMemos; currentPage = 1; });

  const totalPages = $derived(Math.max(1, Math.ceil(filteredMemos.length / PAGE_SIZE)));
  const visibleMemos = $derived(
    filteredMemos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  );

  // ── 유틸 ────────────────────────────────────────────────────
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

  // ── 상세 모달 ────────────────────────────────────────────────
  let viewingMemo = $state<ClientMemo | null>(null);

  function openMemo(memo: ClientMemo) {
    viewingMemo = memo;
    memoStore.markRead(memo.id);
  }

  function closeModal() {
    viewingMemo = null;
  }

  // ── 삭제 ────────────────────────────────────────────────────
  let deleteTargetId = $state<string | null>(null);

  function confirmDelete() {
    if (deleteTargetId) {
      memoStore.deleteMemo(deleteTargetId);
      deleteTargetId = null;
      viewingMemo = null;
    }
  }
</script>

<!-- ───────────────────────── 메인 ───────────────────────── -->
<div class="min-h-full bg-base-200 px-8 py-10">

  <h2 class="text-2xl font-extrabold text-base-content mb-5">
    메모 확인
    {#if unreadCount > 0}
      <span class="badge badge-primary font-bold ml-2">{unreadCount}</span>
    {/if}
  </h2>

  <!-- 검색 / 필터 / 버튼 바 -->
  <div class="flex flex-wrap items-center gap-3 mb-5">
    <SearchBar
      placeholder="거래처명, 제목 검색..."
      items={searchItems}
      onselect={(id) => (selectedId = id)}
      class="w-64 sm:w-72"
    />

    <!-- 상태 탭 -->
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

    <!-- 거래처 select -->
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

    <!-- 전체 읽음 -->
    <button
      class="btn btn-primary btn-sm gap-2 whitespace-nowrap ml-auto"
      disabled={unreadCount === 0}
      onclick={() => memoStore.markAllRead()}
    >
      <Icon icon="lucide:check-check" class="w-4 h-4" />
      전체 읽음
    </button>
  </div>

  <!-- 테이블 -->
  <TableCard>
    <table class="table table-sm w-full" style="table-layout: fixed;">
      <thead class="bg-base-200 text-base-content/60">
        <tr>
          <th class="text-xs font-bold w-[25%] sm:w-[20%]">거래처명</th>
          <th class="text-xs font-bold">제목</th>
          <th class="text-xs font-bold hidden sm:table-cell w-[20%]">날짜</th>
          <th class="text-xs font-bold text-center w-[12%] sm:w-[8%]">상태</th>
        </tr>
      </thead>
      <tbody>
        {#if filteredMemos.length === 0}
          <tr>
            <td colspan="4" class="py-16 text-center text-base-content/40 text-sm">
              메모가 없습니다.
            </td>
          </tr>
        {:else}
          {#each visibleMemos as memo (memo.id)}
            {@const clientName = getClientName(memo.clientId)}
            <tr
              class="cursor-pointer hover:bg-base-200 transition-colors {memo.isRead ? 'opacity-60' : ''}"
              onclick={() => openMemo(memo)}
            >
              <!-- 거래처명 -->
              <td class="font-semibold text-base-content text-sm">
                {clientName}
                <div class="sm:hidden mt-0.5 text-xs text-base-content/40">
                  {formatDate(memo.createdAt)}
                </div>
              </td>

              <!-- 제목 -->
              <td class="text-sm {!memo.isRead ? 'font-semibold text-base-content' : 'text-base-content/70'}">
                <div class="flex items-center gap-2">
                  {truncate(memo.title || memo.content)}
                  {#if !memo.isRead}
                    <span class="badge badge-primary badge-sm font-extrabold shrink-0">NEW</span>
                  {/if}
                </div>
              </td>

              <!-- 날짜 -->
              <td class="text-xs text-base-content/50 hidden sm:table-cell whitespace-nowrap">
                {formatDate(memo.createdAt)}
              </td>

              <!-- 상태 -->
              <td class="text-center">
                {#if memo.isRead}
                  <Icon icon="lucide:check" class="w-4 h-4 text-base-content/30 inline" />
                {:else}
                  <span class="inline-block w-2 h-2 rounded-full bg-primary"></span>
                {/if}
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
  {@const clientName = getClientName(memo.clientId)}
  <dialog
    open
    aria-modal="true"
    class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && closeModal()}
  >
    <div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col" style="max-height: 600px;">

      <!-- 헤더 -->
      <div class="flex items-start justify-between mb-4 shrink-0">
        <div>
          <p class="text-xs font-bold text-base-content/40 uppercase tracking-wide mb-1">{clientName}</p>
          <h3 class="text-lg font-extrabold text-base-content leading-snug">{memo.title}</h3>
        </div>
        <button onclick={closeModal} aria-label="닫기" class="btn btn-ghost btn-sm btn-circle shrink-0 ml-3">
          <Icon icon="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <!-- 날짜 -->
      <p class="text-xs text-base-content/40 mb-4 shrink-0">
        <Icon icon="lucide:clock" class="w-3.5 h-3.5 inline mr-1" />{formatDate(memo.createdAt)}
      </p>

      <div class="divider my-0 shrink-0"></div>

      <!-- 본문 -->
      <div class="flex-1 overflow-y-auto py-4 text-sm text-base-content leading-relaxed whitespace-pre-wrap">
        {memo.content}
      </div>

      <div class="divider my-0 shrink-0"></div>

      <!-- 푸터 -->
      <div class="flex justify-between items-center pt-4 shrink-0">
        <button
          class="btn btn-error btn-outline btn-sm gap-1"
          onclick={() => { deleteTargetId = memo.id; }}
        >
          <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          삭제
        </button>
        <button onclick={closeModal} class="btn btn-ghost btn-sm font-bold">닫기</button>
      </div>

    </div>
    <div
      class="modal-backdrop"
      role="button"
      tabindex="-1"
      onclick={closeModal}
      onkeydown={(e) => e.key === 'Escape' && closeModal()}
    ></div>
  </dialog>
{/if}

<!-- ───────────────────────── 삭제 확인 모달 ───────────────────────── -->
{#if deleteTargetId}
  {@const target = memoStore.memos.find((m) => m.id === deleteTargetId)}
  <dialog
    open
    aria-modal="true"
    class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && (deleteTargetId = null)}
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
    <div
      class="modal-backdrop"
      role="button"
      tabindex="-1"
      onclick={() => (deleteTargetId = null)}
      onkeydown={(e) => e.key === 'Escape' && (deleteTargetId = null)}
    ></div>
  </dialog>
{/if}
