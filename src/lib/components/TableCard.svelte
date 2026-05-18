<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="bg-base-100 border-base-300 overflow-hidden rounded-2xl border shadow-sm {className}">
	{@render children()}
</div>
