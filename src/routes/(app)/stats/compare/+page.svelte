<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Icon from '@iconify/svelte';
	import { supabase } from '$lib/supabase/client';
	import LineChart from '../_components/LineChart.svelte';
	import { fmtAmt, fmtQty } from '../_lib/stats';

	import type { PageData } from './$types';

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let { data: _data }: { data: PageData } = $props();

	// ─── 타입 ─────────────────────────────────────────────────────────────────

	interface SummaryRow {
		period: string;
		qty: number;
		amount: number;
		count: number;
	}

	interface CompareRange {
		id: string;
		label: string;
		from: string;
		to: string;
		color: string;
		data: SummaryRow[];
		loading: boolean;
		// year 모드용
		year?: number;
		// month 모드용
		monthYear?: number;
		month?: number;
	}

	// ─── 상수 ────────────────────────────────────────────────────────────────

	const RANGE_COLORS = [
		'#3B82F6', // blue
		'#10B981', // emerald
		'#F59E0B', // amber
		'#EF4444', // red
		'#8B5CF6', // violet
		'#06B6D4' // cyan
	];

	const CURRENT_YEAR = new Date().getFullYear();
	const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i); // -2 ~ +2

	// ─── 상태 ────────────────────────────────────────────────────────────────

	let compareMode = $state<'year' | 'month' | 'custom'>('year');
	let metric = $state<'qty' | 'amount' | 'count'>('amount');
	let ranges = $state<CompareRange[]>([]);
	let filterClientId = $state(page.url.searchParams.get('clientId') ?? '');

	// clientId는 $derived로 URL에서 직접 읽기 — $effect 불필요
	const filterClientIdDerived = $derived(page.url.searchParams.get('clientId') ?? '');
	$effect(() => {
		filterClientId = filterClientIdDerived;
	});

	// ─── 초기화 헬퍼 ─────────────────────────────────────────────────────────

	function makeYearRange(year: number, colorIdx: number): Omit<CompareRange, 'data' | 'loading'> {
		return {
			id: crypto.randomUUID(),
			label: `${year}년`,
			from: `${year}-01-01`,
			to: `${year}-12-31`,
			color: RANGE_COLORS[colorIdx % RANGE_COLORS.length],
			year
		};
	}

	function makeMonthRange(
		year: number,
		month: number,
		colorIdx: number
	): Omit<CompareRange, 'data' | 'loading'> {
		const lastDay = new Date(year, month, 0).getDate();
		const mm = String(month).padStart(2, '0');
		return {
			id: crypto.randomUUID(),
			label: `${year}년 ${month}월`,
			from: `${year}-${mm}-01`,
			to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
			color: RANGE_COLORS[colorIdx % RANGE_COLORS.length],
			monthYear: year,
			month
		};
	}

	// ─── RPC 로드 ────────────────────────────────────────────────────────────

	async function fetchRange(id: string, from: string, to: string, skipLoadingSet = false) {
		const groupBy = compareMode === 'month' ? 'day' : 'month';
		const clientId = filterClientId || null;

		// $effect 초기화 시엔 이미 loading:true 이므로 skip
		if (!skipLoadingSet) {
			ranges = ranges.map((r) => (r.id === id ? { ...r, loading: true, data: [] } : r));
		}

		const { data: rpcData } = await (
			supabase.rpc as unknown as (
				fn: string,
				args: Record<string, unknown>
			) => Promise<{ data: unknown }>
		)('get_stats_summary', {
			p_from: from,
			p_to: to,
			p_group_by: groupBy,
			p_client_id: clientId
		});

		ranges = ranges.map((r) =>
			r.id === id
				? { ...r, loading: false, data: (rpcData as { rows?: SummaryRow[] })?.rows ?? [] }
				: r
		);
	}

	async function addRange(partial: Omit<CompareRange, 'data' | 'loading'>) {
		const newRange: CompareRange = { ...partial, data: [], loading: true };
		ranges = [...ranges, newRange];
		await fetchRange(newRange.id, newRange.from, newRange.to);
	}

	function removeRange(id: string) {
		ranges = ranges.filter((r) => r.id !== id);
	}

	// ─── 모드 초기화 effect ───────────────────────────────────────────────────
	// ⚠️ $effect 안에서 ranges를 직접 쓰면 무한 루프 발생.
	// 초기 ranges를 동기적으로만 세팅하고, fetch는 untrack 안에서 실행.

	$effect(() => {
		const mode = compareMode; // reactive dependency 고정

		let initial: CompareRange[] = [];
		if (mode === 'year') {
			initial = [
				{ ...makeYearRange(CURRENT_YEAR - 1, 0), data: [], loading: true },
				{ ...makeYearRange(CURRENT_YEAR, 1), data: [], loading: true }
			];
		} else if (mode === 'month') {
			const nowY = new Date().getFullYear();
			const nowM = new Date().getMonth() + 1;
			const prevM = nowM === 1 ? 12 : nowM - 1;
			const prevY = nowM === 1 ? nowY - 1 : nowY;
			initial = [
				{ ...makeMonthRange(prevY, prevM, 0), data: [], loading: true },
				{ ...makeMonthRange(nowY, nowM, 1), data: [], loading: true }
			];
		}
		// custom: 빈 상태로 시작
		ranges = initial;

		// fetch는 별도로 실행 — untrack으로 의존성 추적 차단
		untrack(() => {
			for (const r of initial) {
				fetchRange(r.id, r.from, r.to, true);
			}
		});
	});

	// ─── 구간 추가 핸들러 ─────────────────────────────────────────────────────

	function handleAddYear() {
		if (ranges.length >= 6) return;
		const usedYears = ranges.map((r) => r.year).filter(Boolean) as number[];
		const nextYear = YEAR_OPTIONS.find((y) => !usedYears.includes(y)) ?? CURRENT_YEAR;
		addRange(makeYearRange(nextYear, ranges.length));
	}

	function handleAddMonth() {
		if (ranges.length >= 6) return;
		const now = new Date();
		addRange(makeMonthRange(now.getFullYear(), now.getMonth() + 1, ranges.length));
	}

	// custom 구간 임시 입력 상태
	let customFrom = $state('');
	let customTo = $state('');
	let customLabel = $state('');

	function handleAddCustom() {
		if (!customFrom || !customTo || ranges.length >= 6) return;
		const label = customLabel.trim() || `${customFrom} ~ ${customTo}`;
		addRange({
			id: crypto.randomUUID(),
			label,
			from: customFrom,
			to: customTo,
			color: RANGE_COLORS[ranges.length % RANGE_COLORS.length]
		});
		customFrom = '';
		customTo = '';
		customLabel = '';
	}

	// ─── Year 모드: 연도 select 변경 ────────────────────────────────────────

	async function handleYearChange(id: string, year: number) {
		const newFrom = `${year}-01-01`;
		const newTo = `${year}-12-31`;
		ranges = ranges.map((r) =>
			r.id === id
				? { ...r, year, label: `${year}년`, from: newFrom, to: newTo, data: [], loading: true }
				: r
		);
		await fetchRange(id, newFrom, newTo);
	}

	// ─── Month 모드: 연도/월 select 변경 ────────────────────────────────────

	async function handleMonthRangeChange(id: string, year: number, month: number) {
		const lastDay = new Date(year, month, 0).getDate();
		const mm = String(month).padStart(2, '0');
		const newFrom = `${year}-${mm}-01`;
		const newTo = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
		ranges = ranges.map((r) =>
			r.id === id
				? {
						...r,
						monthYear: year,
						month,
						label: `${year}년 ${month}월`,
						from: newFrom,
						to: newTo,
						data: [],
						loading: true
					}
				: r
		);
		await fetchRange(id, newFrom, newTo);
	}

	// ─── 차트 데이터 ─────────────────────────────────────────────────────────

	const chartLabels = $derived(
		compareMode === 'year'
			? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
			: compareMode === 'month'
				? Array.from({ length: 31 }, (_, i) => (i % 4 === 0 ? `${i + 1}일` : ''))
				: ranges.length > 0
					? ranges[0].data.map((d) => d.period.slice(0, 7))
					: []
	);

	const chartSeries = $derived(
		ranges.map((r) => ({
			label: r.label,
			color: r.color,
			dash: false,
			data:
				compareMode === 'year'
					? Array.from({ length: 12 }, (_, i) => {
							const mm = String(i + 1).padStart(2, '0');
							const found = r.data.find((d) => d.period.slice(5, 7) === mm);
							return found ? found[metric] : 0;
						})
					: compareMode === 'month'
						? Array.from({ length: 31 }, (_, i) => {
								const dd = String(i + 1).padStart(2, '0');
								const found = r.data.find((d) => d.period.slice(-2) === dd);
								return found ? found[metric] : 0;
							})
						: r.data.map((d) => d[metric])
		}))
	);

	// ─── 수치 비교 테이블 집계 ────────────────────────────────────────────────

	interface RangeSummary {
		id: string;
		label: string;
		color: string;
		totalQty: number;
		totalAmount: number;
		totalCount: number;
		maxVal: number;
		loading: boolean;
	}

	const rangeSummaries = $derived<RangeSummary[]>(
		ranges.map((r) => {
			const totalQty = r.data.reduce((s, d) => s + d.qty, 0);
			const totalAmount = r.data.reduce((s, d) => s + d.amount, 0);
			const totalCount = r.data.reduce((s, d) => s + d.count, 0);
			const maxVal = Math.max(...r.data.map((d) => d[metric]), 0);
			return {
				id: r.id,
				label: r.label,
				color: r.color,
				totalQty,
				totalAmount,
				totalCount,
				maxVal,
				loading: r.loading
			};
		})
	);

	function calcGrowth(base: number, curr: number): string {
		if (base === 0) return curr === 0 ? '0.0%' : '+100.0%';
		const rate = ((curr - base) / base) * 100;
		return rate >= 0 ? `+${rate.toFixed(1)}%` : `${rate.toFixed(1)}%`;
	}

	function growthCls(base: number, curr: number): string {
		if (base === curr) return 'text-base-content/50';
		return curr > base ? 'text-success font-bold' : 'text-error font-bold';
	}

	const anyLoading = $derived(ranges.some((r) => r.loading));

	// 메트릭 레이블
	const metricLabel = $derived(
		metric === 'amount' ? '매출액' : metric === 'qty' ? '출고량' : '처리건수'
	);
</script>

<div class="bg-base-200 flex flex-col gap-4 px-5 py-4">
	<!-- ① 비교 모드 선택 -->
	<div class="flex items-center gap-2">
		<span class="text-base-content/60 text-xs font-semibold">비교 단위</span>
		<div class="join">
			{#each [['year', '연도별'], ['month', '월별'], ['custom', '자유구간']] as [val, lbl] (val)}
				<button
					class="join-item btn btn-sm text-xs {compareMode === val
						? 'btn-primary'
						: 'btn-ghost bg-base-100'}"
					onclick={() => (compareMode = val as 'year' | 'month' | 'custom')}
				>
					{lbl}
				</button>
			{/each}
		</div>
	</div>

	<!-- ② 구간 설정 패널 -->
	<div class="bg-base-100 rounded-xl p-4 shadow-sm">
		<div class="mb-3 flex items-center justify-between">
			<span class="text-base-content/70 text-xs font-bold">구간 설정</span>
			<span class="text-base-content/40 text-xs">{ranges.length}/6</span>
		</div>

		<div class="flex flex-col gap-2">
			{#each ranges as r (r.id)}
				<div class="flex items-center gap-2">
					<!-- 색상 점 -->
					<div class="h-3 w-3 shrink-0 rounded-full" style="background:{r.color}"></div>

					{#if compareMode === 'year'}
						<select
							class="select select-bordered select-sm h-8 min-h-0 flex-1 text-xs"
							value={r.year ?? CURRENT_YEAR}
							onchange={(e) =>
								handleYearChange(r.id, Number((e.currentTarget as HTMLSelectElement).value))}
						>
							{#each YEAR_OPTIONS as y (y)}
								<option value={y}>{y}년</option>
							{/each}
						</select>
					{:else if compareMode === 'month'}
						<select
							class="select select-bordered select-sm h-8 min-h-0 w-24 text-xs"
							value={r.monthYear ?? CURRENT_YEAR}
							onchange={(e) =>
								handleMonthRangeChange(
									r.id,
									Number((e.currentTarget as HTMLSelectElement).value),
									r.month ?? 1
								)}
						>
							{#each YEAR_OPTIONS as y (y)}
								<option value={y}>{y}년</option>
							{/each}
						</select>
						<select
							class="select select-bordered select-sm h-8 min-h-0 w-20 text-xs"
							value={r.month ?? 1}
							onchange={(e) =>
								handleMonthRangeChange(
									r.id,
									r.monthYear ?? CURRENT_YEAR,
									Number((e.currentTarget as HTMLSelectElement).value)
								)}
						>
							{#each Array.from({ length: 12 }, (_, i) => i + 1) as m (m)}
								<option value={m}>{m}월</option>
							{/each}
						</select>
					{:else}
						<!-- custom: 라벨 표시만 (편집은 아래 추가 폼에서) -->
						<span class="text-base-content/70 flex-1 truncate text-xs font-medium">{r.label}</span>
					{/if}

					{#if r.loading}
						<span class="loading loading-spinner loading-xs text-primary"></span>
					{/if}

					<button
						class="btn btn-ghost btn-xs text-error px-1"
						onclick={() => removeRange(r.id)}
						title="구간 제거"
					>
						<Icon icon="heroicons:x-mark" class="h-3.5 w-3.5" />
					</button>
				</div>
			{/each}
		</div>

		<!-- 구간 추가 -->
		{#if ranges.length < 6}
			{#if compareMode === 'year'}
				<button class="btn btn-ghost btn-sm mt-3 gap-1 text-xs" onclick={handleAddYear}>
					<Icon icon="heroicons:plus" class="h-3.5 w-3.5" />
					연도 추가
				</button>
			{:else if compareMode === 'month'}
				<button class="btn btn-ghost btn-sm mt-3 gap-1 text-xs" onclick={handleAddMonth}>
					<Icon icon="heroicons:plus" class="h-3.5 w-3.5" />
					월 추가
				</button>
			{:else}
				<!-- custom 추가 폼 -->
				<div class="mt-3 flex flex-col gap-2">
					<div class="flex flex-wrap items-center gap-2">
						<input
							type="date"
							class="input input-bordered input-sm h-8 w-36 text-xs"
							bind:value={customFrom}
						/>
						<span class="text-base-content/50 text-xs">~</span>
						<input
							type="date"
							class="input input-bordered input-sm h-8 w-36 text-xs"
							bind:value={customTo}
						/>
						<input
							type="text"
							class="input input-bordered input-sm h-8 min-w-24 flex-1 text-xs"
							placeholder="라벨 (선택)"
							bind:value={customLabel}
						/>
						<button
							class="btn btn-primary btn-sm h-8 min-h-0 gap-1 text-xs"
							onclick={handleAddCustom}
							disabled={!customFrom || !customTo}
						>
							<Icon icon="heroicons:plus" class="h-3.5 w-3.5" />
							추가
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- ③ 지표 선택 -->
	<div class="flex items-center gap-2">
		<span class="text-base-content/60 text-xs font-semibold">지표</span>
		<div class="join">
			{#each [['amount', '매출액'], ['qty', '출고량'], ['count', '처리건수']] as [val, lbl] (val)}
				<button
					class="join-item btn btn-sm text-xs {metric === val
						? 'btn-primary'
						: 'btn-ghost bg-base-100'}"
					onclick={() => (metric = val as 'qty' | 'amount' | 'count')}
				>
					{lbl}
				</button>
			{/each}
		</div>
	</div>

	<!-- ④ 비교 라인차트 -->
	<div class="bg-base-100 rounded-xl shadow-sm">
		<div class="border-base-200 flex items-center justify-between border-b px-4 py-3">
			<span class="text-base-content/70 text-xs font-bold">{metricLabel} 비교</span>
			{#if anyLoading}
				<span class="loading loading-spinner loading-xs text-primary"></span>
			{/if}
		</div>

		<!-- 범례 -->
		{#if ranges.length > 0}
			<div class="flex flex-wrap gap-3 px-4 pt-3">
				{#each ranges as r (r.id)}
					<div class="flex items-center gap-1.5">
						<div class="h-2.5 w-2.5 rounded-full" style="background:{r.color}"></div>
						<span class="text-base-content/60 text-xs font-medium">{r.label}</span>
					</div>
				{/each}
			</div>
		{/if}

		<div class="h-52 px-4 py-3">
			{#if ranges.length === 0}
				<div class="flex h-full items-center justify-center">
					<span class="text-base-content/30 text-xs">구간을 추가해 주세요</span>
				</div>
			{:else}
				<LineChart series={chartSeries} labels={chartLabels} />
			{/if}
		</div>
	</div>

	<!-- ⑤ 수치 비교 테이블 -->
	{#if ranges.length > 0}
		<div class="bg-base-100 overflow-hidden rounded-xl shadow-sm">
			<div class="border-base-200 border-b px-4 py-3">
				<span class="text-base-content/70 text-xs font-bold">수치 비교</span>
			</div>
			<div class="overflow-x-auto">
				<table class="table-xs table w-full">
					<thead>
						<tr class="bg-base-200/50">
							<th class="text-xs font-semibold">구간</th>
							<th class="text-right text-xs font-semibold">총 매출</th>
							<th class="text-right text-xs font-semibold">출고량</th>
							<th class="text-right text-xs font-semibold">건수</th>
							<th class="text-right text-xs font-semibold">vs 기준</th>
						</tr>
					</thead>
					<tbody>
						{#each rangeSummaries as s, i (s.id)}
							{@const base = rangeSummaries[0]}
							{@const baseVal =
								metric === 'amount'
									? base.totalAmount
									: metric === 'qty'
										? base.totalQty
										: base.totalCount}
							{@const currVal =
								metric === 'amount' ? s.totalAmount : metric === 'qty' ? s.totalQty : s.totalCount}
							<tr class="hover:bg-base-200/40">
								<td>
									<div class="flex items-center gap-2">
										<div
											class="h-2.5 w-2.5 shrink-0 rounded-full"
											style="background:{s.color}"
										></div>
										<span class="text-xs font-medium">{s.label}</span>
										{#if s.loading}
											<span class="loading loading-spinner loading-xs text-primary"></span>
										{/if}
									</div>
								</td>
								<td class="text-right text-xs tabular-nums">{fmtAmt(s.totalAmount)}</td>
								<td class="text-right text-xs tabular-nums">{fmtQty(s.totalQty)}</td>
								<td class="text-right text-xs tabular-nums">{s.totalCount.toLocaleString()}</td>
								<td class="text-right text-xs">
									{#if i === 0}
										<span class="text-base-content/30">기준</span>
									{:else}
										<span class={growthCls(baseVal, currVal)}>{calcGrowth(baseVal, currVal)}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
