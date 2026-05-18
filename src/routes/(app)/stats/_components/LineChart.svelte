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
		formatValue?: (v: number) => string;
	}

	let { series, labels, showArea = false, formatValue }: Props = $props();

	const PL = 34; // px — HTML Y축 레이블 영역 너비

	// SVG 내부 좌표계
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
		const path = pts
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
			.join(' ');
		const bottom = PT + innerH;
		const area =
			`M ${pts[0].x.toFixed(1)} ${bottom} ` +
			pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
			` L ${pts[pts.length - 1].x.toFixed(1)} ${bottom} Z`;
		return { path, area, pts };
	}

	const built = $derived(series.map((s) => buildPath(s.data)));
	const tickPcts = [0, 0.5, 1];

	// ─── 툴팁 상태 ────────────────────────────────────────────────────────────
	let hoverIdx = $state<number | null>(null);
	let tooltipX = $state(0); // 컨테이너 기준 px (0~100%)
	let svgEl = $state<SVGSVGElement | null>(null);

	function fmt(v: number): string {
		if (formatValue) return formatValue(v);
		if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
		if (v >= 10_000) return `${(v / 10_000).toFixed(1)}만`;
		return v.toLocaleString('ko-KR');
	}

	function onMouseMove(e: MouseEvent) {
		if (!svgEl || n === 0) return;
		const rect = svgEl.getBoundingClientRect();
		const svgX = ((e.clientX - rect.left) / rect.width) * W;
		const svgY = ((e.clientY - rect.top) / rect.height) * H;

		// 포인트 간격의 40% 이내일 때만 스냅
		const spacing = n > 1 ? (W - PR) / (n - 1) : W;
		const threshold = spacing * 0.4;

		let closest = -1;
		let minDist = Infinity;
		for (let i = 0; i < n; i++) {
			// X 거리만으로 먼저 필터, Y도 고려해서 실제 거리 계산
			const dx = Math.abs(svgX - xPos(i));
			if (dx > threshold) continue;
			// 해당 시리즈 중 가장 가까운 Y 포인트까지의 거리
			let minYDist = Infinity;
			for (const s of series) {
				const v = s.data[i] ?? 0;
				if (v === 0) continue;
				const dy = Math.abs(svgY - yPos(v));
				if (dy < minYDist) minYDist = dy;
			}
			// Y 임계값: SVG 높이의 25% 이내
			if (minYDist > H * 0.25) continue;
			const dist = dx + minYDist * 0.3; // X 우선 가중
			if (dist < minDist) {
				minDist = dist;
				closest = i;
			}
		}
		hoverIdx = closest === -1 ? null : closest;
		if (closest !== -1) tooltipX = (xPos(closest) / W) * 100;
	}

	function onMouseLeave() {
		hoverIdx = null;
	}

	// 툴팁이 오른쪽 가장자리에 걸리지 않도록 방향 결정
	const tooltipAlign = $derived(hoverIdx !== null && tooltipX > 65 ? 'right' : 'left');
</script>

<div class="flex h-full w-full gap-0">
	<!-- Y축 레이블 (HTML) -->
	<div class="flex shrink-0 flex-col-reverse justify-between pb-[18px]" style="width:{PL}px">
		{#each tickPcts as f (f)}
			<div class="text-base-content/50 pr-1.5 text-right text-[11px] leading-none font-medium">
				{#if f === 0}&zwnj;{:else}{@const v = Math.round(maxVal * f)}{v >= 1000
						? `${(v / 1000).toFixed(0)}k`
						: v}{/if}
			</div>
		{/each}
	</div>

	<!-- 라인 + X축 -->
	<div class="flex h-full min-w-0 flex-1 flex-col">
		<!-- SVG 라인 영역 (툴팁 컨테이너) -->
		<div class="relative min-h-0 w-full flex-1">
			<svg
				bind:this={svgEl}
				viewBox="0 0 {W} {H}"
				width="100%"
				height="100%"
				xmlns="http://www.w3.org/2000/svg"
				class="block overflow-visible"
				preserveAspectRatio="none"
				onmousemove={onMouseMove}
				onmouseleave={onMouseLeave}
				role="img"
				aria-label="라인 차트"
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

				<!-- 그리드 라인 -->
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
								<circle
									cx={pt.x}
									cy={pt.y}
									r={hoverIdx === pi ? 4 : 2.5}
									fill={s.color}
									stroke="white"
									stroke-width="1.5"
									vector-effect="non-scaling-stroke"
									style="transition: r 0.1s"
								/>
							{/if}
						{/each}
					{/if}
				{/each}

				<!-- 호버 버티컬 라인 -->
				{#if hoverIdx !== null}
					{@const vx = xPos(hoverIdx)}
					<line
						x1={vx}
						y1={PT}
						x2={vx}
						y2={PT + innerH}
						stroke="var(--color-base-content)"
						stroke-width="0.8"
						stroke-dasharray="3,2"
						opacity="0.3"
						vector-effect="non-scaling-stroke"
					/>
				{/if}
			</svg>

			<!-- HTML 툴팁 -->
			{#if hoverIdx !== null}
				<div
					class="bg-base-100 border-base-300 pointer-events-none absolute top-0 z-20 min-w-[110px] rounded-lg border px-2.5 py-2 shadow-lg"
					style="{tooltipAlign === 'left'
						? `left:${tooltipX}%`
						: `right:${100 - tooltipX}%`}; transform: translateX({tooltipAlign === 'left'
						? '6px'
						: '-6px'}); top: 4px;"
				>
					<p class="text-base-content/50 mb-1.5 text-[10px] font-bold">
						{labels[hoverIdx] || `#${hoverIdx + 1}`}
					</p>
					{#each series as s (s.label)}
						{@const v = s.data[hoverIdx] ?? 0}
						<div class="flex items-center justify-between gap-3">
							<div class="flex items-center gap-1">
								<span
									class="inline-block h-2 w-2 shrink-0 rounded-full"
									style="background:{s.color}; {s.dash ? 'opacity:0.5' : ''}"
								></span>
								<span class="text-base-content/60 text-[10px]">{s.label}</span>
							</div>
							<span class="text-base-content text-[11px] font-bold tabular-nums">{fmt(v)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- X축 레이블 (HTML) -->
		<div class="relative h-5 shrink-0">
			{#each labels as lbl, i (i)}
				{#if lbl}
					{@const pct = labels.length <= 1 ? 50 : (i / (labels.length - 1)) * 100}
					<div
						class="text-base-content/60 absolute text-[11px] leading-none font-semibold whitespace-nowrap"
						style="left:{pct}%; transform:translateX(-50%); top:3px"
					>
						{lbl}
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
