<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type ShipoutRow = {
		id: string;
		created_at: string;
		clients: { id: string; name: string } | null;
	};

	const shipouts = $derived((data.shipouts as unknown as ShipoutRow[]) ?? []);

	let selected = $state('');

	function fmtDate(s: string) {
		const d = new Date(s);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
	}

	function go() {
		if (selected) window.location.href = `/memo/${selected}`;
	}
</script>

<div class="bg-base-200 flex min-h-screen flex-col items-center justify-center px-4">
	<div class="card bg-base-100 w-full max-w-sm shadow-md">
		<div class="card-body gap-5">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
					<Icon icon="lucide:message-square-plus" class="text-primary h-5 w-5" />
				</div>
				<div>
					<h2 class="text-base font-extrabold">메모 작성</h2>
					<p class="text-base-content/40 text-xs">출고 건을 선택하세요</p>
				</div>
			</div>

			<select class="select select-bordered w-full" bind:value={selected}>
				<option value="" disabled>출고 건 선택...</option>
				{#each shipouts as s (s.id)}
					<option value={s.id}>
						{s.clients?.name ?? '미확인'} — {fmtDate(s.created_at)}
					</option>
				{/each}
			</select>

			<button type="button" class="btn btn-primary w-full gap-2" disabled={!selected} onclick={go}>
				<Icon icon="lucide:arrow-right" class="h-4 w-4" />
				이동
			</button>
		</div>
	</div>
</div>
