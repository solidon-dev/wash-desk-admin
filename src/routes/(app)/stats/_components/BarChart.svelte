<script lang="ts">
	interface Bar {
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		bars: Bar[];
		showValue?: boolean;
	}

	let { bars, showValue = true }: Props = $props();

	const maxVal = $derived(Math.max(...bars.map((b) => b.value), 1));
</script>

<!-- 가로 바 차트: CSS flex 기반, 높이 100% -->
<div class="flex h-full w-full flex-col justify-around gap-1 py-1">
	{#each bars as bar (bar.label)}
		<div class="flex min-w-0 items-center gap-2">
			<!-- 라벨 -->
			<span class="text-base-content/50 w-14 shrink-0 truncate text-right text-[10px] font-semibold"
				>{bar.label}</span
			>
			<!-- 바 트랙 -->
			<div class="bg-base-200 flex-1 overflow-hidden rounded-sm" style="height:14px">
				<div
					class="h-full rounded-sm transition-all"
					style="width:{(bar.value / maxVal) * 100}%; background:{bar.color}; opacity:0.85"
				></div>
			</div>
			<!-- 값 -->
			{#if showValue}
				<span
					class="text-base-content/60 w-10 shrink-0 text-right text-[10px] font-bold tabular-nums"
					>{bar.value.toLocaleString()}</span
				>
			{/if}
		</div>
	{/each}
</div>
