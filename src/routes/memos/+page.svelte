<script lang="ts">
  import { memoStore, clients } from '$lib/memoStore.svelte';

  // ── 필터 상태 ────────────────────────────────────────────────
  let statusFilter = $state<'all' | 'unread' | 'read'>('all');
  let clientFilter = $state<string>('all');

  // ── 파생 값 ──────────────────────────────────────────────────
  const unreadCount = $derived(memoStore.memos.filter((m) => !m.isRead).length);

  const filteredMemos = $derived(
    memoStore.memos.filter((m) => {
      const matchStatus =
        statusFilter === 'all' ? true : statusFilter === 'unread' ? !m.isRead : m.isRead;
      const matchClient = clientFilter === 'all' || m.clientId === clientFilter;
      return matchStatus && matchClient;
    })
  );

  // ── 유틸 ──────────────────────────────────────────────────────
  function getClientName(clientId: string): string {
    return clients.find((c) => c.id === clientId)?.name ?? '알 수 없음';
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  }

  function truncate(text: string, len = 30): string {
    return text.length > len ? text.slice(0, len) + '…' : text;
  }
</script>

<div class="min-h-screen bg-base-200 px-8 py-6 overflow-y-auto">

  <!-- ── 헤더 ──────────────────────────────────────────────── -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-extrabold text-base-content">메모 확인</h2>
      {#if unreadCount > 0}
        <div class="badge badge-primary font-bold">{unreadCount}</div>
      {/if}
    </div>

    <button
      class="btn btn-primary btn-sm"
      disabled={unreadCount === 0}
      onclick={() => memoStore.markAllRead()}
    >
      전체 읽음 처리
    </button>
  </div>

  <!-- ── 필터 바 ────────────────────────────────────────────── -->
  <div class="card bg-base-100 shadow-sm mb-5">
    <div class="card-body px-5 py-4 flex flex-row flex-wrap items-center gap-4">

      <!-- 상태 탭 -->
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-bold text-base-content/50 mr-1">상태</span>
        {#each ([
          { value: 'all',    label: '전체'    },
          { value: 'unread', label: '읽지않음' },
          { value: 'read',   label: '읽음'    },
        ] as const) as f (f.value)}
          <button
            class="btn btn-sm {statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}"
            onclick={() => (statusFilter = f.value)}
          >
            {f.label}
          </button>
        {/each}
      </div>

      <!-- 거래처 select -->
      <div class="flex items-center gap-2 ml-auto">
        <span class="text-xs font-bold text-base-content/50">거래처</span>
        <select class="select select-bordered select-sm" bind:value={clientFilter}>
          <option value="all">전체</option>
          {#each clients as client (client.id)}
            <option value={client.id}>{client.name}</option>
          {/each}
        </select>
      </div>

    </div>
  </div>

  <!-- ── 게시판 테이블 ──────────────────────────────────────── -->
  <div class="card bg-base-100 shadow-sm overflow-hidden">
    {#if filteredMemos.length === 0}
      <div class="flex flex-col items-center justify-center py-24 text-base-content/40">
        <span class="text-5xl mb-4">💬</span>
        <p class="text-base font-semibold">메모가 없습니다.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr class="text-base-content/60 text-sm">
              <th class="w-14 text-center">번호</th>
              <th class="w-32">거래처명</th>
              <th>제목</th>
              <th class="w-40">날짜</th>
              <th class="w-20 text-center">읽음</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredMemos as memo, i (memo.id)}
              {@const clientName = getClientName(memo.clientId)}
              <tr
                class="cursor-pointer hover:bg-base-200 transition-colors
                  {memo.isRead ? 'opacity-50' : ''}"
                onclick={() => { window.location.href = `/memos/${memo.id}`; }}
              >
                <!-- 번호 -->
                <td class="text-center text-sm text-base-content/50">{filteredMemos.length - i}</td>

                <!-- 거래처명 -->
                <td class="text-sm {!memo.isRead ? 'font-bold text-base-content' : 'text-base-content/70'}">
                  {clientName}
                </td>

                <!-- 제목 (내용 앞 30자) -->
                <td class="text-sm {!memo.isRead ? 'font-bold text-base-content' : 'text-base-content/70'}">
                  <div class="flex items-center gap-2">
                    {truncate(memo.title || memo.content, 30)}
                    {#if !memo.isRead}
                      <span class="badge badge-primary badge-sm font-extrabold tracking-wide">NEW</span>
                    {/if}
                  </div>
                </td>

                <!-- 날짜 -->
                <td class="text-xs text-base-content/50">{formatDate(memo.createdAt)}</td>

                <!-- 읽음 여부 -->
                <td class="text-center">
                  {#if memo.isRead}
                    <span class="text-xs text-base-content/40">읽음</span>
                  {:else}
                    <span class="inline-block w-2 h-2 rounded-full bg-primary"></span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

</div>
