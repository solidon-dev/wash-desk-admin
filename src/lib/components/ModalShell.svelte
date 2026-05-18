<script lang="ts">
	import { modal } from '$lib/modal.svelte';

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') modal.close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if modal.current}
	<dialog class="modal modal-open" aria-modal="true">
		{@render modal.current()}
		<div
			class="modal-backdrop"
			role="button"
			tabindex="-1"
			onclick={modal.close}
			onkeydown={() => {}}
		></div>
	</dialog>
{/if}
