<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    placeholder?: string;
    items: { id: string; label: string; sub?: string }[];
    onselect: (id: string) => void;
    oninput?: (value: string) => void;
    onenter?: (value: string) => void;
    initialValue?: string;
    class?: string;
  }

  let { placeholder = '검색...', items, onselect, oninput, onenter, initialValue = '', class: className = '' }: Props = $props();

  let query     = $state('');
  let activeIdx = $state(-1);
  let open      = $state(false);
  let inputEl   = $state<HTMLInputElement | null>(null);
  let justConfirmed = false;

  $effect(() => {
    if (!justConfirmed) query = initialValue ?? '';
  });

  const suggestions = $derived(
    query.trim() === ''
      ? []
      : items
          .filter(it =>
            it.label.toLowerCase().includes(query.trim().toLowerCase()) ||
            (it.sub ?? '').toLowerCase().includes(query.trim().toLowerCase())
          )
          .slice(0, 8)
  );

  $effect(() => {
    const q = query;
    if (justConfirmed) return;
    activeIdx = -1;
    open = q.trim() !== '' && suggestions.length > 0;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { open = false; activeIdx = -1; return; }
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions.length > 0) confirmItem(suggestions[0].id);
        else onenter?.(query);
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, suggestions.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, -1); }
    else if (e.key === 'Enter') { e.preventDefault(); confirmItem(activeIdx >= 0 ? suggestions[activeIdx].id : suggestions[0].id); }
  }

  function confirmItem(id: string) {
    const found = items.find(it => it.id === id);
    justConfirmed = true;
    open = false;
    activeIdx = -1;
    if (found) query = found.label;
    onselect(id);
    Promise.resolve().then(() => { justConfirmed = false; });
  }

  function handleBlur() {
    setTimeout(() => { open = false; }, 100);
  }

  function clearQuery() {
    justConfirmed = true;
    query = '';
    open = false;
    activeIdx = -1;
    Promise.resolve().then(() => { justConfirmed = false; });
    inputEl?.focus();
    onenter?.('');
  }

  export function reset() { clearQuery(); }
</script>

<div class="flex items-center gap-1.5 flex-nowrap">
  <div class="relative {className}">
    <label class="input input-bordered input-sm flex items-center gap-2 bg-base-100 w-full">
      <Icon icon="lucide:search" class="w-4 h-4 text-base-content/40 shrink-0" />
      <input
        bind:this={inputEl}
        type="text"
        {placeholder}
        bind:value={query}
        oninput={() => oninput?.(query)}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        onfocus={() => { if (!justConfirmed && suggestions.length > 0) open = true; }}
        autocomplete="off"
        class="grow text-sm bg-transparent outline-none"
      />
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
            onclick={() => confirmItem(item.id)}
            onmouseenter={() => (activeIdx = i)}
            class="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors
              {i === activeIdx ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'}"
          >
            <Icon icon="lucide:search" class="w-3.5 h-3.5 shrink-0 text-base-content/30" />
            <span class="font-semibold truncate shrink-0 max-w-[55%]">{item.label}</span>
            {#if item.sub}
              <span class="text-base-content/40 text-xs truncate min-w-0">{item.sub}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <button
    type="button"
    onclick={clearQuery}
    class="btn btn-sm btn-ghost text-base-content/50 hover:text-base-content gap-1.5 whitespace-nowrap shrink-0"
  >
    <Icon icon="lucide:rotate-ccw" class="w-3.5 h-3.5" />
    검색 초기화
  </button>
</div>
