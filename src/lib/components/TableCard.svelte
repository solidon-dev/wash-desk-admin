<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<div class="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden {className}">
  {@render children()}
</div>
