<script lang="ts">
  interface Segment {
    label: string;
    value: number;
    color: string;
  }

  interface Props {
    segments: Segment[];
    size?: number;
    centerLabel?: string;
    centerValue?: string;
  }

  let { segments, size = 160, centerLabel = '', centerValue = '' }: Props = $props();

  const cx = $derived(size / 2);
  const cy = $derived(size / 2);
  const r = $derived(size * 0.36);
  const innerR = $derived(size * 0.22);

  const total = $derived(segments.reduce((s, seg) => s + seg.value, 0));

  interface ArcSegment {
    d: string;
    color: string;
    label: string;
    value: number;
  }

  const arcs: ArcSegment[] = $derived(
    (() => {
      if (total === 0) return [];
      let startAngle = -Math.PI / 2;
      return segments
        .filter((seg) => seg.value > 0)
        .map((seg) => {
          const sweep = (seg.value / total) * 2 * Math.PI;
          const endAngle = startAngle + sweep;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const ix1 = cx + innerR * Math.cos(endAngle);
          const iy1 = cy + innerR * Math.sin(endAngle);
          const ix2 = cx + innerR * Math.cos(startAngle);
          const iy2 = cy + innerR * Math.sin(startAngle);
          const large = sweep > Math.PI ? 1 : 0;
          const d = [
            `M ${x1} ${y1}`,
            `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
            `L ${ix1} ${iy1}`,
            `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
            'Z'
          ].join(' ');
          startAngle = endAngle;
          return { d, color: seg.color, label: seg.label, value: seg.value };
        });
    })()
  );
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
  xmlns="http://www.w3.org/2000/svg"
  class="shrink-0"
>
  {#if total === 0}
    <circle {cx} {cy} r={r} fill="none" stroke="var(--color-base-300)" stroke-width={r - innerR} />
  {:else}
    {#each arcs as arc (arc.label)}
      <path d={arc.d} fill={arc.color} opacity="0.9" />
    {/each}
  {/if}

  {#if centerLabel || centerValue}
    <text
      x={cx}
      y={cy - 7}
      text-anchor="middle"
      dominant-baseline="middle"
      font-size={size * 0.11}
      fill="var(--color-base-content)"
      opacity="0.4"
      font-weight="600"
    >{centerLabel}</text>
    <text
      x={cx}
      y={cy + size * 0.1}
      text-anchor="middle"
      dominant-baseline="middle"
      font-size={size * 0.14}
      fill="var(--color-base-content)"
      font-weight="800"
    >{centerValue}</text>
  {/if}
</svg>
