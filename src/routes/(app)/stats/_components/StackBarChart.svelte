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

	const PL = 32;

	const colTotals = $derived(
		months.map((_, mi) => series.reduce((s, sr) => s + (sr.data[mi] ?? 0), 0))
	);
	const maxTotal = $derived(Math.max(...colTotals, 1));

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
			const result: { x: number; y: number; w: number; h: number; color: string; key: string }[] =
				[];
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
						key: `${mi}-${sr.label}`
					});
				}
			}
			return result;
		})()
	);

	const tickPcts = [0, 0.5, 1];

	// ─── 툴팁 ────────────────────────────────────────────────────────────────
	let hoverIdx = $state<number | null>(null);
	let svgEl = $state<SVGSVGElement | null>(null);

	function onMouseMove(e: MouseEvent) {
		if (!svgEl || months.length === 0) return;
		const rect = svgEl.getBoundingClientRect();
		const svgX = ((e.clientX - rect.left) / rect.width) * W;
		const slot = W / months.length;
		// 컨럼 중심기준 ±30% 이내일 때만 표시
		const rawIdx = Math.floor(svgX / slot);
		const idx = Math.max(0, Math.min(rawIdx, months.length - 1));
		const cx = xCenter(idx);
		if (Math.abs(svgX - cx) > slot * 0.3) {
			hoverIdx = null;
		} else {
			hoverIdx = idx;
		}
	}

	function onMouseLeave() {
		hoverIdx = null;
	}

	const tooltipPct = $derived(hoverIdx !== null ? (xCenter(hoverIdx) / W) * 100 : 0);
	const tooltipAlign = $derived(hoverIdx !== null && tooltipPct > 65 ? 'right' : 'left');
</script>

<div class="flex h-full w-full gap-0">
	<!-- Y축 레이블 -->
	<div class="flex shrink-0 flex-col-reverse justify-between pb-[18px]" style="width:{PL}px">
		{#each tickPcts as f (f)}
			<div class="text-base-content/50 pr-1.5 text-right text-[11px] leading-none font-medium">
				{#if f === 0}&zwnj;{:else}{Math.round(maxTotal * f) >= 1000
						? `${(Math.round(maxTotal * f) / 1000).toFixed(0)}k`
						: Math.round(maxTotal * f)}{/if}
			</div>
		{/each}
	</div>

	<!-- 바 + X축 -->
	<div class="flex h-full min-w-0 flex-1 flex-col">
		<!-- SVG 바 영역 -->
		<div class="relative min-h-0 w-full flex-1">
			<svg
				bind:this={svgEl}
				viewBox="0 0 {W} {H}"
				width="100%"
				height="100%"
				xmlns="http://www.w3.org/2000/svg"
				class="block"
				preserveAspectRatio="none"
				onmousemove={onMouseMove}
				onmouseleave={onMouseLeave}
				role="img"
				aria-label="스택 바 차트"
			>
				<!-- 그리드 라인 -->
				{#each tickPcts as f (f)}
					{@const y = PT + innerH - f * innerH}
					<line
						x1={0}
						y1={y}
						x2={W - PR}
						y2={y}
						stroke="var(--color-base-300)"
						stroke-width="0.8"
					/>
				{/each}

				<!-- 호버 컬럼 하이라이트 -->
				{#if hoverIdx !== null}
					{@const slot = W / months.length}
					<rect
						x={hoverIdx * slot}
						y={PT}
						width={slot}
						height={innerH}
						fill="var(--color-base-content)"
						opacity="0.04"
						rx="2"
					/>
				{/if}

				<!-- 바 -->
				{#each rects as rect (rect.key)}
					<rect
						x={rect.x}
						y={rect.y}
						width={rect.w}
						height={rect.h}
						fill={rect.color}
						opacity="0.85"
						rx="1"
					/>
				{/each}
			</svg>

			<!-- HTML 툴팁 -->
			{#if hoverIdx !== null}
				<div
					class="bg-base-100 border-base-300 pointer-events-none absolute top-1 z-20 min-w-[120px] rounded-lg border px-2.5 py-2 shadow-lg"
					style="{tooltipAlign === 'left'
						? `left:${tooltipPct}%`
						: `right:${100 - tooltipPct}%`}; transform: translateX({tooltipAlign === 'left'
						? '6px'
						: '-6px'});"
				>
					<p class="text-base-content/50 mb-1.5 text-[10px] font-bold">
						{months[hoverIdx]}월 · 합계 {colTotals[hoverIdx].toLocaleString('ko-KR')}
					</p>
					{#each series as sr (sr.label)}
						{@const v = sr.data[hoverIdx] ?? 0}
						{#if v > 0}
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-1">
									<span
										class="inline-block h-2 w-2 shrink-0 rounded-sm"
										style="background:{sr.color}"
									></span>
									<span class="text-base-content/60 text-[10px]">{sr.label}</span>
								</div>
								<span class="text-base-content text-[11px] font-bold tabular-nums"
									>{v.toLocaleString('ko-KR')}</span
								>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- X축 레이블 -->
		<div class="flex shrink-0">
			{#each months as m (m)}
				<div
					class="text-base-content/60 flex-1 py-1 text-center text-[11px] leading-none font-semibold"
				>
					{m}월
				</div>
			{/each}
		</div>
	</div>
</div>
