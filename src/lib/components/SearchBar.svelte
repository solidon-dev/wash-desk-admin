<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    placeholder?: string;
    items: { id: string; label: string; sub?: string }[];
    onselect: (id: string) => void;
    class?: string;
  }

  let { placeholder = '검색...', items, onselect, class: className = '' }: Props = $props();

  let query      = $state('');
  let activeIdx  = $state(-1);
  let open       = $state(false);
  let inputEl    = $state<HTMLInputElement | null>(null);

  const suggestions = $derived(
    query.trim() === ''
      ? []
      : items.filter(
          (it) =>
            it.label.toLowerCase().includes(query.trim().toLowerCase()) ||
            (it.sub ?? '').toLowerCase().includes(query.trim().toLowerCase())
        ).slice(0, 8)
  );

  $effect(() => {
    // 쿼리 바뀌면 선택 인덱스 초기화
    query;
    activeIdx = -1;
    open = query.trim() !== '' && suggestions.length > 0;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        // 미리보기 없이 엔터 → 첫번째 매칭으로 선택
        if (suggestions.length > 0) {
          confirm(suggestions[0].id);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, suggestions.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        confirm(suggestions[activeIdx].id);
      } else if (suggestions.length > 0) {
        confirm(suggestions[0].id);
      }
    } else if (e.key === 'Escape') {
      open = false;
      activeIdx = -1;
    }
  }

  function confirm(id: string) {
    const found = items.find((it) => it.id === id);
    if (found) query = found.label;
    open = false;
    activeIdx = -1;
    onselect(id);
  }

  function handleBlur() {
    // 클릭 이벤트가 먼저 처리될 수 있도록 약간 지연
    setTimeout(() => { open = false; }, 150);
  }

  function clearQuery() {
    query = '';
    open = false;
    activeIdx = -1;
    onselect('');
    inputEl?.focus();
  }
</script>

<div class="relative {className}">
  <label class="input input-bordered input-sm flex items-center gap-2 bg-base-100 w-full">
    <Icon icon="lucide:search" class="w-4 h-4 text-base-content/40 shrink-0" />
    <input
      bind:this={inputEl}
      type="text"
      {placeholder}
      bind:value={query}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      onfocus={() => { if (suggestions.length > 0) open = true; }}
      autocomplete="off"
      class="grow text-sm bg-transparent outline-none"
    />
    {#if query}
      <button
        type="button"
        onmousedown={(e) => e.preventDefault()}
        onclick={clearQuery}
        class="text-base-content/30 hover:text-base-content/60 transition-colors"
        aria-label="검색 초기화"
      >
        <Icon icon="lucide:x" class="w-3.5 h-3.5" />
      </button>
    {/if}
  </label>

  {#if open && suggestions.length > 0}
    <ul
      class="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-xl shadow-lg z-50 overflow-hidden"
      role="listbox"
    >
      {#each suggestions as item, i (item.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          role="option"
          aria-selected={i === activeIdx}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => confirm(item.id)}
          onmouseenter={() => (activeIdx = i)}
          class="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors
            {i === activeIdx ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'}"
        >
          <Icon icon="lucide:search" class="w-3.5 h-3.5 shrink-0 text-base-content/30" />
          <span class="font-semibold">{item.label}</span>
          {#if item.sub}
            <span class="text-base-content/40 text-xs ml-1">{item.sub}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
