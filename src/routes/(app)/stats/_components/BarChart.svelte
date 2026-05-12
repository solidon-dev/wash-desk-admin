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

  const barHeight = 18;
  const gap = 8;
  const labelW = 72;
  const valueW = 44;
  const PL = labelW + 6;
  const PR = valueW + 6;
  const W = 420;
  const innerW = W - PL - PR;

  const svgHeight = $derived(Math.max(bars.length * (barHeight + gap) + gap + 4, 40));
</script>

<svg
  viewBox="0 0 {W} {svgHeight}"
  width="100%"
  height="100%"
  xmlns="http://www.w3.org/2000/svg"
  class="block"
  preserveAspectRatio="xMidYMid meet"
>
  {#each bars as bar, i (bar.label)}
    {@const y = gap + i * (barHeight + gap)}
    {@const barW = (bar.value / maxVal) * innerW}
    <!-- label -->
    <text
      x={labelW}
      y={y + barHeight / 2}
      text-anchor="end"
      dominant-baseline="middle"
      font-size="10"
      fill="#64748b"
      font-weight="600"
    >{bar.label}</text>

    <!-- background track -->
    <rect
      x={PL}
      y={y}
      width={innerW}
      height={barHeight}
      rx="3"
      fill="#f1f5f9"
    />

    <!-- bar -->
    {#if barW > 0}
      <rect
        x={PL}
        y={y}
        width={barW}
        height={barHeight}
        rx="3"
        fill={bar.color}
        opacity="0.85"
      />
    {/if}

    <!-- value -->
    {#if showValue}
      <text
        x={PL + innerW + 5}
        y={y + barHeight / 2}
        dominant-baseline="middle"
        font-size="10"
        fill="#475569"
        font-weight="700"
      >{bar.value.toLocaleString()}</text>
    {/if}
  {/each}
</svg>
