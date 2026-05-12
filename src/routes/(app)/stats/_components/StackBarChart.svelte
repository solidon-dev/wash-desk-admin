<script lang="ts">
  interface StackSeries {
    label: string;
    color: string;
    data: number[];
  }

  interface Props {
    months: number[];
    series: StackSeries[];
  }

  let { months, series }: Props = $props();

  const PL = 32; // px — HTML Y축 레이블 영역 너비

  const colTotals = $derived(
    months.map((_, mi) => series.reduce((s, sr) => s + (sr.data[mi] ?? 0), 0))
  );
  const maxTotal = $derived(Math.max(...colTotals, 1));

  // SVG 내부 좌표계 (Y축 레이블 없이 순수 바 영역)
  const W = 480;
  const H = 100;
  const PT = 6;
  const PB = 4;
  const PR = 4;
  const innerH = H - PT - PB;

  const barW = $derived(months.length > 0 ? (W / months.length) * 0.55 : 20);

  function xCenter(mi: number): number {
    const slot = W / months.length;
    return slot * mi + slot / 2;
  }

  const rects = $derived(
    (() => {
      const result: { x: number; y: number; w: number; h: number; color: string; key: string }[] = [];
      for (let mi = 0; mi < months.length; mi++) {
        let yOffset = PT + innerH;
        for (const sr of series) {
          const v = sr.data[mi] ?? 0;
          if (v <= 0) continue;
          const h = (v / maxTotal) * innerH;
          yOffset -= h;
          result.push({ x: xCenter(mi) - barW / 2, y: yOffset, w: barW, h, color: sr.color, key: `${mi}-${sr.label}` });
        }
      }
      return result;
    })()
  );

  const tickPcts = [0, 0.5, 1]; // 0%, 50%, 100%
</script>

<div class="flex w-full h-full gap-0">
  <!-- Y축 레이블 (HTML) -->
  <div class="flex flex-col-reverse justify-between shrink-0 pb-[18px]" style="width:{PL}px">
    {#each tickPcts as f (f)}
      <div class="text-[11px] font-medium text-base-content/50 text-right pr-1.5 leading-none">
        {#if f === 0}{''}{:else}{Math.round(maxTotal * f) >= 1000 ? `${(Math.round(maxTotal * f)/1000).toFixed(0)}k` : Math.round(maxTotal * f)}{/if}
      </div>
    {/each}
  </div>

  <!-- 바 + X축 -->
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <!-- SVG 바 영역 -->
    <div class="flex-1 min-h-0 w-full">
      <svg
        viewBox="0 0 {W} {H}"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        class="block"
        preserveAspectRatio="none"
      >
        <!-- 그리드 라인만 -->
        {#each tickPcts as f (f)}
          {@const y = PT + innerH - f * innerH}
          <line x1={0} y1={y} x2={W - PR} y2={y} stroke="var(--color-base-300)" stroke-width="0.8" />
        {/each}

        <!-- 바 -->
        {#each rects as rect (rect.key)}
          <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={rect.color} opacity="0.85" rx="1" />
        {/each}
      </svg>
    </div>

    <!-- X축 레이블 (HTML) -->
    <div class="flex shrink-0">
      {#each months as m (m)}
        <div class="flex-1 text-center text-[11px] font-semibold text-base-content/60 leading-none py-1">{m}월</div>
      {/each}
    </div>
  </div>
</div>
