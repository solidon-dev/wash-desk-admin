<script lang="ts">
  interface SeriesItem {
    label: string;
    color: string;
    dash?: boolean;
    data: number[];
  }

  interface Props {
    series: SeriesItem[];
    labels: string[];
    showArea?: boolean;
  }

  let { series, labels, showArea = false }: Props = $props();

  const W = 480;
  const H = 160;
  const PL = 28;
  const PR = 12;
  const PT = 12;
  const PB = 22;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const n = $derived(labels.length);

  const allVals = $derived(series.flatMap((s) => s.data));
  const maxVal = $derived(Math.max(...allVals, 1));

  function xPos(i: number): number {
    if (n <= 1) return PL + innerW / 2;
    return PL + (i / (n - 1)) * innerW;
  }

  function yPos(v: number): number {
    return PT + innerH - (v / maxVal) * innerH;
  }

  interface PathData {
    path: string;
    area: string;
    pts: { x: number; y: number; v: number }[];
  }

  function buildPath(data: number[]): PathData {
    const pts = data.map((v, i) => ({ x: xPos(i), y: yPos(v), v }));
    if (pts.length === 0) return { path: '', area: '', pts: [] };
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const bottom = PT + innerH;
    const area =
      `M ${pts[0].x.toFixed(1)} ${bottom} ` +
      pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
      ` L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} Z`;
    return { path, area, pts };
  }

  const built = $derived(series.map((s) => buildPath(s.data)));

  const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PT + innerH - f * innerH,
    val: Math.round(maxVal * f)
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
  <defs>
    {#each series as s, i (s.label)}
      {#if showArea && i === 0}
        <linearGradient id="lc-area-{i}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={s.color} stop-opacity="0.25" />
          <stop offset="100%" stop-color={s.color} stop-opacity="0" />
        </linearGradient>
      {/if}
    {/each}
  </defs>

  <!-- Grid lines -->
  {#each ticks as tick (tick.val)}
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

  <!-- X axis labels -->
  {#each labels as lbl, i (lbl + i)}
    <text
      x={xPos(i)}
      y={H - 4}
      text-anchor="middle"
      font-size="9"
      fill="#94a3b8"
    >{lbl}</text>
  {/each}

  <!-- Series -->
  {#each series as s, i (s.label)}
    {#if showArea && i === 0 && built[i].area}
      <path d={built[i].area} fill="url(#lc-area-{i})" />
    {/if}
    {#if built[i].path}
      <path
        d={built[i].path}
        fill="none"
        stroke={s.color}
        stroke-width={i === 0 ? 2 : 1.5}
        stroke-dasharray={s.dash ? '5,3' : undefined}
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      {#each built[i].pts as pt (pt.x)}
        {#if pt.v > 0}
          <circle cx={pt.x} cy={pt.y} r="3" fill={s.color} stroke="white" stroke-width="1.5" />
        {/if}
      {/each}
    {/if}
  {/each}
</svg>
