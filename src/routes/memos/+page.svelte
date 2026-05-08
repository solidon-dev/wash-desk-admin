<script lang="ts">
  interface ClientMemo {
    id: string;
    clientId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
  }

  let memos = $state<ClientMemo[]>([
    { id: 'memo-001', clientId: 'client-001', content: '다음주 월요일 수거 시간 오전 10시로 변경 부탁드립니다.',    isRead: false, createdAt: '2025-01-15T09:30:00' },
    { id: 'memo-002', clientId: 'client-002', content: '타올 추가 50장 필요합니다. 빠른 처리 부탁드려요.',          isRead: false, createdAt: '2025-01-16T14:20:00' },
    { id: 'memo-003', clientId: 'client-003', content: '이번달 청구서 확인 부탁드립니다.',                          isRead: true,  createdAt: '2025-01-14T11:00:00' },
    { id: 'memo-004', clientId: 'client-001', content: '시트 세탁 상태가 좋지 않습니다. 확인 부탁드립니다.',         isRead: false, createdAt: '2025-01-17T08:45:00' },
  ]);

  const clients = [
    { id: 'client-001', name: '그랜드호텔'    },
    { id: 'client-002', name: '오션뷰펜션'    },
    { id: 'client-003', name: '제주리조트'    },
    { id: 'client-004', name: '힐사이드호텔'  },
    { id: 'client-005', name: '선셋펜션'      },
    { id: 'client-006', name: '블루라군리조트' },
  ];

  const unreadMemoCount = $derived(memos.filter((m) => !m.isRead).length);

  // ── 필터 상태 ─────────────────────────────────────────────────
  let statusFilter = $state<'all' | 'unread' | 'read'>('all');
  let clientFilter = $state<string>('all');

  // ── 필터링된 메모 ─────────────────────────────────────────────
  const filteredMemos = $derived(
    memos.filter((m) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unread'
          ? !m.isRead
          : m.isRead;
      const matchClient = clientFilter === 'all' || m.clientId === clientFilter;
      return matchStatus && matchClient;
    })
  );

  // ── 전체 읽음 처리 ────────────────────────────────────────────
  function markAllRead() {
    memos.filter((m) => !m.isRead).forEach((m) => { m.isRead = true; });
  }

  // ── 날짜 포맷 ─────────────────────────────────────────────────
  function formatDate(iso: string): string {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  }

  // ── 거래처 이름 조회 ──────────────────────────────────────────
  function getClientName(clientId: string): string {
    return clients.find((c) => c.id === clientId)?.name ?? '알 수 없음';
  }

  // ── 삭제 확인 ─────────────────────────────────────────────────
  function handleDelete(memo: ClientMemo) {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      memos = memos.filter((m) => m.id !== memo.id);
    }
  }
</script>

<div class="px-8 py-6 min-h-full bg-base-200">

  <!-- ── 상단 헤더 ──────────────────────────────────────────── -->
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-extrabold text-base-content">메모 확인</h2>
      {#if unreadMemoCount > 0}
        <div class="badge badge-primary font-bold">{unreadMemoCount}</div>
      {/if}
    </div>

    <button
      class="btn btn-primary btn-sm"
      disabled={unreadMemoCount === 0}
      onclick={markAllRead}
    >
      전체 읽음 처리
    </button>
  </div>

  <!-- ── 필터 바 ────────────────────────────────────────────── -->
  <div class="card bg-base-100 shadow-sm mb-5">
    <div class="card-body px-5 py-4 flex flex-row flex-wrap items-center gap-4">

      <!-- 상태 필터 -->
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

      <!-- 거래처 필터 -->
      <div class="flex items-center gap-2 ml-auto">
        <span class="text-xs font-bold text-base-content/50">거래처</span>
        <select
          class="select select-bordered select-sm"
          bind:value={clientFilter}
        >
          <option value="all">전체</option>
          {#each clients as client (client.id)}
            <option value={client.id}>{client.name}</option>
          {/each}
        </select>
      </div>

    </div>
  </div>

  <!-- ── 메모 카드 그리드 ───────────────────────────────────── -->
  {#if filteredMemos.length === 0}
    <div class="flex flex-col items-center justify-center py-24 text-base-content/40">
      <span class="text-5xl mb-4">💬</span>
      <p class="text-base font-semibold">메모가 없습니다.</p>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-4">
      {#each filteredMemos as memo (memo.id)}
        {@const clientName = getClientName(memo.clientId)}
        <div
          class="card shadow-sm flex flex-col transition-all
            {memo.isRead
              ? 'bg-base-100 opacity-75'
              : 'bg-primary/10 border border-primary/30'}"
        >
          <!-- 카드 헤더 -->
          <div class="flex items-center gap-2 px-5 pt-4 pb-2">
            <span class="font-bold text-base-content text-sm">{clientName}</span>
            {#if !memo.isRead}
              <div class="badge badge-primary ml-auto text-[11px] font-extrabold tracking-wide">NEW</div>
            {/if}
          </div>

          <!-- 내용 -->
          <div class="px-5 py-2 flex-1">
            <p class="text-sm text-base-content/80 leading-relaxed overflow-auto max-h-24 whitespace-pre-wrap break-words">
              {memo.content}
            </p>
          </div>

          <!-- 카드 푸터 -->
          <div class="flex items-center gap-2 px-5 pb-4 pt-3 border-t border-base-200 mt-2">
            <span class="text-xs text-base-content/40 flex-1">{formatDate(memo.createdAt)}</span>

            {#if !memo.isRead}
              <button
                class="btn btn-primary btn-sm"
                onclick={() => { const m = memos.find((x) => x.id === memo.id); if (m) m.isRead = true; }}
              >
                읽음처리
              </button>
            {:else}
              <span class="text-xs text-base-content/40 font-medium px-3 py-1.5">읽음</span>
            {/if}

            <button
              class="btn btn-error btn-sm btn-ghost"
              onclick={() => handleDelete(memo)}
            >
              삭제
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

</div>
