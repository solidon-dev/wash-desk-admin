<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    placeholder?: string;
    items: { id: string; label: string; sub?: string }[];
    onselect: (id: string) => void;
    class?: string;
  }

  let { placeholder = '검색...', items, onselect, class: className = '' }: Props = $props();

  let query     = $state('');
  let activeIdx = $state(-1);
  let open      = $state(false);
  let inputEl   = $state<HTMLInputElement | null>(null);
  // confirm() 직후 effect가 다시 open시키지 못하도록 guard
  let justConfirmed = false;

  const suggestions = $derived(
    query.trim() === ''
      ? []
      : items
          .filter(
            (it) =>
              it.label.toLowerCase().includes(query.trim().toLowerCase()) ||
              (it.sub ?? '').toLowerCase().includes(query.trim().toLowerCase())
          )
          .slice(0, 8)
  );

  // query가 바뀌면 인덱스 리셋 + 드롭다운 열기
  // (단, confirm 직후에는 건너뜀)
  $effect(() => {
    const q = query; // 의존성 등록
    if (justConfirmed) return;
    activeIdx = -1;
    open = q.trim() !== '' && suggestions.length > 0;
    // 타이핑했는데 일치 결과가 0개면 선택 해제
    if (q.trim() !== '' && suggestions.length === 0) {
      onselect('');
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
      activeIdx = -1;
      return;
    }
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        confirm(suggestions[0].id);
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
      confirm(activeIdx >= 0 ? suggestions[activeIdx].id : suggestions[0].id);
    }
  }

  function confirm(id: string) {
    const found = items.find((it) => it.id === id);
    // guard 세우고 query 변경 → effect가 open을 켜지 못하도록
    justConfirmed = true;
    open = false;
    activeIdx = -1;
    if (found) query = found.label;
    onselect(id);
    // 다음 마이크로태스크에서 guard 해제
    Promise.resolve().then(() => { justConfirmed = false; });
  }

  function handleBlur() {
    // 리스트 항목 클릭이 먼저 처리되도록 한 프레임 대기
    setTimeout(() => { open = false; }, 100);
  }

  function clearQuery() {
    justConfirmed = true;
    query = '';
    open = false;
    activeIdx = -1;
    onselect('');
    Promise.resolve().then(() => { justConfirmed = false; });
    inputEl?.focus();
  }

  // onselect('') 외부 호출 시 query 클리어 (selectedId 외부에서 리셋될 때)
  export function reset() {
    clearQuery();
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
      onfocus={() => { if (!justConfirmed && suggestions.length > 0) open = true; }}
      autocomplete="off"
      class="grow text-sm bg-transparent outline-none"
    />
    {#if query}
      <button
        type="button"
        onmousedown={(e) => e.preventDefault()}
        onclick={clearQuery}
        class="text-error/60 hover:text-error transition-colors"
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
