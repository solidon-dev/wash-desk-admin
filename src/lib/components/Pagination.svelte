<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onpage: (page: number) => void;
  }

  let { currentPage, totalPages, totalItems, pageSize, onpage }: Props = $props();

  const rangeStart = $derived((currentPage - 1) * pageSize + 1);
  const rangeEnd   = $derived(Math.min(currentPage * pageSize, totalItems));
</script>

{#if totalPages > 1}
  <div class="flex items-center justify-center gap-1">
    <button
      onclick={() => onpage(1)}
      disabled={currentPage === 1}
      class="btn btn-ghost btn-xs"
      aria-label="처음"
    >
      <Icon icon="lucide:chevrons-left" class="w-3.5 h-3.5" />
    </button>
    <button
      onclick={() => onpage(currentPage - 1)}
      disabled={currentPage === 1}
      class="btn btn-ghost btn-xs"
      aria-label="이전"
    >
      <Icon icon="lucide:chevron-left" class="w-3.5 h-3.5" />
    </button>

    {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page (page)}
      {@const nearCurrent  = Math.abs(page - currentPage) <= 2}
      {@const isEdge       = page === 1 || page === totalPages}
      {@const showDotsBefore = page === currentPage - 3 && currentPage - 3 > 1}
      {@const showDotsAfter  = page === currentPage + 3 && currentPage + 3 < totalPages}
      {#if nearCurrent || isEdge}
        <button
          onclick={() => onpage(page)}
          class="btn btn-xs min-w-[2rem] {page === currentPage ? 'btn-primary' : 'btn-ghost'}"
        >{page}</button>
      {:else if showDotsBefore || showDotsAfter}
        <span class="px-1 text-base-content/30 text-xs select-none">…</span>
      {/if}
    {/each}

    <button
      onclick={() => onpage(currentPage + 1)}
      disabled={currentPage === totalPages}
      class="btn btn-ghost btn-xs"
      aria-label="다음"
    >
      <Icon icon="lucide:chevron-right" class="w-3.5 h-3.5" />
    </button>
    <button
      onclick={() => onpage(totalPages)}
      disabled={currentPage === totalPages}
      class="btn btn-ghost btn-xs"
      aria-label="마지막"
    >
      <Icon icon="lucide:chevrons-right" class="w-3.5 h-3.5" />
    </button>

    <span class="text-xs text-base-content/40 ml-2">
      {totalItems}개 중 {rangeStart}–{rangeEnd}
    </span>
  </div>
{/if}
