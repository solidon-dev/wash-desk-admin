<script lang="ts">
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import type { StatsShipout } from '$lib/api/stats';
	import {
		calcStats,
		calcDaily,
		calcRangeMonthly,
		prevPeriod,
		diff,
		fmtQty,
		fmtAmt,
		offsetDate,
		daysBetween,
		CATEGORY_KEYS,
		CATEGORY_COLORS
	} from '../_lib/stats';
	import LineChart from '../_components/LineChart.svelte';
	import StackBarChart from '../_components/StackBarChart.svelte';

	let { data }: { data: PageData } = $props();

	// ── 데이터 동기화 ──────────────────────────────────────────────────────────
	let allShipouts: StatsShipout[] = $state([]);
	$effect(() => {
		allShipouts = data.shipouts;
	});

	// ── URL 파라미터 ───────────────────────────────────────────────────────────
	const cid = $derived(page.url.searchParams.get('clientId') || undefined);

	// ── 기간 프리셋 ────────────────────────────────────────────────────────────
	type Preset = '30d' | '3m' | '6m' | 'ytd' | '2y' | 'custom';
	let preset: Preset = $state('ytd');

	const today = $derived(data.today);
	// 문자열 기반 날짜 계산 헬퍼 (Date 객체 생성 없이)
	function subMonths(yyyymmdd: string, months: number): string {
		const y = parseInt(yyyymmdd.slice(0, 4), 10);
		const m = parseInt(yyyymmdd.slice(5, 7), 10);
		const d = parseInt(yyyymmdd.slice(8, 10), 10);
		let nm = m - months;
		let ny = y;
		while (nm <= 0) {
			nm += 12;
			ny -= 1;
		}
		const lastDay = new Date(ny, nm, 0).getDate();
		const nd = Math.min(d, lastDay);
		return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
	}

	const thisYear = $derived(parseInt(today.slice(0, 4), 10));

	// 커스텀 날짜 상태
	let customFrom = $state('');
	let customTo = $state('');

	// 프리셋별 fromDate 계산
	const fromDate = $derived.by((): string => {
		const p: string = preset;
		if (p === 'custom') return customFrom || today;
		if (p === '30d') {
			const t = new Date(today + 'T00:00:00');
			return offsetDate(t, -29);
		}
		if (p === '3m') return subMonths(today, 3);
		if (p === '6m') return subMonths(today, 6);
		if (p === 'ytd') return `${thisYear}-01-01`;
		if (p === '2y') return `${thisYear - 1}-01-01`;
		return `${thisYear}-01-01`;
	});

	const toDate = $derived((preset as string) === 'custom' ? customTo || today : today);

	// ── 기간 일수 & 모드 ───────────────────────────────────────────────────────
	const periodDays = $derived(daysBetween(fromDate, toDate));
	const trendMode = $derived(periodDays <= 60 ? 'daily' : 'monthly');

	// ── metric ────────────────────────────────────────────────────────────────
	let metric: 'qty' | 'amount' = $state('amount');

	// ── 현재/직전 통계 ─────────────────────────────────────────────────────────
	const periodStats = $derived(calcStats(allShipouts, fromDate, toDate, cid));
	const prev = $derived(prevPeriod(fromDate, toDate));
	const prevStats = $derived(calcStats(allShipouts, prev.from, prev.to, cid));

	const dAmt = $derived(diff(periodStats.amount, prevStats.amount));
	const dQty = $derived(diff(periodStats.qty, prevStats.qty));

	// ── 라인차트 데이터 ────────────────────────────────────────────────────────
	const trendLabels = $derived.by((): string[] => {
		if (trendMode === 'daily') {
			const rows = calcDaily(allShipouts, fromDate, toDate, cid);
			const n = rows.length;
			const step = Math.max(1, Math.floor(n / 8));
			return rows.map((r, i) => (i % step === 0 ? r.date.slice(5) : ''));
		} else {
			const rows = calcRangeMonthly(allShipouts, fromDate, toDate, cid);
			return rows.map((r) => r.label);
		}
	});

	const trendSeriesCurr = $derived.by((): number[] => {
		if (trendMode === 'daily') {
			return calcDaily(allShipouts, fromDate, toDate, cid).map((r) =>
				metric === 'amount' ? r.amount : r.qty
			);
		} else {
			return calcRangeMonthly(allShipouts, fromDate, toDate, cid).map((r) =>
				metric === 'amount' ? r.amount : r.qty
			);
		}
	});

	const trendSeriesPrev = $derived.by((): number[] => {
		if (trendMode === 'daily') {
			return calcDaily(allShipouts, prev.from, prev.to, cid).map((r) =>
				metric === 'amount' ? r.amount : r.qty
			);
		} else {
			return calcRangeMonthly(allShipouts, prev.from, prev.to, cid).map((r) =>
				metric === 'amount' ? r.amount : r.qty
			);
		}
	});

	const trendSeries = $derived([
		{ label: '현재 기간', color: '#3B82F6', data: trendSeriesCurr },
		{ label: '직전 기간', color: '#9CA3AF', dash: true, data: trendSeriesPrev }
	]);

	// ── 스택바 (선택 기간 내 연도별) ──────────────────────────────────────────
	// 현재 기간 내 월별 범위 스택 데이터
	const stackMonths = $derived(calcRangeMonthly(allShipouts, fromDate, toDate, cid));

	// 카테고리별 월별 스택 데이터 (범위 기준)
	const stackCatSeries = $derived.by(() => {
		// 범위 월 순서대로 카테고리별 qty 집계
		const catData: Record<string, number[]> = {};
		for (const cat of CATEGORY_KEYS) {
			catData[cat] = new Array(stackMonths.length).fill(0);
		}
		for (const s of allShipouts) {
			if (cid && s.client_id !== cid) continue;
			const ym = s.created_at.slice(0, 7);
			const idx = stackMonths.findIndex((m) => m.ym === ym);
			if (idx === -1) continue;
			for (const item of s.items) {
				const cat = item.category_name;
				if (catData[cat]) catData[cat][idx] += item.quantity;
			}
		}
		return CATEGORY_KEYS.filter((cat) => catData[cat].some((v) => v > 0)).map((cat) => ({
			label: cat,
			color: CATEGORY_COLORS[cat],
			data: catData[cat]
		}));
	});

	// StackBarChart는 months를 number[]로 받음 (레이블은 내부에서 `${m}월` 처리)
	// 범위가 여러 달이면 index 기반 숫자 배열 사용 (레이블은 stackMonths.label로 별도 처리)
	// → 커스텀 x축 레이블을 위해 월 인덱스 1~N 전달
	const stackMonthNums = $derived(stackMonths.map((_, i) => i + 1));

	// ── 거래처별 추세 테이블 ───────────────────────────────────────────────────
	const clientTable = $derived.by(() => {
		const total = periodStats.qty || 1;
		const totalAmt = periodStats.amount || 1;
		return periodStats.byClient.map((c) => ({
			...c,
			qtyPct: Math.round((c.qty / total) * 100),
			amtPct: Math.round((c.amount / totalAmt) * 100)
		}));
	});

	// ── 프리셋 버튼 ────────────────────────────────────────────────────────────
	const presets: { key: Preset; label: string }[] = [
		{ key: '30d', label: '30일' },
		{ key: '3m', label: '3개월' },
		{ key: '6m', label: '6개월' },
		{ key: 'ytd', label: '올해' },
		{ key: '2y', label: '2년' },
		{ key: 'custom', label: '직접' }
	];

	function diffIcon(cls: string) {
		if (cls === 'up') return 'heroicons:arrow-trending-up';
		if (cls === 'down') return 'heroicons:arrow-trending-down';
		return 'heroicons:minus';
	}
	function diffColor(cls: string) {
		if (cls === 'up') return 'text-success';
		if (cls === 'down') return 'text-error';
		return 'text-base-content/40';
	}
</script>

<div class="bg-base-200 flex flex-col gap-4 px-5 py-4">
	<!-- ① 필터 바 -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- 프리셋 -->
		<div class="join">
			{#each presets as p (p.key)}
				<button
					class="btn btn-sm join-item {preset === p.key ? 'btn-primary' : 'btn-ghost bg-base-100'}"
					onclick={() => (preset = p.key)}
				>
					{p.label}
				</button>
			{/each}
		</div>

		<!-- 커스텀 날짜 입력 -->
		{#if preset === 'custom'}
			<div class="flex items-center gap-1.5">
				<input
					type="date"
					class="input input-sm input-bordered h-8 w-36 text-xs"
					bind:value={customFrom}
					max={customTo || today}
				/>
				<span class="text-base-content/40 text-xs">~</span>
				<input
					type="date"
					class="input input-sm input-bordered h-8 w-36 text-xs"
					bind:value={customTo}
					min={customFrom}
					max={today}
				/>
			</div>
		{/if}

		<!-- 지표 토글 -->
		<div class="join ml-auto">
			<button
				class="btn btn-sm join-item {metric === 'amount' ? 'btn-primary' : 'btn-ghost bg-base-100'}"
				onclick={() => (metric = 'amount')}>매출액</button
			>
			<button
				class="btn btn-sm join-item {metric === 'qty' ? 'btn-primary' : 'btn-ghost bg-base-100'}"
				onclick={() => (metric = 'qty')}>출고량</button
			>
		</div>
	</div>

	<!-- ② 메인 라인차트 카드 -->
	<div class="bg-base-100 flex flex-col gap-4 rounded-xl p-4 shadow-sm">
		<!-- 상단 KPI 수치 -->
		<div class="flex flex-wrap items-start gap-6">
			<div>
				<div class="text-base-content/50 mb-1 text-xs font-semibold">
					{metric === 'amount' ? '기간 총 매출' : '기간 총 출고량'}
				</div>
				<div class="text-base-content text-3xl leading-none font-extrabold tabular-nums">
					{metric === 'amount' ? fmtAmt(periodStats.amount) : fmtQty(periodStats.qty)}
					<span class="text-base-content/40 ml-1 text-sm font-semibold">
						{metric === 'amount' ? '' : '개'}
					</span>
				</div>
				<div
					class="mt-1.5 flex items-center gap-1 text-xs font-semibold
          {metric === 'amount' ? diffColor(dAmt.cls) : diffColor(dQty.cls)}"
				>
					<Icon
						icon={metric === 'amount' ? diffIcon(dAmt.cls) : diffIcon(dQty.cls)}
						class="h-3.5 w-3.5"
					/>
					{metric === 'amount' ? dAmt.sign + dAmt.pct : dQty.sign + dQty.pct}
					<span class="text-base-content/30 font-normal">직전 기간 대비</span>
				</div>
			</div>

			<div class="border-base-200 border-l pl-6">
				<div class="text-base-content/50 mb-1 text-xs font-semibold">처리건수</div>
				<div class="text-base-content text-xl font-extrabold tabular-nums">
					{fmtQty(periodStats.count)}건
				</div>
			</div>

			<div class="border-base-200 border-l pl-6">
				<div class="text-base-content/50 mb-1 text-xs font-semibold">활성 거래처</div>
				<div class="text-base-content text-xl font-extrabold tabular-nums">
					{periodStats.byClient.length}개
				</div>
			</div>

			<div class="border-base-200 border-l pl-6">
				<div class="text-base-content/50 mb-1 text-xs font-semibold">집계 기간</div>
				<div class="text-base-content text-sm font-bold">{fromDate} ~ {toDate}</div>
				<div class="text-base-content/40 mt-0.5 text-xs">
					{trendMode === 'daily' ? '일별' : '월별'} ({periodDays}일)
				</div>
			</div>
		</div>

		<!-- 라인차트 -->
		<div class="h-52">
			{#if trendSeries[0].data.length > 0}
				<LineChart series={trendSeries} labels={trendLabels} showArea={true} />
			{:else}
				<div class="text-base-content/30 flex h-full items-center justify-center text-xs">
					데이터 없음
				</div>
			{/if}
		</div>

		<!-- 범례 -->
		<div class="flex gap-4">
			{#each trendSeries as s (s.label)}
				<div class="flex items-center gap-1.5">
					<svg width="20" height="4">
						<line
							x1="0"
							y1="2"
							x2="20"
							y2="2"
							stroke={s.color}
							stroke-width="2"
							stroke-dasharray={s.dash ? '4,2' : undefined}
						/>
					</svg>
					<span class="text-base-content/60 text-[11px] font-medium">{s.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- ③ 카테고리별 월간 스택바 -->
	<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm">
		<div class="flex items-center justify-between">
			<span class="text-base-content text-sm font-bold">카테고리별 월간 출고량</span>
			<span class="text-base-content/40 text-xs">{fromDate.slice(0, 7)} ~ {toDate.slice(0, 7)}</span
			>
		</div>

		<div class="h-44">
			{#if stackCatSeries.length > 0}
				<!-- months prop: StackBarChart가 내부에서 `${m}월` 레이블 출력 → 1-based 인덱스 전달 -->
				<StackBarChart months={stackMonthNums} series={stackCatSeries} />
			{:else}
				<div class="text-base-content/30 flex h-full items-center justify-center text-xs">
					데이터 없음
				</div>
			{/if}
		</div>

		<!-- X축 실제 레이블 (StackBarChart 내부 레이블 대신 별도 표기) -->
		{#if stackMonths.length > 0 && stackMonths.length <= 24}
			<div class="text-base-content/40 flex text-[10px] font-semibold">
				{#each stackMonths as m (m.ym)}
					<div class="flex-1 truncate text-center">{m.label}</div>
				{/each}
			</div>
		{/if}

		<!-- 범례 -->
		<div class="flex flex-wrap gap-x-3 gap-y-1 pt-1">
			{#each stackCatSeries as s (s.label)}
				<div class="flex items-center gap-1">
					<div class="h-2 w-2 rounded-sm" style="background:{s.color}"></div>
					<span class="text-base-content/50 text-[10px]">{s.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- ④ 거래처별 추세 테이블 -->
	<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm">
		<span class="text-base-content text-sm font-bold">거래처별 순위</span>

		{#if clientTable.length === 0}
			<div class="text-base-content/30 py-8 text-center text-xs">데이터 없음</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table-xs table w-full">
					<thead>
						<tr class="text-base-content/50">
							<th class="w-6">#</th>
							<th>거래처명</th>
							<th class="text-right">매출</th>
							<th class="text-right">출고량</th>
							<th class="text-right">건수</th>
							<th class="w-24">점유율</th>
						</tr>
					</thead>
					<tbody>
						{#each clientTable as c, i (c.id)}
							<tr class="hover">
								<td class="text-base-content/30 font-bold">{i + 1}</td>
								<td class="max-w-30 truncate font-semibold">{c.name}</td>
								<td class="text-right text-xs tabular-nums">{fmtAmt(c.amount)}</td>
								<td class="text-right text-xs tabular-nums">{fmtQty(c.qty)}</td>
								<td class="text-right text-xs tabular-nums">{c.count}건</td>
								<td>
									<div class="flex items-center gap-1.5">
										<div class="bg-base-200 relative h-1.5 flex-1 overflow-hidden rounded-full">
											<div
												class="bg-primary absolute inset-y-0 left-0 rounded-full"
												style="width:{metric === 'amount' ? c.amtPct : c.qtyPct}%"
											></div>
										</div>
										<span
											class="text-base-content/40 w-8 shrink-0 text-right text-[10px] tabular-nums"
										>
											{metric === 'amount' ? c.amtPct : c.qtyPct}%
										</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
