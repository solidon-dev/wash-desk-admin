<script lang="ts">
	import Icon from '@iconify/svelte';
	import DatePicker from './_components/DatePicker.svelte';
	import LineChart from './_components/LineChart.svelte';
	import BarChart from './_components/BarChart.svelte';
	import DonutChart from './_components/DonutChart.svelte';
	import StackBarChart from './_components/StackBarChart.svelte';

	import type { StatsShipout } from '$lib/api/stats';
	import {
		calcStats,
		calcDaily,
		calcRangeMonthly,
		calcMonthlyCategoryStack,
		prevPeriod,
		daysBetween,
		offsetDate,
		diff,
		fmtQty,
		fmtAmt,
		fmtAmtFull,
		pad,
		CATEGORY_KEYS,
		CATEGORY_COLORS
	} from './_lib/stats';

	// ─── SSR load 데이터 ────────────────────────────────────────────────────
	const { data } = $props<{ data: import('./$types').PageData }>();

	// ─── 기준일 ───────────────────────────────────────────────────────────────
	const NOW = new Date();
	const TODAY = $derived(data.today);
	const THIS_YEAR = NOW.getFullYear();
	const THIS_MONTH = NOW.getMonth() + 1;
	const MONTH_FROM = `${THIS_YEAR}-${pad(THIS_MONTH)}-01`;
	const MONTH_TO = `${THIS_YEAR}-${pad(THIS_MONTH)}-${pad(new Date(THIS_YEAR, THIS_MONTH, 0).getDate())}`;
	const DATA_FROM = '2025-01-01';

	// ─── 상태 ────────────────────────────────────────────────────────────────
	let fromDate = $state(MONTH_FROM);
	let toDate = $state(MONTH_TO);
	let filterClientId = $state('');
	let metric = $state<'qty' | 'amount'>('amount');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// SSR에서 받은 데이터로 초기화 — 로딩 없이 바로 표시
	const allShipoutsBase = $derived(data.shipouts as StatsShipout[]);
	let allShipouts = $state<StatsShipout[]>([]);
	$effect(() => {
		allShipouts = allShipoutsBase;
	});

	type PresetKey = '7d' | '30d' | 'month' | 'ytd' | 'all';
	let activePreset = $state<PresetKey>('month');

	function applyPreset(k: PresetKey) {
		activePreset = k;
		if (k === '7d') {
			fromDate = offsetDate(NOW, -6);
			toDate = TODAY;
		} else if (k === '30d') {
			fromDate = offsetDate(NOW, -29);
			toDate = TODAY;
		} else if (k === 'month') {
			fromDate = MONTH_FROM;
			toDate = MONTH_TO;
		} else if (k === 'ytd') {
			fromDate = `${THIS_YEAR}-01-01`;
			toDate = TODAY;
		} else {
			fromDate = DATA_FROM;
			toDate = TODAY;
		}
	}

	// ─── 데이트픽커 ──────────────────────────────────────────────────────────
	type PickerTarget = 'from' | 'to';
	let pickerOpen = $state(false);
	let pickerTarget = $state<PickerTarget>('from');
	function openPicker(t: PickerTarget) {
		pickerTarget = t;
		pickerOpen = true;
	}
	function handlePickerSelect(_t: 'from' | 'to' | 'single', ymd: string) {
		if (pickerTarget === 'from') {
			fromDate = ymd;
			if (ymd > toDate) toDate = ymd;
		} else {
			toDate = ymd;
			if (ymd < fromDate) fromDate = ymd;
		}
		activePreset = '' as unknown as PresetKey;
		pickerOpen = false;
	}

	// ─── 파생 데이터 ─────────────────────────────────────────────────────────
	const cid = $derived(filterClientId || undefined);

	const periodStats = $derived(calcStats(allShipouts, fromDate, toDate, cid));
	const yearStats = $derived(
		calcStats(allShipouts, `${THIS_YEAR}-01-01`, `${THIS_YEAR}-12-31`, cid)
	);

	const prev = $derived(prevPeriod(fromDate, toDate));
	const prevStats = $derived(calcStats(allShipouts, prev.from, prev.to, cid));

	const periodDays = $derived(daysBetween(fromDate, toDate));
	const trendMode = $derived(periodDays <= 60 ? 'daily' : 'monthly');

	const dailyCurr = $derived(calcDaily(allShipouts, fromDate, toDate, cid));
	const dailyPrev = $derived(calcDaily(allShipouts, prev.from, prev.to, cid));
	const monthlyCurr = $derived(calcRangeMonthly(allShipouts, fromDate, toDate, cid));
	const monthlyPrev = $derived(calcRangeMonthly(allShipouts, prev.from, prev.to, cid));

	const trendSeries = $derived(
		trendMode === 'daily'
			? [
					{
						label: '현재',
						color: metric === 'amount' ? 'var(--color-success)' : 'var(--color-primary)',
						dash: false,
						data: dailyCurr.map((r) => (metric === 'amount' ? r.amount : r.qty))
					},
					{
						label: '직전',
						color: 'var(--color-base-content)',
						dash: true,
						data: dailyPrev.map((r) => (metric === 'amount' ? r.amount : r.qty))
					}
				]
			: [
					{
						label: '현재',
						color: metric === 'amount' ? 'var(--color-success)' : 'var(--color-primary)',
						dash: false,
						data: monthlyCurr.map((r) => (metric === 'amount' ? r.amount : r.qty))
					},
					{
						label: '직전',
						color: 'var(--color-base-content)',
						dash: true,
						data: monthlyPrev.map((r) => (metric === 'amount' ? r.amount : r.qty))
					}
				]
	);

	const trendLabels = $derived.by(() => {
		if (trendMode === 'daily') {
			const labels = dailyCurr.map((r) => r.date.slice(5));
			const step = labels.length <= 14 ? 1 : labels.length <= 31 ? 3 : 5;
			return labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? l : ''));
		}
		return monthlyCurr.map((r) => r.label);
	});

	// 카테고리 도넛
	const catTotal = $derived(periodStats.byCategory.reduce((s, r) => s + r.qty, 0));
	const donutSegments = $derived(
		periodStats.byCategory.map((r) => ({ label: r.label, value: r.qty, color: r.color }))
	);
	const catSorted = $derived([...periodStats.byCategory].sort((a, b) => b.qty - a.qty));

	// 거래처 색상 순환
	const CC = [
		'var(--color-primary)',
		'var(--color-secondary)',
		'var(--color-accent)',
		'var(--color-success)',
		'var(--color-warning)',
		'var(--color-info)'
	];

	// 거래처 바 차트
	const clientBars = $derived(
		periodStats.byClient.map((c, i) => ({
			label: c.name,
			value: metric === 'amount' ? c.amount : c.qty,
			color: CC[i % CC.length]
		}))
	);

	// 연간 카테고리 스택
	const stackData = $derived(calcMonthlyCategoryStack(allShipouts, THIS_YEAR, cid));
	const stackSeries = $derived(
		CATEGORY_KEYS.map((k) => ({
			label: k,
			color: CATEGORY_COLORS[k],
			data: stackData[k] ?? new Array(12).fill(0)
		}))
	);

	// KPI diff
	const dCount = $derived(diff(periodStats.count, prevStats.count));
	const dQty = $derived(diff(periodStats.qty, prevStats.qty));
	const dAmt = $derived(diff(periodStats.amount, prevStats.amount));
	const dClient = $derived(diff(periodStats.byClient.length, prevStats.byClient.length));

	function dcls(c: string) {
		return c === 'up' ? 'text-success' : c === 'down' ? 'text-error' : 'text-base-content/40';
	}

	// 부가 KPI
	const avgDaily = $derived(periodDays > 0 ? Math.round(periodStats.qty / periodDays) : 0);
	const avgPerOrder = $derived(
		periodStats.count > 0 ? Math.round(periodStats.qty / periodStats.count) : 0
	);

	// 스파크라인
	function sparklinePath(values: number[], w = 100, h = 24): string {
		if (values.length === 0) return '';
		const max = Math.max(...values, 1);
		const n = values.length;
		return values
			.map((v, i) => {
				const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
				const y = h - (v / max) * h;
				return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(' ');
	}

	const sparkQty = $derived(dailyCurr.map((r) => r.qty));
	const sparkAmt = $derived(dailyCurr.map((r) => r.amount));
	const sparkCount = $derived(
		(() => {
			const idx: Record<string, number> = Object.fromEntries(dailyCurr.map((r) => [r.date, 0]));
			for (const s of allShipouts) {
				if (cid && s.client_id !== cid) continue;
				const d = s.created_at.slice(0, 10);
				if (idx[d] != null) idx[d] += 1;
			}
			return dailyCurr.map((r) => idx[r.date]);
		})()
	);

	// 거래처 목록 (셀렉트박스용, DB 데이터에서 추출)
	const clientList = $derived(
		[
			...new Map(
				allShipouts.map((s) => [s.client_id, { id: s.client_id, name: s.client_name }])
			).values()
		].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
	);
</script>

<svelte:head><title>출고 통계 | 워시데스크</title></svelte:head>

<DatePicker
	show={pickerOpen}
	target={pickerTarget === 'from' ? 'from' : 'to'}
	{fromDate}
	{toDate}
	onselect={handlePickerSelect}
	onclose={() => (pickerOpen = false)}
/>

<div class="bg-base-200 flex h-full flex-col overflow-hidden">
	<!-- ═══════════ 헤더 ═══════════ -->
	<div
		class="bg-base-200 border-base-300 flex shrink-0 flex-wrap items-center gap-3 border-b px-5 pt-4 pb-3"
	>
		<div class="mr-2 flex items-center gap-2">
			<div class="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
				<Icon icon="heroicons:chart-bar-square" class="text-primary h-4 w-4" />
			</div>
			<h2 class="text-base-content text-sm leading-tight font-extrabold">출고 통계 대시보드</h2>
		</div>

		<!-- 프리셋 -->
		<div class="join">
			{#each [['7d', '7일'], ['30d', '30일'], ['month', '이번달'], ['ytd', '올해'], ['all', '전체']] as const as [k, label] (k)}
				<button
					type="button"
					class="join-item btn btn-xs h-7 px-3 text-[11px] font-bold {activePreset === k
						? 'btn-primary'
						: 'btn-ghost border-base-300 border'}"
					onclick={() => applyPreset(k)}>{label}</button
				>
			{/each}
		</div>

		<!-- 날짜 -->
		<div class="flex items-center gap-1.5">
			<button
				type="button"
				class="btn btn-xs btn-ghost border-base-300 h-7 min-h-0 border px-2 font-mono text-[11px]"
				onclick={() => openPicker('from')}
			>
				<Icon icon="heroicons:calendar" class="mr-1 h-3.5 w-3.5 opacity-50" />{fromDate}
			</button>
			<span class="text-base-content/30 text-xs">~</span>
			<button
				type="button"
				class="btn btn-xs btn-ghost border-base-300 h-7 min-h-0 border px-2 font-mono text-[11px]"
				onclick={() => openPicker('to')}>{toDate}</button
			>
			<span class="badge badge-ghost badge-sm h-5 text-[10px] font-semibold">{periodDays}일</span>
		</div>

		<!-- 거래처 -->
		<select
			bind:value={filterClientId}
			class="select select-bordered select-sm h-7 min-h-0 w-36 text-xs"
		>
			<option value="">전체 거래처</option>
			{#each clientList as c (c.id)}
				<option value={c.id}>{c.name}</option>
			{/each}
		</select>

		<div class="flex-1"></div>

		<!-- 로딩 인디케이터 -->
		{#if loading}
			<span class="loading loading-spinner loading-xs text-primary"></span>
		{/if}

		<!-- 비교 표시 -->
		<div class="text-base-content/40 hidden items-center gap-1 text-[10px] md:flex">
			<Icon icon="heroicons:arrow-path-rounded-square" class="h-3 w-3" />
			직전 동일기간 대비 ({prev.from} ~ {prev.to})
		</div>
	</div>

	<!-- ═══════════ 본문 ═══════════ -->
	<div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
		<!-- 에러 -->
		{#if error}
			<div class="alert alert-error mb-3 text-sm">
				<Icon icon="heroicons:exclamation-triangle" class="h-5 w-5" />
				{error}
			</div>
		{/if}

		<div class="flex min-h-full flex-col gap-3">
			<!-- ── KPI 카드 4개 ── -->
			<div class="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
				{#each [{ label: '매출', val: fmtAmt(periodStats.amount), unit: '원', cls: 'text-success', d: dAmt, spark: sparkAmt, color: 'var(--color-success)', icon: 'heroicons:banknotes' }, { label: '출고량', val: fmtQty(periodStats.qty), unit: '개', cls: 'text-primary', d: dQty, spark: sparkQty, color: 'var(--color-primary)', icon: 'heroicons:cube' }, { label: '처리건수', val: fmtQty(periodStats.count), unit: '건', cls: 'text-base-content', d: dCount, spark: sparkCount, color: 'var(--color-base-content)', icon: 'heroicons:document-check' }, { label: '활성 거래처', val: String(periodStats.byClient.length), unit: '개사', cls: 'text-accent', d: dClient, spark: [] as number[], color: 'var(--color-accent)', icon: 'heroicons:building-storefront' }] as k (k.label)}
					<div class="bg-base-100 relative overflow-hidden rounded-xl p-4 shadow-sm">
						<div class="mb-1 flex items-start justify-between">
							<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
								{k.label}
							</p>
							<Icon icon={k.icon} class="h-4 w-4 opacity-30" />
						</div>
						<p class="text-2xl font-extrabold {k.cls} leading-none">
							{k.val}<span class="ml-1 text-sm font-normal opacity-50">{k.unit}</span>
						</p>
						<div class="mt-2 flex items-center justify-between">
							<p class="text-[11px] {dcls(k.d.cls)} flex items-center gap-1 font-bold">
								{#if k.d.cls === 'up'}<Icon icon="heroicons:arrow-trending-up" class="h-3 w-3" />
								{:else if k.d.cls === 'down'}<Icon
										icon="heroicons:arrow-trending-down"
										class="h-3 w-3"
									/>
								{/if}
								{k.d.sign}{k.d.pct}
								<span class="text-base-content/30 font-normal">vs 직전</span>
							</p>
							{#if k.spark.length > 1}
								<svg
									viewBox="0 0 100 24"
									width="64"
									height="20"
									class="opacity-70"
									preserveAspectRatio="none"
								>
									<path
										d={sparklinePath(k.spark)}
										fill="none"
										stroke={k.color}
										stroke-width="1.5"
										stroke-linejoin="round"
										stroke-linecap="round"
										vector-effect="non-scaling-stroke"
									/>
								</svg>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- ── 추이 + 카테고리 ── -->
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-3" style="min-height:260px">
				<div class="bg-base-100 flex flex-col overflow-hidden rounded-xl shadow-sm lg:col-span-2">
					<div
						class="border-base-200 flex shrink-0 items-center justify-between border-b px-4 pt-3 pb-2"
					>
						<div>
							<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
								{trendMode === 'daily' ? '일별' : '월별'} 추이
							</p>
							<p class="text-base-content/30 mt-0.5 text-[10px]">현재 vs 직전 {periodDays}일</p>
						</div>
						<div class="flex items-center gap-3">
							<div class="text-base-content/40 flex gap-2 text-[10px]">
								<span class="flex items-center gap-1"
									><span
										class="inline-block h-1.5 w-3 rounded {metric === 'amount'
											? 'bg-success'
											: 'bg-primary'}"
									></span>현재</span
								>
								<span class="flex items-center gap-1"
									><span class="bg-base-content/30 inline-block h-1.5 w-3 rounded"></span>직전</span
								>
							</div>
							<div class="join">
								<button
									type="button"
									class="join-item btn btn-xs h-6 px-2 text-[10px] font-bold {metric === 'amount'
										? 'btn-primary'
										: 'btn-ghost border-base-300 border'}"
									onclick={() => (metric = 'amount')}>매출</button
								>
								<button
									type="button"
									class="join-item btn btn-xs h-6 px-2 text-[10px] font-bold {metric === 'qty'
										? 'btn-primary'
										: 'btn-ghost border-base-300 border'}"
									onclick={() => (metric = 'qty')}>출고량</button
								>
							</div>
						</div>
					</div>
					<div class="min-h-0 flex-1 px-2 pb-1">
						{#if loading}
							<div class="flex h-full items-center justify-center">
								<span class="loading loading-spinner loading-sm text-primary"></span>
							</div>
						{:else if trendSeries[0].data.every((v) => v === 0)}
							<div class="text-base-content/30 flex h-full items-center justify-center text-sm">
								데이터 없음
							</div>
						{:else}
							<LineChart series={trendSeries} labels={trendLabels} showArea={true} />
						{/if}
					</div>
				</div>

				<!-- 카테고리 도넛 -->
				<div class="bg-base-100 flex flex-col overflow-hidden rounded-xl shadow-sm">
					<div
						class="border-base-200 flex shrink-0 items-center justify-between border-b px-4 pt-3 pb-2"
					>
						<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
							카테고리 구성
						</p>
						<span class="text-base-content/30 text-[10px]">{periodStats.byCategory.length}종</span>
					</div>
					{#if catTotal === 0}
						<div class="text-base-content/30 flex flex-1 items-center justify-center text-sm">
							데이터 없음
						</div>
					{:else}
						<div class="flex min-h-0 flex-1 items-center gap-3 overflow-hidden p-3">
							<DonutChart
								segments={donutSegments}
								size={130}
								centerLabel="총"
								centerValue={fmtQty(catTotal)}
							/>
							<div class="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto">
								{#each catSorted as row (row.cat)}
									{@const pct = catTotal > 0 ? (row.qty / catTotal) * 100 : 0}
									<div class="flex items-center gap-2 text-[11px]">
										<span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:{row.color}"
										></span>
										<span class="text-base-content/70 flex-1 truncate font-semibold"
											>{row.label}</span
										>
										<span class="text-base-content/90 font-bold tabular-nums"
											>{pct.toFixed(0)}%</span
										>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- ── 부가 KPI 스트립 ── -->
			<div class="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
				<div class="bg-base-100 flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm">
					<Icon icon="heroicons:calendar-days" class="text-primary h-7 w-7 opacity-60" />
					<div class="min-w-0">
						<p class="text-base-content/40 text-[10px] font-bold tracking-wider uppercase">
							일평균 출고
						</p>
						<p class="text-base font-extrabold tabular-nums">
							{fmtQty(avgDaily)}<span class="ml-1 text-[10px] font-normal opacity-50">개/일</span>
						</p>
					</div>
				</div>
				<div class="bg-base-100 flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm">
					<Icon icon="heroicons:archive-box" class="text-secondary h-7 w-7 opacity-60" />
					<div class="min-w-0">
						<p class="text-base-content/40 text-[10px] font-bold tracking-wider uppercase">
							건당 평균 출고
						</p>
						<p class="text-base font-extrabold tabular-nums">
							{fmtQty(avgPerOrder)}<span class="ml-1 text-[10px] font-normal opacity-50">개/건</span
							>
						</p>
					</div>
				</div>
				<div class="bg-base-100 flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm">
					<Icon icon="heroicons:trophy" class="text-warning h-7 w-7 opacity-60" />
					<div class="min-w-0">
						<p class="text-base-content/40 text-[10px] font-bold tracking-wider uppercase">
							최다 품목
						</p>
						<p class="truncate text-base font-extrabold">
							{periodStats.byItem[0]?.name ?? '-'}
							<span class="ml-1 text-[10px] font-normal tabular-nums opacity-50"
								>{periodStats.byItem[0] ? fmtQty(periodStats.byItem[0].qty) : 0}</span
							>
						</p>
					</div>
				</div>
				<div class="bg-base-100 flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm">
					<Icon icon="heroicons:star" class="text-success h-7 w-7 opacity-60" />
					<div class="min-w-0">
						<p class="text-base-content/40 text-[10px] font-bold tracking-wider uppercase">
							최우수 거래처
						</p>
						<p class="truncate text-base font-extrabold">
							{periodStats.byClient[0]?.name ?? '-'}
							<span class="ml-1 text-[10px] font-normal tabular-nums opacity-50"
								>{periodStats.byClient[0] ? fmtAmt(periodStats.byClient[0].amount) : 0}</span
							>
						</p>
					</div>
				</div>
			</div>

			<!-- ── 거래처 랭킹 + 품목 TOP10 + 연간 스택 ── -->
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-3" style="min-height:300px">
				<!-- 거래처 랭킹 -->
				<div class="bg-base-100 flex flex-col overflow-hidden rounded-xl shadow-sm">
					<div
						class="border-base-200 flex shrink-0 items-center justify-between border-b px-4 pt-3 pb-2"
					>
						<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
							거래처 랭킹
						</p>
						<span class="text-base-content/30 text-[10px]"
							>{metric === 'amount' ? '매출' : '출고량'} 기준</span
						>
					</div>
					{#if clientBars.length === 0}
						<div class="text-base-content/30 flex flex-1 items-center justify-center text-sm">
							데이터 없음
						</div>
					{:else}
						<div class="flex-1 overflow-y-auto px-3 py-3">
							<BarChart bars={clientBars} showValue={true} />
						</div>
					{/if}
				</div>

				<!-- 품목 TOP 10 -->
				<div class="bg-base-100 flex flex-col overflow-hidden rounded-xl shadow-sm">
					<div
						class="border-base-200 flex shrink-0 items-center justify-between border-b px-4 pt-3 pb-2"
					>
						<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
							품목 TOP 10
						</p>
						<span class="text-base-content/30 text-[10px]">출고량 기준</span>
					</div>
					{#if periodStats.byItem.length === 0}
						<div class="text-base-content/30 flex flex-1 items-center justify-center text-sm">
							데이터 없음
						</div>
					{:else}
						<div class="flex-1 overflow-y-auto">
							<table class="table-xs table w-full">
								<thead class="bg-base-100 sticky top-0 z-10">
									<tr class="text-base-content/40 text-[10px]">
										<th class="w-7 text-center">#</th>
										<th>품목</th>
										<th class="text-right">수량</th>
										<th class="w-20 text-right">비중</th>
									</tr>
								</thead>
								<tbody>
									{#each periodStats.byItem.slice(0, 10) as item, i (item.name)}
										{@const pct = periodStats.qty > 0 ? (item.qty / periodStats.qty) * 100 : 0}
										{@const catColor =
											periodStats.byCategory.find((c) => c.cat === item.cat)?.color ??
											'var(--color-base-content)'}
										{@const catLabel =
											periodStats.byCategory.find((c) => c.cat === item.cat)?.label ?? item.cat}
										<tr class="hover:bg-base-200/40">
											<td class="text-center">
												{#if i === 0}
													<span
														class="bg-warning text-warning-content inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black"
														>1</span
													>
												{:else if i === 1}
													<span
														class="bg-base-300 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black"
														>2</span
													>
												{:else if i === 2}
													<span
														class="bg-base-content/20 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black"
														>3</span
													>
												{:else}
													<span class="text-base-content/30 text-[10px]">{i + 1}</span>
												{/if}
											</td>
											<td>
												<p class="text-xs leading-tight font-semibold">{item.name}</p>
												<p class="text-[10px]" style="color:{catColor}">{catLabel}</p>
											</td>
											<td class="text-right text-xs font-bold tabular-nums">{fmtQty(item.qty)}</td>
											<td class="text-right">
												<div class="flex items-center gap-1">
													<progress
														class="progress h-1 flex-1"
														value={item.qty}
														max={periodStats.byItem[0]?.qty ?? 1}
													></progress>
													<span class="text-base-content/50 w-7 text-right text-[10px] tabular-nums"
														>{pct.toFixed(0)}%</span
													>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>

				<!-- 연간 카테고리 스택 -->
				<div class="bg-base-100 flex flex-col overflow-hidden rounded-xl shadow-sm">
					<div class="border-base-200 shrink-0 border-b px-4 pt-3 pb-2">
						<div class="flex items-center justify-between">
							<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
								{THIS_YEAR}년 월별 카테고리
							</p>
							<span class="text-base-content/30 text-[10px]">연간 누적</span>
						</div>
						<div class="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
							{#each CATEGORY_KEYS as k (k)}
								<span class="text-base-content/40 flex items-center gap-1 text-[9px]">
									<span class="h-1.5 w-1.5 rounded-sm" style="background:{CATEGORY_COLORS[k]}"
									></span>{k}
								</span>
							{/each}
						</div>
					</div>
					<div class="min-h-0 flex-1 px-2 pt-1 pb-1">
						<StackBarChart months={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} series={stackSeries} />
					</div>
				</div>
			</div>

			<!-- ── 거래처 상세 테이블 ── -->
			<div class="bg-base-100 overflow-hidden rounded-xl shadow-sm">
				<div class="border-base-200 flex items-center justify-between border-b px-4 pt-3 pb-2">
					<p class="text-base-content/40 text-[11px] font-bold tracking-widest uppercase">
						거래처 상세
					</p>
					<span class="text-base-content/30 text-[10px]"
						>{fromDate} ~ {toDate} · 연간 점유율 비교</span
					>
				</div>
				<div class="overflow-x-auto">
					<table class="table-xs table w-full">
						<thead class="bg-base-200/40 text-base-content/50 text-[11px]">
							<tr>
								<th class="w-6"></th>
								<th>거래처</th>
								<th class="text-right">건수</th>
								<th class="text-right">출고량</th>
								<th class="text-right">매출</th>
								<th class="text-right">기간 점유율</th>
								<th class="text-right">연간 점유율</th>
							</tr>
						</thead>
						<tbody>
							{#each periodStats.byClient as row, i (row.id)}
								{@const pPct = periodStats.qty > 0 ? (row.qty / periodStats.qty) * 100 : 0}
								{@const yQty = yearStats.byClient.find((c) => c.id === row.id)?.qty ?? 0}
								{@const yPct = yearStats.qty > 0 ? (yQty / yearStats.qty) * 100 : 0}
								<tr class="hover:bg-base-200/40">
									<td
										><span
											class="block h-2.5 w-2.5 rounded-full"
											style="background:{CC[i % CC.length]}"
										></span></td
									>
									<td class="text-xs font-semibold">{row.name}</td>
									<td class="text-base-content/60 text-right text-[11px] tabular-nums"
										>{row.count}</td
									>
									<td class="text-right text-xs font-bold tabular-nums">{fmtQty(row.qty)}</td>
									<td
										class="text-success text-right text-xs font-semibold tabular-nums"
										title={fmtAmtFull(row.amount)}>{fmtAmt(row.amount)}</td
									>
									<td class="text-right">
										<div class="flex items-center justify-end gap-1.5">
											<progress class="progress progress-primary h-1.5 w-20" value={pPct} max="100"
											></progress>
											<span
												class="text-base-content/60 w-8 text-right text-[10px] font-semibold tabular-nums"
												>{pPct.toFixed(0)}%</span
											>
										</div>
									</td>
									<td class="text-right">
										<div class="flex items-center justify-end gap-1.5">
											<progress class="progress progress-accent h-1.5 w-20" value={yPct} max="100"
											></progress>
											<span
												class="text-base-content/60 w-8 text-right text-[10px] font-semibold tabular-nums"
												>{yPct.toFixed(0)}%</span
											>
										</div>
									</td>
								</tr>
							{/each}
							{#if periodStats.byClient.length === 0}
								<tr
									><td colspan="7" class="text-base-content/30 py-6 text-center text-xs"
										>선택 기간에 출고 데이터가 없습니다</td
									></tr
								>
							{/if}
						</tbody>
						{#if periodStats.byClient.length > 0}
							<tfoot>
								<tr class="border-base-300 bg-base-200/40 border-t-2 text-xs font-bold">
									<td></td>
									<td>합계</td>
									<td class="text-right tabular-nums">{periodStats.count}</td>
									<td class="text-right tabular-nums">{fmtQty(periodStats.qty)}</td>
									<td class="text-success text-right tabular-nums">{fmtAmt(periodStats.amount)}</td>
									<td></td>
									<td></td>
								</tr>
							</tfoot>
						{/if}
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
