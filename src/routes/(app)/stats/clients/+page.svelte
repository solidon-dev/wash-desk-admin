<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import LineChart from '../_components/LineChart.svelte';
	import DonutChart from '../_components/DonutChart.svelte';
	import { calcStats, calcRangeMonthly, fmtAmt, fmtQty, CATEGORY_COLORS } from '../_lib/stats';
	import type { StatsShipout } from '$lib/api/stats';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ─── 서버 데이터 동기화 ───────────────────────────────────────────────────

	let allShipouts = $state<StatsShipout[]>([]);

	$effect(() => {
		allShipouts = data.shipouts ?? [];
	});

	// ─── URL 파라미터 ─────────────────────────────────────────────────────────

	const cid = $derived(page.url.searchParams.get('clientId') ?? '');

	// ─── 기간 프리셋 ─────────────────────────────────────────────────────────

	type Preset = 'thisMonth' | 'lastMonth' | 'last3m' | 'thisYear' | 'allTime';
	let preset = $state<Preset>('thisMonth');

	const today = $derived(data.today as string);

	const periodRange = $derived.by(() => {
		const y = parseInt(today.slice(0, 4), 10);
		const m = parseInt(today.slice(5, 7), 10);
		const mm = String(m).padStart(2, '0');

		if (preset === 'thisMonth') {
			return { from: `${y}-${mm}-01`, to: today };
		}
		if (preset === 'lastMonth') {
			const lm = m === 1 ? 12 : m - 1;
			const ly = m === 1 ? y - 1 : y;
			const lmStr = String(lm).padStart(2, '0');
			// 해당 월의 마지막 날 계산 (다음달 0일 = 이번달 마지막)
			const lastDay = 32 - new Date(ly, lm - 1, 32).getDate();
			return {
				from: `${ly}-${lmStr}-01`,
				to: `${ly}-${lmStr}-${String(lastDay).padStart(2, '0')}`
			};
		}
		if (preset === 'last3m') {
			const fm = m - 3 <= 0 ? m - 3 + 12 : m - 3;
			const fy = m - 3 <= 0 ? y - 1 : y;
			return { from: `${fy}-${String(fm).padStart(2, '0')}-01`, to: today };
		}
		if (preset === 'thisYear') {
			return { from: `${y}-01-01`, to: today };
		}
		// allTime: 전체 데이터 기준
		return { from: '2025-01-01', to: today };
	});

	// ─── 정렬 기준 ────────────────────────────────────────────────────────────

	let sortBy = $state<'amount' | 'qty' | 'count'>('amount');

	// ─── 전체 + 필터 통계 집계 ────────────────────────────────────────────────

	const allStats = $derived(calcStats(allShipouts, periodRange.from, periodRange.to));

	// clientId 필터 없이 거래처 순위용 (기간만 적용)
	const clientRanking = $derived.by(() => {
		const sorted = [...allStats.byClient].sort((a, b) => b[sortBy] - a[sortBy]);
		return sorted;
	});

	// 선택 거래처 기간 통계
	const selectedStats = $derived(
		cid ? calcStats(allShipouts, periodRange.from, periodRange.to, cid) : null
	);

	// 선택 거래처 월별 추세 (올해)
	const thisYear = new Date().getFullYear();
	const selectedClientMonthly = $derived(
		cid ? calcRangeMonthly(allShipouts, `${thisYear}-01-01`, today, cid) : null
	);

	// 선택 거래처 이름
	const selectedClientName = $derived(
		cid ? (allStats.byClient.find((c) => c.id === cid)?.name ?? cid) : ''
	);

	// ─── 차트 데이터 ─────────────────────────────────────────────────────────

	const monthlyLineSeries = $derived(
		selectedClientMonthly
			? [
					{
						label: selectedClientName,
						color: '#3B82F6',
						data: selectedClientMonthly.map((r) => r.amount)
					}
				]
			: []
	);

	const monthlyLineLabels = $derived(
		selectedClientMonthly ? selectedClientMonthly.map((r) => r.label) : []
	);

	const donutSegments = $derived(
		selectedStats
			? selectedStats.byCategory
					.filter((c) => c.amount > 0)
					.map((c) => ({ label: c.label, value: c.amount, color: c.color }))
			: []
	);

	// ─── 점유율 계산 ─────────────────────────────────────────────────────────

	function share(val: number, total: number): string {
		if (total === 0) return '0.0%';
		return `${((val / total) * 100).toFixed(1)}%`;
	}

	const totalForSort = $derived(allStats.byClient.reduce((s, c) => s + c[sortBy], 0));

	// ─── 거래처 클릭 ─────────────────────────────────────────────────────────

	function selectClient(id: string) {
		const url = new URL(page.url);
		if (id && id !== cid) {
			url.searchParams.set('clientId', id);
		} else {
			url.searchParams.delete('clientId');
		}
		goto(url.pathname + url.search, { replaceState: true });
	}

	// ─── 정렬 레이블 ─────────────────────────────────────────────────────────

	const sortLabel = $derived(sortBy === 'amount' ? '매출액' : sortBy === 'qty' ? '출고량' : '건수');

	const presetLabels: Record<Preset, string> = {
		thisMonth: '이번달',
		lastMonth: '지난달',
		last3m: '최근 3개월',
		thisYear: '올해',
		allTime: '전체'
	};
</script>

<div class="bg-base-200 flex flex-col gap-4 px-5 py-4">
	<!-- ① 상단 필터 바 -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- 기간 프리셋 -->
		<div class="join">
			{#each Object.entries(presetLabels) as [val, lbl] (val)}
				<button
					class="join-item btn btn-sm text-xs {preset === val
						? 'btn-primary'
						: 'btn-ghost bg-base-100'}"
					onclick={() => (preset = val as Preset)}
				>
					{lbl}
				</button>
			{/each}
		</div>

		<!-- 구분선 -->
		<div class="bg-base-300 h-5 w-px"></div>

		<!-- 정렬 기준 -->
		<div class="join">
			{#each [['amount', '매출'], ['qty', '출고량'], ['count', '건수']] as [val, lbl] (val)}
				<button
					class="join-item btn btn-sm text-xs {sortBy === val
						? 'btn-neutral'
						: 'btn-ghost bg-base-100'}"
					onclick={() => (sortBy = val as 'amount' | 'qty' | 'count')}
				>
					{lbl}
				</button>
			{/each}
		</div>

		<span class="text-base-content/40 ml-auto text-xs">
			{periodRange.from} ~ {periodRange.to}
		</span>
	</div>

	<!-- ② 거래처 순위 섹션 -->
	<div class="bg-base-100 overflow-hidden rounded-xl shadow-sm">
		<div class="border-base-200 border-b px-4 py-3">
			<span class="text-base-content/70 text-xs font-bold">
				거래처 순위 <span class="text-base-content/40 font-normal">— {sortLabel} 기준</span>
			</span>
		</div>

		{#if clientRanking.length === 0}
			<div class="flex items-center justify-center py-10">
				<span class="text-base-content/30 text-sm">데이터 없음</span>
			</div>
		{:else}
			<!-- 테이블 형 순위 -->
			<div class="overflow-x-auto">
				<table class="table-xs table w-full">
					<thead>
						<tr class="bg-base-200/50">
							<th class="w-8 text-center text-xs font-semibold">#</th>
							<th class="text-xs font-semibold">거래처</th>
							<th class="text-right text-xs font-semibold">매출</th>
							<th class="text-right text-xs font-semibold">출고량</th>
							<th class="text-right text-xs font-semibold">건수</th>
							<th class="w-24 text-xs font-semibold">점유율</th>
						</tr>
					</thead>
					<tbody>
						{#each clientRanking as c, i (c.id)}
							{@const isSelected = c.id === cid}
							{@const shareVal = c[sortBy]}
							{@const sharePct = totalForSort > 0 ? (shareVal / totalForSort) * 100 : 0}
							<tr
								class="cursor-pointer transition-colors {isSelected
									? 'bg-primary/10 hover:bg-primary/15'
									: 'hover:bg-base-200/60'}"
								onclick={() => selectClient(c.id)}
							>
								<td class="text-base-content/40 text-center text-xs font-bold">{i + 1}</td>
								<td>
									<div class="flex items-center gap-1.5">
										{#if isSelected}
											<Icon
												icon="heroicons:check-circle-solid"
												class="text-primary h-3.5 w-3.5 shrink-0"
											/>
										{/if}
										<span class="text-xs font-medium {isSelected ? 'text-primary font-bold' : ''}"
											>{c.name}</span
										>
									</div>
								</td>
								<td class="text-right text-xs tabular-nums">{fmtAmt(c.amount)}</td>
								<td class="text-right text-xs tabular-nums">{fmtQty(c.qty)}</td>
								<td class="text-right text-xs tabular-nums">{c.count}</td>
								<td>
									<div class="flex items-center gap-1.5">
										<div class="bg-base-200 flex-1 overflow-hidden rounded-sm" style="height:6px">
											<div
												class="h-full rounded-sm transition-all {isSelected
													? 'bg-primary'
													: 'bg-base-content/30'}"
												style="width:{sharePct}%"
											></div>
										</div>
										<span
											class="text-base-content/50 w-10 shrink-0 text-right text-[10px] tabular-nums"
											>{share(shareVal, totalForSort)}</span
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

	<!-- ③ 선택된 거래처 상세 -->
	{#if cid && selectedStats}
		<div class="flex flex-col gap-3">
			<!-- 헤더 -->
			<div class="flex items-center gap-2">
				<div class="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
					<Icon icon="heroicons:building-storefront" class="text-primary h-4 w-4" />
				</div>
				<h3 class="text-base-content text-sm font-extrabold">{selectedClientName}</h3>
				<span class="text-base-content/40 text-xs">상세 분석</span>
				<button class="btn btn-ghost btn-xs ml-auto gap-1 text-xs" onclick={() => selectClient('')}>
					<Icon icon="heroicons:x-mark" class="h-3.5 w-3.5" />
					닫기
				</button>
			</div>

			<!-- 요약 카드 -->
			<div class="grid grid-cols-3 gap-2">
				{#each [{ label: '총 매출', value: fmtAmt(selectedStats.amount), sub: `${selectedStats.amount.toLocaleString()}원` }, { label: '출고량', value: fmtQty(selectedStats.qty), sub: '개' }, { label: '처리건수', value: String(selectedStats.count), sub: '건' }] as card (card.label)}
					<div class="bg-base-100 rounded-xl px-3 py-3 shadow-sm">
						<div class="text-base-content/50 mb-1 text-[10px] font-semibold">{card.label}</div>
						<div class="text-base-content text-base font-extrabold tabular-nums">{card.value}</div>
						<div class="text-base-content/40 text-[10px]">{card.sub}</div>
					</div>
				{/each}
			</div>

			<!-- 월별 추세 라인차트 -->
			{#if selectedClientMonthly && selectedClientMonthly.length > 0}
				<div class="bg-base-100 rounded-xl shadow-sm">
					<div class="border-base-200 border-b px-4 py-3">
						<span class="text-base-content/70 text-xs font-bold">월별 매출 추세 ({thisYear}년)</span
						>
					</div>
					<div class="h-44 px-4 py-3">
						<LineChart series={monthlyLineSeries} labels={monthlyLineLabels} showArea={true} />
					</div>
				</div>
			{/if}

			<!-- 카테고리 도넛차트 -->
			{#if donutSegments.length > 0}
				<div class="bg-base-100 rounded-xl shadow-sm">
					<div class="border-base-200 border-b px-4 py-3">
						<span class="text-base-content/70 text-xs font-bold">카테고리별 매출</span>
					</div>
					<div class="flex flex-wrap items-center gap-4 px-4 py-4">
						<DonutChart
							segments={donutSegments}
							size={140}
							centerLabel="매출"
							centerValue={fmtAmt(selectedStats.amount)}
						/>
						<!-- 범례 -->
						<div class="flex min-w-36 flex-1 flex-col gap-1.5">
							{#each donutSegments as seg (seg.label)}
								{@const total = donutSegments.reduce((s, d) => s + d.value, 0)}
								<div class="flex items-center gap-2">
									<div class="h-2.5 w-2.5 shrink-0 rounded-sm" style="background:{seg.color}"></div>
									<span class="text-base-content/70 flex-1 truncate text-xs">{seg.label}</span>
									<span class="text-base-content/60 text-xs tabular-nums"
										>{share(seg.value, total)}</span
									>
									<span class="text-base-content/50 text-xs tabular-nums">{fmtAmt(seg.value)}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- 품목별 순위 테이블 -->
			{#if selectedStats.byItem.length > 0}
				<div class="bg-base-100 overflow-hidden rounded-xl shadow-sm">
					<div class="border-base-200 border-b px-4 py-3">
						<span class="text-base-content/70 text-xs font-bold">품목별 출고량 순위</span>
					</div>
					<div class="overflow-x-auto">
						<table class="table-xs table w-full">
							<thead>
								<tr class="bg-base-200/50">
									<th class="w-6 text-center text-xs font-semibold">#</th>
									<th class="text-xs font-semibold">품목</th>
									<th class="text-xs font-semibold">카테고리</th>
									<th class="text-right text-xs font-semibold">출고량</th>
									<th class="text-right text-xs font-semibold">매출</th>
								</tr>
							</thead>
							<tbody>
								{#each selectedStats.byItem.slice(0, 15) as item, i (item.name)}
									<tr class="hover:bg-base-200/40">
										<td class="text-base-content/40 text-center text-xs">{i + 1}</td>
										<td class="text-xs font-medium">{item.name}</td>
										<td>
											<span
												class="badge badge-xs text-[10px]"
												style="background:{CATEGORY_COLORS[item.cat] ??
													'#9CA3AF'}22; color:{CATEGORY_COLORS[item.cat] ?? '#9CA3AF'}"
												>{item.cat}</span
											>
										</td>
										<td class="text-right text-xs tabular-nums">{fmtQty(item.qty)}</td>
										<td class="text-right text-xs tabular-nums">{fmtAmt(item.amount)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{:else if !cid}
		<!-- ④ 거래처 선택 안내 -->
		<div
			class="bg-base-100 flex flex-col items-center justify-center gap-3 rounded-xl py-12 shadow-sm"
		>
			<div class="bg-base-200 flex h-12 w-12 items-center justify-center rounded-full">
				<Icon icon="heroicons:building-storefront" class="text-base-content/30 h-6 w-6" />
			</div>
			<div class="text-center">
				<p class="text-base-content/60 text-sm font-semibold">
					거래처를 선택하면 상세 분석을 볼 수 있어요
				</p>
				<p class="text-base-content/40 mt-1 text-xs">위 순위 목록에서 거래처를 클릭해 주세요</p>
			</div>
		</div>
	{/if}
</div>
