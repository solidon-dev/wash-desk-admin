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

  const W = 520;
  const H = 160;
  const PL = 20;
  const PR = 10;
  const PT = 10;
  const PB = 22;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const colTotals = $derived(
    months.map((_, mi) => series.reduce((s, sr) => s + (sr.data[mi] ?? 0), 0))
  );
  const maxTotal = $derived(Math.max(...colTotals, 1));

  const barW = $derived(months.length > 0 ? innerW / months.length - 4 : 20);

  function xCenter(mi: number): number {
    const slot = innerW / months.length;
    return PL + slot * mi + slot / 2;
  }

  interface StackRect {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    seriesLabel: string;
  }

  const rects: StackRect[] = $derived(
    (() => {
      const result: StackRect[] = [];
      for (let mi = 0; mi < months.length; mi++) {
        let yOffset = PT + innerH;
        for (const sr of series) {
          const v = sr.data[mi] ?? 0;
          if (v <= 0) continue;
          const h = (v / maxTotal) * innerH;
          yOffset -= h;
          result.push({
            x: xCenter(mi) - barW / 2,
            y: yOffset,
            w: barW,
            h,
            color: sr.color,
            seriesLabel: sr.label
          });
        }
      }
      return result;
    })()
  );

  const tickVals = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PT + innerH - f * innerH,
    val: Math.round(maxTotal * f)
  })));
</script>

<svg
  viewBox="0 0 {W} {H}"
  width="100%"
  height="100%"
  xmlns="http://www.w3.org/2000/svg"
  class="block"
  preserveAspectRatio="none"
>
  <!-- Grid lines -->
  {#each tickVals as tick (tick.val)}
    <line
      x1={PL}
      y1={tick.y}
      x2={W - PR}
      y2={tick.y}
      stroke="#e2e8f0"
      stroke-width="0.8"
    />
    <text
      x={PL - 3}
      y={tick.y}
      text-anchor="end"
      dominant-baseline="middle"
      font-size="8"
      fill="#94a3b8"
    >{tick.val > 0 ? (tick.val >= 1000 ? `${(tick.val / 1000).toFixed(0)}k` : tick.val) : ''}</text>
  {/each}

  <!-- Bars -->
  {#each rects as rect (`${rect.x}-${rect.seriesLabel}`)}
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.w}
      height={rect.h}
      fill={rect.color}
      opacity="0.85"
    />
  {/each}

  <!-- X labels -->
  {#each months as m, mi (m)}
    <text
      x={xCenter(mi)}
      y={H - 4}
      text-anchor="middle"
      font-size="9"
      fill="#94a3b8"
    >{m}월</text>
  {/each}
</svg>
