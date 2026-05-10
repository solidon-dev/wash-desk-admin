<script lang="ts">
  import { page } from '$app/state';
  import { memoStore, clients } from '$lib/memoStore.svelte';

  // ── 현재 메모 ID ─────────────────────────────────────────────
  const memoId = $derived(page.params.id);

  // ── 메모 조회 ────────────────────────────────────────────────
  const memo = $derived(memoStore.getById(memoId));

  // ── 진입 즉시 읽음 처리 ──────────────────────────────────────
  $effect(() => {
    if (memoId) {
      memoStore.markRead(memoId);
    }
  });

  // ── 거래처명 조회 ────────────────────────────────────────────
  const clientName = $derived(
    memo ? (clients.find((c) => c.id === memo.clientId)?.name ?? '알 수 없음') : ''
  );

  // ── 날짜 포맷 ────────────────────────────────────────────────
  function formatDate(iso: string): string {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  }

  // ── 삭제 ─────────────────────────────────────────────────────
  function handleDelete() {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      memoStore.deleteMemo(memoId);
      window.location.href = '/memos';
    }
  }
</script>

<div class="min-h-screen bg-base-200 px-8 py-6 overflow-y-auto">

  <!-- ── 상단 네비게이션 ───────────────────────────────────── -->
  <div class="mb-6">
    <a
      href="/memos"
      class="btn btn-ghost btn-sm gap-1 text-base-content/70 hover:text-base-content"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      목록으로
    </a>
  </div>

  {#if memo}
    <!-- ── 메모 상세 카드 ─────────────────────────────────── -->
    <div class="card bg-base-100 shadow-sm max-w-2xl mx-auto">
      <div class="card-body gap-5 p-8">

        <!-- 거래처명 (제목) -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-base-content">{clientName}</h1>
            <p class="text-base font-semibold text-base-content/70 mt-1">{memo.title}</p>
          </div>
          <span class="badge badge-outline badge-sm text-base-content/50 shrink-0 mt-1">읽음</span>
        </div>

        <!-- 날짜 -->
        <div class="flex items-center gap-2 text-sm text-base-content/50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(memo.createdAt)}
        </div>

        <div class="divider my-0"></div>

        <!-- 본문 -->
        <div class="text-base text-base-content leading-relaxed whitespace-pre-wrap wrap-break-word min-h-32">
          {memo.content}
        </div>

        <div class="divider my-0"></div>

        <!-- 하단 액션 -->
        <div class="flex justify-end">
          <button
            class="btn btn-error btn-outline btn-sm"
            onclick={handleDelete}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            삭제
          </button>
        </div>

      </div>
    </div>

  {:else}
    <!-- ── 메모 없음 ──────────────────────────────────────── -->
    <div class="flex flex-col items-center justify-center py-32 text-base-content/40">
      <span class="text-5xl mb-4">🔍</span>
      <p class="text-base font-semibold">메모를 찾을 수 없습니다.</p>
      <a href="/memos" class="btn btn-primary btn-sm mt-6">
        목록으로 돌아가기
      </a>
    </div>
  {/if}

</div>
