<script lang="ts">
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import type { StatsShipout } from '$lib/api/stats';
	import {
		calcStats,
		calcDaily,
		calcMonthlyCategoryStack,
		prevPeriod,
		diff,
		fmtQty,
		fmtAmt,
		offsetDate,
		CATEGORY_KEYS,
		CATEGORY_COLORS
	} from '../_lib/stats';
	import LineChart from '../_components/LineChart.svelte';
	import BarChart from '../_components/BarChart.svelte';
	import DonutChart from '../_components/DonutChart.svelte';
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
	type Preset = '7d' | '30d' | 'month' | 'ytd' | 'all';
	let preset: Preset = $state('month');

	const today = $derived(data.today);

	const fromDate = $derived.by(() => {
		const t = new Date(today + 'T00:00:00');
		if (preset === '7d') return offsetDate(t, -6);
		if (preset === '30d') return offsetDate(t, -29);
		if (preset === 'month') {
			const y = t.getFullYear(),
				m = String(t.getMonth() + 1).padStart(2, '0');
			return `${y}-${m}-01`;
		}
		if (preset === 'ytd') return `${t.getFullYear()}-01-01`;
		// all: 데이터 최솟값
		if (allShipouts.length === 0) return `${t.getFullYear()}-01-01`;
		return allShipouts.map((s) => s.created_at.slice(0, 10)).sort()[0];
	});

	const toDate = $derived(today);

	// ── 기간 통계 ─────────────────────────────────────────────────────────────
	const periodStats = $derived(calcStats(allShipouts, fromDate, toDate, cid));
	const prev = $derived(prevPeriod(fromDate, toDate));
	const prevStats = $derived(calcStats(allShipouts, prev.from, prev.to, cid));

	const dAmt = $derived(diff(periodStats.amount, prevStats.amount));
	const dQty = $derived(diff(periodStats.qty, prevStats.qty));
	const dCount = $derived(diff(periodStats.count, prevStats.count));
	const dClient = $derived(diff(periodStats.byClient.length, prevStats.byClient.length));

	// ── 올해 통계 ─────────────────────────────────────────────────────────────
	const thisYear = $derived(new Date(today + 'T00:00:00').getFullYear());
	// ── 일별 집계 (스파크라인 + 라인차트) ─────────────────────────────────────
	const dailyCurr = $derived(calcDaily(allShipouts, fromDate, toDate, cid));
	const dailyPrev = $derived(calcDaily(allShipouts, prev.from, prev.to, cid));

	const sparkQty = $derived(dailyCurr.map((d) => d.qty));
	const sparkAmt = $derived(dailyCurr.map((d) => d.amount));
	const sparkCount = $derived.by(() => {
		// 일별 건수
		const map: Record<string, number> = {};
		for (const s of allShipouts) {
			if (cid && s.client_id !== cid) continue;
			const d = s.created_at.slice(0, 10);
			map[d] = (map[d] ?? 0) + 1;
		}
		return dailyCurr.map((r) => map[r.date] ?? 0);
	});

	// ── 라인차트 metric ────────────────────────────────────────────────────────
	let metric: 'qty' | 'amount' = $state('amount');

	const lineLabels = $derived.by(() => {
		const n = dailyCurr.length;
		if (n === 0) return [];
		// 최대 8개 레이블만 표시
		const step = Math.max(1, Math.floor(n / 7));
		return dailyCurr.map((d, i) => (i % step === 0 ? d.date.slice(5) : ''));
	});

	const lineSeries = $derived([
		{
			label: '현재 기간',
			color: '#3B82F6',
			data: metric === 'amount' ? sparkAmt : sparkQty
		},
		{
			label: '직전 기간',
			color: '#9CA3AF',
			dash: true,
			data: metric === 'amount' ? dailyPrev.map((d) => d.amount) : dailyPrev.map((d) => d.qty)
		}
	]);

	// ── 카테고리 / 도넛 ───────────────────────────────────────────────────────
	const catSorted = $derived([...periodStats.byCategory].sort((a, b) => b.qty - a.qty));
	const catTotal = $derived(catSorted.reduce((s, c) => s + c.qty, 0));
	const donutSegments = $derived(
		catSorted.map((c) => ({ label: c.label, value: c.qty, color: c.color }))
	);

	// ── 부가 KPI ───────────────────────────────────────────────────────────────
	const days = $derived(dailyCurr.length || 1);
	const avgDaily = $derived(Math.round(periodStats.qty / days));
	const avgPerOrder = $derived(
		periodStats.count > 0 ? Math.round(periodStats.qty / periodStats.count) : 0
	);
	const topClient = $derived(periodStats.byClient[0] ?? null);
	const topItem = $derived(periodStats.byItem[0] ?? null);

	// ── 거래처 바차트 ─────────────────────────────────────────────────────────
	const clientBars = $derived(
		periodStats.byClient.slice(0, 8).map((c) => ({
			label: c.name,
			value: metric === 'amount' ? c.amount : c.qty,
			color: '#3B82F6'
		}))
	);

	// ── 연간 스택바 ────────────────────────────────────────────────────────────
	const stackMonthNums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
	const stackCatData = $derived(calcMonthlyCategoryStack(allShipouts, thisYear, cid));
	const stackSeries = $derived(
		CATEGORY_KEYS.filter((cat) => stackCatData[cat]?.some((v) => v > 0)).map((cat) => ({
			label: cat,
			color: CATEGORY_COLORS[cat],
			data: stackCatData[cat]
		}))
	);

	// ── 스파크라인 SVG ────────────────────────────────────────────────────────
	function sparklinePath(values: number[], w: number, h: number): string {
		if (values.length < 2) return '';
		const max = Math.max(...values, 1);
		const pts = values.map((v, i) => {
			const x = (i / (values.length - 1)) * w;
			const y = h - (v / max) * h;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		});
		return 'M ' + pts.join(' L ');
	}

	// ── 프리셋 버튼 ────────────────────────────────────────────────────────────
	const presets: { key: Preset; label: string }[] = [
		{ key: '7d', label: '7일' },
		{ key: '30d', label: '30일' },
		{ key: 'month', label: '이번달' },
		{ key: 'ytd', label: '올해' },
		{ key: 'all', label: '전체' }
	];

	// ── diff 화살표 헬퍼 ────────────────────────────────────────────────────────
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
	<!-- ① 기간 프리셋 필터 바 -->
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

	<!-- ② KPI 카드 4개 -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<!-- 매출 -->
		<div class="bg-base-100 flex flex-col gap-2 rounded-xl p-4 shadow-sm">
			<span class="text-base-content/50 text-xs font-semibold">매출</span>
			<span class="text-base-content text-2xl leading-none font-extrabold tabular-nums">
				{fmtAmt(periodStats.amount)}
			</span>
			<div class="flex items-center gap-1 {diffColor(dAmt.cls)} text-xs font-semibold">
				<Icon icon={diffIcon(dAmt.cls)} class="h-3.5 w-3.5" />
				{dAmt.sign}{dAmt.pct}
				<span class="text-base-content/30 font-normal">직전 대비</span>
			</div>
			<svg viewBox="0 0 80 24" class="h-6 w-full" preserveAspectRatio="none">
				<path
					d={sparklinePath(sparkAmt, 80, 22)}
					fill="none"
					stroke="#3B82F6"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 출고량 -->
		<div class="bg-base-100 flex flex-col gap-2 rounded-xl p-4 shadow-sm">
			<span class="text-base-content/50 text-xs font-semibold">출고량</span>
			<span class="text-base-content text-2xl leading-none font-extrabold tabular-nums">
				{fmtQty(periodStats.qty)}
			</span>
			<div class="flex items-center gap-1 {diffColor(dQty.cls)} text-xs font-semibold">
				<Icon icon={diffIcon(dQty.cls)} class="h-3.5 w-3.5" />
				{dQty.sign}{dQty.pct}
				<span class="text-base-content/30 font-normal">직전 대비</span>
			</div>
			<svg viewBox="0 0 80 24" class="h-6 w-full" preserveAspectRatio="none">
				<path
					d={sparklinePath(sparkQty, 80, 22)}
					fill="none"
					stroke="#8B5CF6"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 처리건수 -->
		<div class="bg-base-100 flex flex-col gap-2 rounded-xl p-4 shadow-sm">
			<span class="text-base-content/50 text-xs font-semibold">처리건수</span>
			<span class="text-base-content text-2xl leading-none font-extrabold tabular-nums">
				{fmtQty(periodStats.count)}건
			</span>
			<div class="flex items-center gap-1 {diffColor(dCount.cls)} text-xs font-semibold">
				<Icon icon={diffIcon(dCount.cls)} class="h-3.5 w-3.5" />
				{dCount.sign}{dCount.pct}
				<span class="text-base-content/30 font-normal">직전 대비</span>
			</div>
			<svg viewBox="0 0 80 24" class="h-6 w-full" preserveAspectRatio="none">
				<path
					d={sparklinePath(sparkCount, 80, 22)}
					fill="none"
					stroke="#10B981"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 활성 거래처 -->
		<div class="bg-base-100 flex flex-col gap-2 rounded-xl p-4 shadow-sm">
			<span class="text-base-content/50 text-xs font-semibold">활성 거래처</span>
			<span class="text-base-content text-2xl leading-none font-extrabold tabular-nums">
				{periodStats.byClient.length}개
			</span>
			<div class="flex items-center gap-1 {diffColor(dClient.cls)} text-xs font-semibold">
				<Icon icon={diffIcon(dClient.cls)} class="h-3.5 w-3.5" />
				{dClient.sign}{dClient.pct}
				<span class="text-base-content/30 font-normal">직전 대비</span>
			</div>
			<div class="flex h-6 items-end gap-px">
				{#each periodStats.byClient.slice(0, 12) as c (c.id)}
					<div
						class="flex-1 rounded-sm"
						style="height:{Math.max(
							20,
							Math.round(
								((metric === 'amount' ? c.amount : c.qty) /
									Math.max(
										...periodStats.byClient.map((x) => (metric === 'amount' ? x.amount : x.qty)),
										1
									)) *
									100
							)
						)}%; background:#06B6D4; opacity:0.7"
					></div>
				{/each}
			</div>
		</div>
	</div>

	<!-- ③ 중간 row: 라인차트 + 도넛 -->
	<div class="grid gap-3 lg:grid-cols-3">
		<!-- 추세 라인차트 (lg:2열) -->
		<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm lg:col-span-2">
			<div class="flex items-center justify-between">
				<span class="text-base-content text-sm font-bold">출고 추세</span>
				<div class="join">
					<button
						class="btn btn-xs join-item {metric === 'amount' ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (metric = 'amount')}>매출액</button
					>
					<button
						class="btn btn-xs join-item {metric === 'qty' ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (metric = 'qty')}>출고량</button
					>
				</div>
			</div>
			<div class="h-40">
				<LineChart series={lineSeries} labels={lineLabels} showArea={true} />
			</div>
			<!-- 범례 -->
			<div class="flex gap-4">
				{#each lineSeries as s (s.label)}
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

		<!-- 카테고리 도넛 (1열) -->
		<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm">
			<span class="text-base-content text-sm font-bold">카테고리</span>
			<div class="flex items-center gap-4">
				<DonutChart
					segments={donutSegments}
					size={120}
					centerLabel="총계"
					centerValue={fmtQty(catTotal)}
				/>
				<div class="flex min-w-0 flex-1 flex-col gap-1.5">
					{#each catSorted.slice(0, 6) as cat (cat.cat)}
						<div class="flex min-w-0 items-center gap-1.5">
							<div class="h-2 w-2 shrink-0 rounded-full" style="background:{cat.color}"></div>
							<span class="text-base-content/70 flex-1 truncate text-[11px] font-medium"
								>{cat.label}</span
							>
							<span class="text-base-content/50 shrink-0 text-[11px] font-semibold tabular-nums">
								{catTotal > 0 ? Math.round((cat.qty / catTotal) * 100) : 0}%
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- ④ 부가 KPI 4개 -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<div class="bg-base-100 flex items-center gap-3 rounded-xl p-4 shadow-sm">
			<div class="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
				<Icon icon="heroicons:cube" class="text-primary h-5 w-5" />
			</div>
			<div class="min-w-0">
				<div class="text-base-content/50 text-[11px] font-semibold">일평균 출고량</div>
				<div class="text-base-content text-lg font-extrabold tabular-nums">{fmtQty(avgDaily)}</div>
			</div>
		</div>

		<div class="bg-base-100 flex items-center gap-3 rounded-xl p-4 shadow-sm">
			<div class="bg-secondary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
				<Icon icon="heroicons:receipt-percent" class="text-secondary h-5 w-5" />
			</div>
			<div class="min-w-0">
				<div class="text-base-content/50 text-[11px] font-semibold">건당 평균 출고</div>
				<div class="text-base-content text-lg font-extrabold tabular-nums">
					{fmtQty(avgPerOrder)}
				</div>
			</div>
		</div>

		<div class="bg-base-100 flex items-center gap-3 rounded-xl p-4 shadow-sm">
			<div class="bg-success/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
				<Icon icon="heroicons:building-storefront" class="text-success h-5 w-5" />
			</div>
			<div class="min-w-0 flex-1 overflow-hidden">
				<div class="text-base-content/50 text-[11px] font-semibold">TOP 거래처</div>
				<div class="text-base-content truncate text-sm font-extrabold">
					{topClient?.name ?? '-'}
				</div>
				{#if topClient}
					<div class="text-base-content/40 text-[11px]">{fmtAmt(topClient.amount)}</div>
				{/if}
			</div>
		</div>

		<div class="bg-base-100 flex items-center gap-3 rounded-xl p-4 shadow-sm">
			<div class="bg-warning/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
				<Icon icon="heroicons:tag" class="text-warning h-5 w-5" />
			</div>
			<div class="min-w-0 flex-1 overflow-hidden">
				<div class="text-base-content/50 text-[11px] font-semibold">TOP 품목</div>
				<div class="text-base-content truncate text-sm font-extrabold">
					{topItem?.name ?? '-'}
				</div>
				{#if topItem}
					<div class="text-base-content/40 text-[11px]">{fmtQty(topItem.qty)}개</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- ⑤ 하단 row: 거래처 바차트 + 품목 테이블 + 연간 스택바 -->
	<div class="grid gap-3 lg:grid-cols-3">
		<!-- 거래처 바차트 -->
		<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm">
			<div class="flex items-center justify-between">
				<span class="text-base-content text-sm font-bold">거래처별 순위</span>
				<span class="text-base-content/40 text-xs">
					{metric === 'amount' ? '매출액' : '출고량'} 기준
				</span>
			</div>
			<div class="h-52">
				{#if clientBars.length > 0}
					<BarChart bars={clientBars} showValue={true} />
				{:else}
					<div class="text-base-content/30 flex h-full items-center justify-center text-xs">
						데이터 없음
					</div>
				{/if}
			</div>
		</div>

		<!-- 품목 순위 테이블 -->
		<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm">
			<span class="text-base-content text-sm font-bold">품목 순위 TOP 10</span>
			<div class="flex flex-col gap-1.5 overflow-hidden">
				{#if periodStats.byItem.length === 0}
					<div class="text-base-content/30 flex h-full items-center justify-center text-xs">
						데이터 없음
					</div>
				{:else}
					{#each periodStats.byItem.slice(0, 10) as item, i (item.name)}
						{@const pct = catTotal > 0 ? Math.round((item.qty / periodStats.qty) * 100) : 0}
						{@const catColor = CATEGORY_COLORS[item.cat] ?? '#9CA3AF'}
						<div class="flex min-w-0 items-center gap-2">
							<span class="text-base-content/30 w-4 shrink-0 text-right text-[11px] font-bold"
								>{i + 1}</span
							>
							<div class="h-2 w-2 shrink-0 rounded-full" style="background:{catColor}"></div>
							<span class="text-base-content/80 flex-1 truncate text-[12px] font-medium"
								>{item.name}</span
							>
							<span class="text-base-content/60 shrink-0 text-[11px] font-semibold tabular-nums"
								>{fmtQty(item.qty)}</span
							>
							<div class="bg-base-200 relative h-1.5 w-14 shrink-0 overflow-hidden rounded-full">
								<div
									class="absolute inset-y-0 left-0 rounded-full"
									style="width:{pct}%; background:{catColor}"
								></div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- 연간 카테고리 스택바 -->
		<div class="bg-base-100 flex flex-col gap-3 rounded-xl p-4 shadow-sm">
			<span class="text-base-content text-sm font-bold">{thisYear}년 월별 출고</span>
			<div class="h-40">
				{#if stackSeries.length > 0}
					<StackBarChart months={stackMonthNums} series={stackSeries} />
				{:else}
					<div class="text-base-content/30 flex h-full items-center justify-center text-xs">
						데이터 없음
					</div>
				{/if}
			</div>
			<!-- 범례 -->
			<div class="flex flex-wrap gap-x-3 gap-y-1">
				{#each stackSeries as s (s.label)}
					<div class="flex items-center gap-1">
						<div class="h-2 w-2 rounded-sm" style="background:{s.color}"></div>
						<span class="text-base-content/50 text-[10px]">{s.label}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
