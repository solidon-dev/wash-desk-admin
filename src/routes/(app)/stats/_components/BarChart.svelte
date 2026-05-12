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
<div class="flex flex-col justify-around h-full w-full gap-1 py-1">
  {#each bars as bar (bar.label)}
    <div class="flex items-center gap-2 min-w-0">
      <!-- 라벨 -->
      <span class="text-[10px] font-semibold text-base-content/50 shrink-0 w-14 text-right truncate">{bar.label}</span>
      <!-- 바 트랙 -->
      <div class="flex-1 bg-base-200 rounded-sm overflow-hidden" style="height:14px">
        <div
          class="h-full rounded-sm transition-all"
          style="width:{(bar.value / maxVal) * 100}%; background:{bar.color}; opacity:0.85"
        ></div>
      </div>
      <!-- 값 -->
      {#if showValue}
        <span class="text-[10px] font-bold text-base-content/60 shrink-0 w-10 text-right tabular-nums">{bar.value.toLocaleString()}</span>
      {/if}
    </div>
  {/each}
</div>
