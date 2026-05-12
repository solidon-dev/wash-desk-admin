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

  const PL = 34; // px — HTML Y축 레이블 영역 너비

  // SVG 내부 좌표계 (Y축 레이블 없이 순수 라인 영역)
  const W = 480;
  const H = 100;
  const PT = 8;
  const PB = 4;
  const PR = 8;
  const innerH = H - PT - PB;

  const n = $derived(labels.length);
  const allVals = $derived(series.flatMap((s) => s.data));
  const maxVal = $derived(Math.max(...allVals, 1));

  function xPos(i: number): number {
    if (n <= 1) return W / 2;
    return (i / (n - 1)) * (W - PR);
  }

  function yPos(v: number): number {
    return PT + innerH - (v / maxVal) * innerH;
  }

  function buildPath(data: number[]) {
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

  const tickPcts = [0, 0.5, 1];
</script>

<div class="flex w-full h-full gap-0">
  <!-- Y축 레이블 (HTML) -->
  <div class="flex flex-col-reverse justify-between shrink-0 pb-[18px]" style="width:{PL}px">
    {#each tickPcts as f (f)}
      <div class="text-[11px] font-medium text-base-content/50 text-right pr-1.5 leading-none">
        {#if f === 0}{''}{:else}{@const v = Math.round(maxVal * f)}{v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}{/if}
      </div>
    {/each}
  </div>

  <!-- 라인 + X축 -->
  <div class="flex flex-col flex-1 min-w-0 h-full">
    <!-- SVG 라인 영역 -->
    <div class="flex-1 min-h-0 w-full">
      <svg
        viewBox="0 0 {W} {H}"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        class="block overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          {#each series as s, i (s.label)}
            {#if showArea}
              <linearGradient id="area-grad-{i}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color={s.color} stop-opacity="0.2" />
                <stop offset="100%" stop-color={s.color} stop-opacity="0.02" />
              </linearGradient>
            {/if}
          {/each}
        </defs>

        <!-- 그리드 라인만 -->
        {#each tickPcts as f (f)}
          {@const y = PT + innerH - f * innerH}
          <line x1={0} y1={y} x2={W} y2={y} stroke="var(--color-base-300)" stroke-width="0.8" />
        {/each}

        <!-- 시리즈 -->
        {#each series as s, i (s.label)}
          {#if showArea && built[i].area}
            <path d={built[i].area} fill="url(#area-grad-{i})" />
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
              vector-effect="non-scaling-stroke"
            />
            {#each built[i].pts as pt, pi (pi)}
              {#if pt.v > 0}
                <circle cx={pt.x} cy={pt.y} r="2.5" fill={s.color} stroke="white" stroke-width="1.5" vector-effect="non-scaling-stroke" />
              {/if}
            {/each}
          {/if}
        {/each}
      </svg>
    </div>

    <!-- X축 레이블 (HTML, 절대 위치) -->
    <div class="relative shrink-0 h-5">
      {#each labels as lbl, i (i)}
        {#if lbl}
          {@const pct = labels.length <= 1 ? 50 : (i / (labels.length - 1)) * 100}
          <div
            class="absolute text-[11px] font-semibold text-base-content/60 leading-none whitespace-nowrap"
            style="left:{pct}%; transform:translateX(-50%); top:3px"
          >{lbl}</div>
        {/if}
      {/each}
    </div>
  </div>
</div>
