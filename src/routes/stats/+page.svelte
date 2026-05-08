<script lang="ts">
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import Icon from '@iconify/svelte';
	import { SvelteMap } from 'svelte/reactivity';

	type LaundryCategory = 'towel' | 'sheet' | 'uniform' | 'all';
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _LaundryCategory = null as unknown as LaundryCategory;


	const CATEGORY_LABELS: Record<string, string> = { towel: '타월', sheet: '시트', uniform: '유니폼', all: '전체' };

	const clients = [
		{ id: 'client-001', name: '그랜드호텔' },
		{ id: 'client-002', name: '오션뷰펜션' },
		{ id: 'client-003', name: '제주리조트' },
		{ id: 'client-004', name: '힐사이드호텔' },
		{ id: 'client-005', name: '선셋펜션' },
		{ id: 'client-006', name: '블루라군리조트' },
	];

	const shipments = [
		{ id: 'ship-001', clientId: 'client-001', items: [{ itemName: '대형타올', category: 'towel', quantity: 50 }, { itemName: '싱글시트', category: 'sheet', quantity: 20 }], shippedAt: '2025-01-10T10:00:00' },
		{ id: 'ship-002', clientId: 'client-002', items: [{ itemName: '소형타올', category: 'towel', quantity: 30 }], shippedAt: '2025-01-12T14:00:00' },
		{ id: 'ship-003', clientId: 'client-001', items: [{ itemName: '대형타올', category: 'towel', quantity: 40 }, { itemName: '직원유니폼', category: 'uniform', quantity: 10 }], shippedAt: '2025-01-15T09:00:00' },
		{ id: 'ship-004', clientId: 'client-003', items: [{ itemName: '바스타올', category: 'towel', quantity: 80 }], shippedAt: '2025-01-16T11:00:00' },
		{ id: 'ship-005', clientId: 'client-001', items: [{ itemName: '대형타올', category: 'towel', quantity: 60 }], shippedAt: '2024-12-05T10:00:00' },
		{ id: 'ship-006', clientId: 'client-002', items: [{ itemName: '더블시트', category: 'sheet', quantity: 25 }], shippedAt: '2024-12-10T14:00:00' },
		{ id: 'ship-007', clientId: 'client-003', items: [{ itemName: '바스타올', category: 'towel', quantity: 90 }], shippedAt: '2024-11-20T09:00:00' },
		{ id: 'ship-008', clientId: 'client-001', items: [{ itemName: '싱글시트', category: 'sheet', quantity: 35 }], shippedAt: '2024-11-25T11:00:00' },
	];

	const clientItemPrices: Array<{ clientId: string; category: string; itemName: string; unitPrice: number; priceEffectiveDate?: string }> = [];

	function getUnitPrice(clientId: string, category: string, itemName: string): number {
		const p = clientItemPrices.find(pr => pr.clientId === clientId && pr.category === category && pr.itemName === itemName);
		return p?.unitPrice ?? 0;
	}

	function buildInvoiceLines(clientId: string, from: string, to: string) {
		const fromTs = new Date(from + 'T00:00:00').getTime();
		const toTs = new Date(to + 'T23:59:59').getTime();
		const inRange = shipments.filter(s => {
			if (s.clientId !== clientId) return false;
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs;
		});
		const map: Record<string, { category: string; itemName: string; quantity: number; unitPrice: number; amount: number }> = {};
		for (const s of inRange) {
			for (const item of s.items) {
				const key = item.category + '__' + item.itemName;
				if (!map[key]) map[key] = { category: item.category, itemName: item.itemName, quantity: 0, unitPrice: getUnitPrice(clientId, item.category, item.itemName), amount: 0 };
				map[key].quantity += item.quantity;
				map[key].amount += item.quantity * map[key].unitPrice;
			}
		}
		return Object.values(map);
	}

	function getStatsByDateRange(from: string, to: string) {
		const fromTs = new Date(from + 'T00:00:00').getTime();
		const toTs = new Date(to + 'T23:59:59').getTime();
		const inRange = shipments.filter(s => {
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs;
		});
		let totalQuantity = 0;
		const clientMap = new SvelteMap<string, { clientId: string; clientName: string; shipmentCount: number; totalQuantity: number }>();
		const categoryMap = new SvelteMap<string, number>();
		const itemMap = new SvelteMap<string, { itemName: string; category: string; totalQuantity: number }>();
		for (const s of inRange) {
			const clientName = clients.find(c => c.id === s.clientId)?.name ?? s.clientId;
			if (!clientMap.has(s.clientId)) clientMap.set(s.clientId, { clientId: s.clientId, clientName, shipmentCount: 0, totalQuantity: 0 });
			const cs = clientMap.get(s.clientId)!;
			cs.shipmentCount++;
			for (const item of s.items) {
				totalQuantity += item.quantity;
				cs.totalQuantity += item.quantity;
				categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + item.quantity);
				const key = item.category + '::' + item.itemName;
				if (!itemMap.has(key)) itemMap.set(key, { itemName: item.itemName, category: item.category, totalQuantity: 0 });
				itemMap.get(key)!.totalQuantity += item.quantity;
			}
		}
		return {
			shipmentCount: inRange.length,
			totalQuantity,
			byClient: [...clientMap.values()].sort((a, b) => b.totalQuantity - a.totalQuantity),
			byCategory: [...categoryMap.entries()].map(([category, totalQuantity]) => ({ category, totalQuantity })),
			byItem: [...itemMap.values()].sort((a, b) => b.totalQuantity - a.totalQuantity),
		};
	}

	// ?�?� 기간 선택 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
	type PeriodMode = 'daily' | 'monthly' | 'yearly';
	let periodMode = $state<PeriodMode>('yearly');

	function todayStr(): string {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}
	function firstDayOfMonth(): string {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
	}

	let dailyFrom = $state(firstDayOfMonth());
	let dailyTo   = $state(todayStr());

	let monthlyValue = $state((() => {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
	})());

	let yearlyValue = $state(new Date().getFullYear());

	let queriedFrom = $state(`${new Date().getFullYear()}-01-01`);
	let queriedTo   = $state(`${new Date().getFullYear()}-12-31`);
	let queriedMode = $state<PeriodMode>('yearly');

	function doQuery() {
		if (periodMode === 'daily') {
			queriedFrom = dailyFrom;
			queriedTo   = dailyTo;
		} else if (periodMode === 'monthly') {
			const [y, m] = monthlyValue.split('-').map(Number);
			const lastDay = new Date(y, m, 0).getDate();
			const pad = (n: number) => String(n).padStart(2, '0');
			queriedFrom = `${y}-${pad(m)}-01`;
			queriedTo   = `${y}-${pad(m)}-${pad(lastDay)}`;
		} else {
			queriedFrom = `${yearlyValue}-01-01`;
			queriedTo   = `${yearlyValue}-12-31`;
		}
		queriedMode = periodMode;
	}
	doQuery();

	const periodLabel = $derived(
		queriedMode === 'daily'   ? `${queriedFrom} ~ ${queriedTo}` :
		queriedMode === 'monthly' ? queriedFrom.slice(0, 7) :
		                            queriedFrom.slice(0, 4) + '년'
	);

	// ?�?� 거래처?�터 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
	let filterClientId = $state<string | null>(null);
	const filterClient = $derived(
		filterClientId ? (clients.find((c) => c.id === filterClientId) ?? null) : null
	);

	// ?�?� ???�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
	type StatsTab = 'overview' | 'shipout' | 'trend';
	let activeTab = $state<StatsTab>('overview');

	// ── 요약 탭 차트 지표 ─────────────────────────────────────────────
	let overviewMetric = $state<'qty' | 'amount'>('qty');

	// ── 트렌드 차트 설정 ──────────────────────────────────────────────
	const currentYear = new Date().getFullYear();
	let selectedYears  = $state<number[]>([currentYear]);
	let trendMetric    = $state<'qty' | 'amount'>('qty');
	let yearInput      = $state<number | ''>('');  // 연도 직접 입력 필드
	let showTrendLabels = $state(false);      // 점 위 수치 표시 토글

	const YEAR_PALETTE: Record<number, { stroke: string; bg: string }> = {
		2019: { stroke: '#0891b2', bg: '#cffafe' },
		2020: { stroke: '#7c3aed', bg: '#ede9fe' },
		2021: { stroke: '#d97706', bg: '#fef3c7' },
		2022: { stroke: '#a855f7', bg: '#f3e8ff' },
		2023: { stroke: '#f59e0b', bg: '#fef9c3' },
		2024: { stroke: '#6366f1', bg: '#e0e7ff' },
		2025: { stroke: '#10b981', bg: '#d1fae5' },
		2026: { stroke: '#f43f5e', bg: '#ffe4e6' },
		2027: { stroke: '#8b5cf6', bg: '#ede9fe' },
	};
	// 팔레트에 없는 연도는 색상 순환으로 할당
	const EXTRA_COLORS: { stroke: string; bg: string }[] = [
		{ stroke: '#0ea5e9', bg: '#e0f2fe' },
		{ stroke: '#ec4899', bg: '#fce7f3' },
		{ stroke: '#84cc16', bg: '#f7fee7' },
		{ stroke: '#f97316', bg: '#fff7ed' },
		{ stroke: '#14b8a6', bg: '#ccfbf1' },
		{ stroke: '#64748b', bg: '#f1f5f9' },
	];
	function getYearColor(year: number) {
		return YEAR_PALETTE[year] ?? EXTRA_COLORS[((year - 2028) % EXTRA_COLORS.length + EXTRA_COLORS.length) % EXTRA_COLORS.length];
	}

	// 선택된 연도에 없는 연도를 추가하거나 1개 초과일 때 제거
	function addTrendYear(val: number | string) {
		const yr = typeof val === 'number' ? Math.round(val) : parseInt(String(val).trim(), 10);
		if (!yr || yr < 1900 || yr > 2100) return;
		if (!selectedYears.includes(yr)) selectedYears = [...selectedYears, yr].sort((a, b) => a - b);
		yearInput = '';
	}


	function removeTrendYear(yr: number) {
		if (selectedYears.length <= 1) return;
		selectedYears = selectedYears.filter((y) => y !== yr);
	}

	// 연도별 월별 출고 수량 (12개 고정)
	function calcMonthlyQty(year: number, clientId: string | null): number[] {
		const result = Array(12).fill(0) as number[];
		for (const s of shipments) {
			const d = new Date(s.shippedAt);
			if (d.getFullYear() !== year) continue;
			if (clientId && s.clientId !== clientId) continue;
			result[d.getMonth()] += s.items.reduce((sum, i) => sum + i.quantity, 0);
		}
		return result;
	}

	// 연도별 월별 청구 금액 (출고 × 단가로 계산)
	function calcMonthlyAmount(year: number, clientId: string | null): number[] {
		const pad = (n: number) => String(n).padStart(2, '0');
		const _clients = clientId
			? clients.filter((c) => c.id === clientId)
			: clients;
		return Array.from({ length: 12 }, (_, m) => {
			const lastDay = new Date(year, m + 1, 0).getDate();
			const from = `${year}-${pad(m + 1)}-01`;
			const to   = `${year}-${pad(m + 1)}-${pad(lastDay)}`;
			let total = 0;
			for (const client of _clients) {
				const lines = buildInvoiceLines(client.id, from, to);
				total += lines.reduce((s, l) => s + l.amount, 0);
			}
			return total;
		});
	}

	const TREND_W = 860; const TREND_H = 340;
	const TP = { l: 76, r: 24, t: 52, b: 48 };

	const trendSeriesData = $derived(
		selectedYears.map((year) => ({
			year,
			data: trendMetric === 'qty'
				? calcMonthlyQty(year, filterClientId)
				: calcMonthlyAmount(year, filterClientId),
		}))
	);

	const trendCalc = $derived.by(() => {
		const allVals = trendSeriesData.flatMap((s) => s.data);
		const maxVal  = Math.max(...allVals, 1);
		const xStep   = (TREND_W - TP.l - TP.r) / 11;
		const series  = trendSeriesData.map(({ year, data }) => {
			const color  = getYearColor(year);
			const points = data.map((val, i) => ({
				x: TP.l + i * xStep,
				y: TP.t + (1 - val / maxVal) * (TREND_H - TP.t - TP.b),
				val, month: i + 1,
			}));
			const path     = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
			const areaPath = `${path} L${points[11].x.toFixed(1)},${TREND_H - TP.b} L${points[0].x.toFixed(1)},${TREND_H - TP.b}Z`;
			return { year, color, points, path, areaPath };
		});
		const step   = Math.ceil(maxVal / 4) || 1;
		const yTicks = [0, step, step*2, step*3, step*4].filter((v) => v <= maxVal + step);
		return { series, maxVal, yTicks };
	});

	// 공통 숫자 포매터 (qty=수량, amount=금액 축약)
	function fmtVal(val: number, metric: 'qty' | 'amount'): string {
		if (metric === 'qty') return val.toLocaleString();
		if (val >= 100_000_000) return `${(val / 100_000_000).toFixed(1)}억`;
		if (val >= 10_000)      return `${Math.round(val / 10_000)}만`;
		return val.toLocaleString();
	}
	function fmtTrendVal(val: number): string { return fmtVal(val, trendMetric); }
	function fmtOvVal(val: number):    string { return fmtVal(val, overviewMetric); }

	// ?�?� ?�상/뱃�? ?�수 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const categoryColors: Record<string, string> = {
		towel:   'bg-info',
		sheet:   'bg-secondary',
		uniform: 'bg-warning',
	};
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const categoryBadge: Record<string, string> = {
		towel:   'badge-info',
		sheet:   'badge-secondary',
		uniform: 'badge-warning',
	};

	// ?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═
	// 출고 통계 derived
	// ?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═?�═
	const allStats = $derived(getStatsByDateRange(queriedFrom, queriedTo));

	const stats = $derived.by(() => {
		if (!filterClientId) return allStats;

		const fromTs = new Date(queriedFrom + 'T00:00:00.000Z').getTime();
		const toTs   = new Date(queriedTo   + 'T23:59:59.999Z').getTime();
		const inRange = shipments.filter((s) => {
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs && s.clientId === filterClientId;
		});

		const catMap  = new SvelteMap<string, { shipmentCount: number; totalQuantity: number }>();
		const itemMap = new SvelteMap<string, { itemName: string; category: string; totalQuantity: number }>();
		let totalQty  = 0;

		for (const ship of inRange) {
			for (const item of ship.items) {
				totalQty += item.quantity;
				const cat = item.category;
				if (!catMap.has(cat)) catMap.set(cat, { shipmentCount: 0, totalQuantity: 0 });
				const cs = catMap.get(cat)!;
				cs.shipmentCount++;
				cs.totalQuantity += item.quantity;

				const key = `${cat}__${item.itemName}`;
				if (!itemMap.has(key)) itemMap.set(key, { itemName: item.itemName, category: cat, totalQuantity: 0 });
				itemMap.get(key)!.totalQuantity += item.quantity;
			}
		}

		const clientRow = allStats.byClient.find((c) => c.clientId === filterClientId);
		return {
			shipmentCount: inRange.length,
			totalQuantity: totalQty,
			byClient:   clientRow ? [clientRow] : [],
			byCategory: [...catMap.entries()].map(([category, s]) => ({ category, ...s })),
			byItem:     [...itemMap.values()],
		};
	});

	const kpiCount   = $derived(stats.shipmentCount);
	const kpiQty     = $derived(stats.totalQuantity);
	const kpiClients = $derived(filterClientId ? 1 : allStats.byClient.length);

	const clientMaxQty = $derived.by(() => {
		const vals = stats.byClient.map((c) => c.totalQuantity);
		return vals.length > 0 ? Math.max(...vals, 1) : 1;
	});
	const categoryTotal = $derived(stats.byCategory.reduce((s, c) => s + c.totalQuantity, 0));
	const topItems = $derived([...stats.byItem].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10));

	// ?�?� 월별/일별 출고 추이 차트 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
	// 항상 차트 표시 (데이터가 0이면 빈 상태 UI 표시)
	const showMonthlyChart = $derived(true);

	// 차트 집계 단위: daily(일별) vs monthly(월별)
	// - 연별 조회 → 항상 월별
	// - 월별 조회 → 해당 월의 일별 (31일 이내)
	// - 일별 조회 → 60일 이내면 일별, 초과하면 월별로 자동 전환
	// - 금액 지표는 계산 비용 문제로 항상 월별
	const chartGranularity = $derived.by((): 'daily' | 'monthly' => {
		if (queriedMode === 'yearly') return 'monthly';
		if (queriedMode === 'monthly') return 'daily';
		const diffDays = Math.round(
			(new Date(queriedTo + 'T00:00:00').getTime() - new Date(queriedFrom + 'T00:00:00').getTime()) / 86400000
		);
		return diffDays <= 60 ? 'daily' : 'monthly';
	});

	const monthlyChartData = $derived.by(() => {
		const map    = new SvelteMap<string, number>();
		const fromTs = new Date(queriedFrom + 'T00:00:00').getTime();
		const toTs   = new Date(queriedTo   + 'T23:59:59').getTime();
		for (const ship of shipments) {
			if (filterClientId && ship.clientId !== filterClientId) continue;
			const d  = new Date(ship.shippedAt);
			const ts = d.getTime();
			if (ts < fromTs || ts > toTs) continue;
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			const qty = ship.items.reduce((s, i) => s + i.quantity, 0);
			map.set(key, (map.get(key) ?? 0) + qty);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	// 일별 집계 (수량 전용)
	const dailyChartData = $derived.by(() => {
		const map    = new SvelteMap<string, number>();
		const fromTs = new Date(queriedFrom + 'T00:00:00').getTime();
		const toTs   = new Date(queriedTo   + 'T23:59:59').getTime();
		for (const ship of shipments) {
			if (filterClientId && ship.clientId !== filterClientId) continue;
			const d  = new Date(ship.shippedAt);
			const ts = d.getTime();
			if (ts < fromTs || ts > toTs) continue;
			const pad = (n: number) => String(n).padStart(2, '0');
			const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
			const qty = ship.items.reduce((s, i) => s + i.quantity, 0);
			map.set(key, (map.get(key) ?? 0) + qty);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	// 일별 집계 (금액 전용) — plain object로 Svelte5 경고 방지
	const dailyChartDataAmount = $derived.by(() => {
		const result: Record<string, number> = {};
		const pad    = (n: number) => String(n).padStart(2, '0');
		const fromTs = new Date(queriedFrom + 'T00:00:00').getTime();
		const toTs   = new Date(queriedTo   + 'T23:59:59').getTime();
		for (const ship of shipments) {
			if (filterClientId && ship.clientId !== filterClientId) continue;
			const d  = new Date(ship.shippedAt);
			const ts = d.getTime();
			if (ts < fromTs || ts > toTs) continue;
			const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
			for (const item of ship.items) {
				const unitPrice = getUnitPrice(ship.clientId, item.category, item.itemName);
				result[key] = (result[key] ?? 0) + item.quantity * unitPrice;
			}
		}
		return Object.entries(result).sort((a, b) => a[0].localeCompare(b[0]));
	});

	// 요약 탭 금액 기반 월별 데이터 (buildInvoiceLines 사용)
	const monthlyChartDataAmount = $derived.by(() => {
		const pad = (n: number) => String(n).padStart(2, '0');
		const fromStr = queriedFrom; // 'YYYY-MM-DD'
		const toStr   = queriedTo;
		const entries: [string, number][] = [];
		let y = parseInt(fromStr.slice(0, 4), 10);
		let m = parseInt(fromStr.slice(5, 7), 10) - 1; // 0-based
		const endY = parseInt(toStr.slice(0, 4), 10);
		const endM = parseInt(toStr.slice(5, 7), 10) - 1;
		while (y < endY || (y === endY && m <= endM)) {
			const key     = `${y}-${pad(m + 1)}`;
			const lastDay = new Date(y, m + 1, 0).getDate();
			const mFrom   = `${y}-${pad(m + 1)}-01`;
			const mTo     = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
			const _clients = filterClientId
				? clients.filter((c) => c.id === filterClientId)
				: clients;
			let total = 0;
			for (const client of _clients) {
				const lines = buildInvoiceLines(client.id, mFrom, mTo);
				total += lines.reduce((s, l) => s + l.amount, 0);
			}
			entries.push([key, total]);
			m++;
			if (m > 11) { m = 0; y++; }
		}
		return entries;
	});

	const SVG_W = 620; const SVG_H = 220;
	const PAD_LEFT = 54; const PAD_RIGHT = 20; const PAD_TOP = 22; const PAD_BOTTOM = 54;

	// ── 차트 공용 헬퍼 ──────────────────────────────────────────────
	type ChartPt = { x: number; y: number; val: number; label: string; dispLabel: string; isRotated: boolean };
	function buildChartPoints(rawData: [string, number][], gran: 'daily' | 'monthly') {
		if (rawData.length === 0) return { points: [] as ChartPt[], path: '', areaPath: '', maxVal: 0, gran };
		const fmtLabel = (key: string): string => {
			if (gran === 'daily') {
				const m = parseInt(key.slice(5, 7), 10);
				const d = parseInt(key.slice(8, 10), 10);
				return queriedMode === 'monthly' ? `${d}일` : `${m}/${d}`;
			}
			return `${parseInt(key.slice(5, 7), 10)}월`;
		};
		const labelStep = gran === 'daily' ? Math.max(1, Math.ceil(rawData.length / 20)) : 1;
		const isRotated = gran === 'daily';
		const maxVal = Math.max(...rawData.map(([, v]) => v), 1);
		const n      = rawData.length;
		const xStep  = n > 1 ? (SVG_W - PAD_LEFT - PAD_RIGHT) / (n - 1) : (SVG_W - PAD_LEFT - PAD_RIGHT) / 2;
		const points: ChartPt[] = rawData.map(([label, val], i) => ({
			x: PAD_LEFT + (n > 1 ? i * xStep : xStep),
			y: PAD_TOP + (1 - val / maxVal) * (SVG_H - PAD_TOP - PAD_BOTTOM),
			val, label,
			dispLabel: (i % labelStep === 0) ? fmtLabel(label) : '',
			isRotated,
		}));
		const path     = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
		const areaPath = `${path} L ${points[points.length-1].x.toFixed(1)} ${SVG_H-PAD_BOTTOM} L ${points[0].x.toFixed(1)} ${SVG_H-PAD_BOTTOM} Z`;
		return { points, path, areaPath, maxVal, gran };
	}
	function buildYTicks(maxVal: number): number[] {
		if (maxVal === 0) return [];
		const step = Math.ceil(maxVal / 4);
		return [0, step, step * 2, step * 3, step * 4].filter((v) => v <= maxVal + step);
	}

	// 요약 탭 차트 (overviewMetric 기반 수량/금액 토글)
	const chartPoints = $derived.by(() => {
		const gran = chartGranularity;
		const rawData = overviewMetric === 'qty'
			? (gran === 'daily' ? dailyChartData : monthlyChartData)
			: (gran === 'daily' ? dailyChartDataAmount : monthlyChartDataAmount);
		return buildChartPoints(rawData, gran);
	});
	const yTicks = $derived(buildYTicks(chartPoints.maxVal));

	// 출고 상세 탭 전용 차트 (수량 / 금액 각각)
	const shipoutQtyPoints = $derived.by(() =>
		buildChartPoints(
			chartGranularity === 'daily' ? dailyChartData : monthlyChartData,
			chartGranularity
		)
	);
	const shipoutAmtPoints = $derived.by(() =>
		buildChartPoints(
			chartGranularity === 'daily' ? dailyChartDataAmount : monthlyChartDataAmount,
			chartGranularity
		)
	);
	const shipoutYTicksQty = $derived(buildYTicks(shipoutQtyPoints.maxVal));
	const shipoutYTicksAmt = $derived(buildYTicks(shipoutAmtPoints.maxVal));

	// 일별 그래프일 때 집계 전환 안내 메시지
	const chartGranularityNote = $derived.by(() => {
		if (queriedMode !== 'daily') return '';
		const diffDays = Math.round(
			(new Date(queriedTo + 'T00:00:00').getTime() - new Date(queriedFrom + 'T00:00:00').getTime()) / 86400000
		);

		if (diffDays > 60) return `${diffDays}일 범위 — 가독성을 위해 월별로 집계합니다.`;
		return `${diffDays + 1}일 범위 — 일별로 집계합니다.`;
	});



</script>

<svelte:head>
	<title>입출고 · 통계 🧺 세탁 관리자</title>
</svelte:head>

<div class="bg-base-200 min-h-screen space-y-5 px-8 py-6">

	<!-- 헤더 + 탭 -->
	<div class="flex items-center justify-between gap-4 flex-wrap">
		<div>
			<h2 class="text-2xl font-bold text-base-content">입출고 · 통계</h2>
			<p class="mt-0.5 text-sm text-base-content/50">
				{#if filterClient}
					<span class="font-semibold text-secondary">{filterClient.name}</span> 거래처통계
				{:else}
					전체 거래처통계
				{/if}
			</p>
		</div>
		<!-- 탭 -->
		<div class="tabs tabs-boxed gap-0.5">
			<button type="button"
				class="tab font-semibold transition-all {activeTab === 'overview' ? 'tab-active' : ''}"
				onclick={() => (activeTab = 'overview')}>📊 요약</button>
			<button type="button"
				class="tab font-semibold transition-all {activeTab === 'shipout' ? 'tab-active' : ''}"
				onclick={() => (activeTab = 'shipout')}>📦 출고 상세</button>
			<button type="button"
				class="tab font-semibold transition-all {activeTab === 'trend' ? 'tab-active' : ''}"
				onclick={() => (activeTab = 'trend')}>📈 연도 추이</button>
		</div>
	</div>

	<!-- 거래처 필터 드롭다운 -->
	<div class="card bg-base-100 shadow-sm">
		<div class="card-body flex-row items-center gap-3 py-3 px-5">
			<span class="shrink-0 text-[11px] font-bold uppercase tracking-widest text-base-content/40">거래처</span>
			<div class="relative">
				<select
					class="select select-bordered select-sm font-semibold {filterClientId ? 'border-secondary text-secondary' : ''}"
					value={filterClientId ?? ''}
					onchange={(e) => {
						const v = (e.currentTarget as HTMLSelectElement).value;
						filterClientId = v === '' ? null : v;
					}}
				>
					<option value="">전체 거래처</option>
					{#each clients as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
			<!-- 선택된 거래처 배지 -->
			{#if filterClient}
				<div class="badge badge-secondary gap-1.5 py-3 px-3">
					<span class="h-1.5 w-1.5 rounded-full bg-secondary-content"></span>
					<span class="text-xs font-semibold">{filterClient.name} 선택 중</span>
					<button
						type="button"
						class="btn btn-ghost btn-xs p-0 min-h-0 h-auto text-secondary-content/70 hover:text-secondary-content"
						onclick={() => { filterClientId = null; }}
						aria-label="선택 해제"
					>✕</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── 기간 선택 (trend 탭 제외 공통) ── -->
	{#if activeTab !== 'trend'}
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body py-4 px-5">
				<div class="flex flex-wrap items-end gap-3">
					<!-- 기간 모드 탭 -->
					<div class="tabs tabs-boxed gap-0.5">
						{#each ([['daily','일별'],['monthly','월별'],['yearly','연별']] as const) as [mode, label] (mode)}
							<button type="button"
								class="tab text-xs font-semibold {periodMode === mode ? 'tab-active' : ''}"
								onclick={() => (periodMode = mode)}>{label}</button>
						{/each}
					</div>

					{#if periodMode === 'daily'}
						<div class="flex items-end gap-2">
							<div class="flex flex-col gap-1">
								<label for="s-from" class="text-xs font-semibold text-base-content/50">시작일</label>
								<input id="s-from" type="date" bind:value={dailyFrom}
									class="input input-bordered input-sm" />
							</div>
							<span class="mb-2 text-base-content/40">~</span>
							<div class="flex flex-col gap-1">
								<label for="s-to" class="text-xs font-semibold text-base-content/50">종료일</label>
								<input id="s-to" type="date" bind:value={dailyTo}
									class="input input-bordered input-sm" />
							</div>
						</div>
					{:else if periodMode === 'monthly'}
						<div class="flex flex-col gap-1">
							<label for="s-month" class="text-xs font-semibold text-base-content/50">월 선택</label>
							<input id="s-month" type="month" bind:value={monthlyValue}
								class="input input-bordered input-sm" />
						</div>
					{:else}
						<div class="flex flex-col gap-1">
							<label for="s-year" class="text-xs font-semibold text-base-content/50">연도 선택</label>
							<input id="s-year" type="number" bind:value={yearlyValue} min="2020" max="2099"
								class="input input-bordered input-sm w-28" />
						</div>
					{/if}

					<button type="button"
						class="btn btn-primary btn-sm"
						onclick={doQuery}>조회</button>

					<span class="mb-0.5 text-xs text-base-content/50">
						조회 기간: <span class="font-semibold text-base-content/70">{periodLabel}</span>
						{#if filterClient}<span class="ml-2 font-semibold text-secondary">· {filterClient.name}</span>{/if}
					</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- ══════════════ 요약 탭 ══════════════ -->
	{#if activeTab === 'overview'}

		<!-- KPI 3개 -->
		<div class="stats stats-horizontal shadow-sm w-full bg-base-100">
			<div class="stat">
				<div class="stat-figure text-primary">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl">📦</div>
				</div>
				<div class="stat-title">총출고 건수</div>
				<div class="stat-value text-base-content">{kpiCount.toLocaleString()}</div>
				<div class="stat-desc">건</div>
			</div>
			<div class="stat">
				<div class="stat-figure text-primary">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl">📊</div>
				</div>
				<div class="stat-title">총출고 수량</div>
				<div class="stat-value text-primary">{kpiQty.toLocaleString()}</div>
				<div class="stat-desc">개</div>
			</div>
			<div class="stat">
				<div class="stat-figure text-secondary">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-xl">🏢</div>
				</div>
				<div class="stat-title">거래처 수</div>
				<div class="stat-value text-base-content">{kpiClients}</div>
				<div class="stat-desc">곳</div>
			</div>
		</div>

		<!-- 카테고리 비율 + Top5 품목 2열 -->
		<div class="grid grid-cols-2 gap-5">
			<!-- 카테고리 비율 -->
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-5">
					<h3 class="card-title text-sm font-bold">카테고리별 비율</h3>
					{#if categoryTotal > 0}
						<!-- 스택 바 -->
						<div class="mb-4 flex h-7 w-full overflow-hidden rounded-full">
							{#each stats.byCategory as row (row.category)}
								{@const pct = (row.totalQuantity / categoryTotal) * 100}
								<div
									class="flex items-center justify-center text-[11px] font-bold text-base-100
										{row.category === 'towel' ? 'bg-info' : row.category === 'sheet' ? 'bg-secondary' : 'bg-warning'}"
									style="width:{pct}%"
									title="{CATEGORY_LABELS[row.category]}: {pct.toFixed(1)}%"
								>
									{pct > 12 ? `${pct.toFixed(0)}%` : ''}
								</div>
							{/each}
						</div>
						<div class="space-y-2">
							{#each stats.byCategory as row (row.category)}
								{@const pct = categoryTotal > 0 ? (row.totalQuantity / categoryTotal) * 100 : 0}
								<div class="flex items-center gap-3">
									<div class="h-3 w-3 shrink-0 rounded-full
										{row.category === 'towel' ? 'bg-info' : row.category === 'sheet' ? 'bg-secondary' : 'bg-warning'}"></div>
									<span class="w-16 text-sm font-medium">{CATEGORY_LABELS[row.category]}</span>
									<progress
										class="progress flex-1
											{row.category === 'towel' ? 'progress-info' : row.category === 'sheet' ? 'progress-secondary' : 'progress-warning'}"
										value={pct}
										max="100"
									></progress>
									<span class="w-12 shrink-0 text-right text-xs font-semibold">{pct.toFixed(1)}%</span>
									<span class="w-14 shrink-0 text-right text-xs text-base-content/50">{row.totalQuantity.toLocaleString()}개</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="py-6 text-center text-sm text-base-content/40">데이터 없음</p>
					{/if}
				</div>
			</div>

			<!-- Top 5 품목 -->
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-5">
					<h3 class="card-title text-sm font-bold">Top 5 출고 품목</h3>
					{#if topItems.length === 0}
						<p class="py-6 text-center text-sm text-base-content/40">데이터 없음</p>
					{:else}
						<div class="space-y-2.5">
							{#each topItems.slice(0, 5) as item, idx (item.itemName + item.category)}
								<div class="flex items-center gap-3">
									<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black
										{idx === 0 ? 'bg-warning text-warning-content' : idx === 1 ? 'bg-base-300 text-base-content' : idx === 2 ? 'bg-error/70 text-error-content' : 'bg-base-200 text-base-content/50'}">
										{idx + 1}
									</span>
									<span class="flex-1 truncate text-sm font-medium">{item.itemName}</span>
									<span class="badge badge-sm font-semibold
										{item.category === 'towel' ? 'badge-info' : item.category === 'sheet' ? 'badge-secondary' : 'badge-warning'}">
										{CATEGORY_LABELS[item.category]}
									</span>
									<span class="w-16 shrink-0 text-right text-sm font-bold">{item.totalQuantity.toLocaleString()}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- 월별 출고 추이 -->
		{#if showMonthlyChart}
			{@const cp = chartPoints}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-5">
					<div class="mb-2 flex items-start justify-between flex-wrap gap-2">
						<div>
							<h3 class="card-title text-sm font-bold">
								{chartGranularity === 'daily' ? '일별' : '월별'} {overviewMetric === 'qty' ? '출고 수량' : '청구 금액'} 추이
								{#if filterClient}<span class="ml-1 text-xs font-medium text-base-content/40">· {filterClient.name}</span>{/if}
							</h3>
							{#if chartGranularityNote}<p class="mt-0.5 text-[11px] text-base-content/40">{chartGranularityNote}</p>{/if}
						</div>
						<div class="flex items-center gap-2">
							<div class="tabs tabs-boxed gap-0.5 p-0.5">
								<button type="button"
									onclick={() => overviewMetric = 'qty'}
									class="tab tab-xs font-semibold {overviewMetric === 'qty' ? 'tab-active' : ''}">수량</button>
								<button type="button"
									onclick={() => overviewMetric = 'amount'}
									class="tab tab-xs font-semibold {overviewMetric === 'amount' ? 'tab-active' : ''}">금액</button>
							</div>
							<button type="button"
								class="btn btn-ghost btn-sm border-accent/30 text-accent hover:bg-accent/10"
								onclick={() => (activeTab = 'trend')}>📈 연도 비교 →</button>
						</div>
					</div>
					{#if cp.points.length === 0}
						<p class="py-8 text-center text-sm text-base-content/40">데이터가 없습니다.</p>
					{:else}
						<div class="pt-2">
							<svg viewBox="0 0 {SVG_W} {SVG_H}" class="w-full" style="height:220px;" xmlns="http://www.w3.org/2000/svg">
								<defs>
									<linearGradient id="areaGradOv" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
										<stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02"/>
									</linearGradient>
								</defs>
								{#each yTicks as tick, i (i)}
									{@const yPos = PAD_TOP + (1 - tick/cp.maxVal) * (SVG_H-PAD_TOP-PAD_BOTTOM)}
									<line x1={PAD_LEFT} y1={yPos} x2={SVG_W-PAD_RIGHT} y2={yPos} stroke="#e2e8f0" stroke-width="1"/>
									<text x={PAD_LEFT-6} y={yPos+4} text-anchor="end" font-size="10" fill="#94a3b8">{fmtOvVal(tick)}</text>
								{/each}
								<line x1={PAD_LEFT} y1={SVG_H-PAD_BOTTOM} x2={SVG_W-PAD_RIGHT} y2={SVG_H-PAD_BOTTOM} stroke="#cbd5e1" stroke-width="1"/>
								{#if cp.areaPath}<path d={cp.areaPath} fill="url(#areaGradOv)"/>{/if}
								<path d={cp.path} fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
								{#each cp.points as pt, i (i)}
									{#if cp.gran === 'daily'}
										<circle cx={pt.x} cy={pt.y} r="3" fill="#0ea5e9" stroke="white" stroke-width="1.5"/>
										{#if pt.dispLabel}
											<text x={pt.x} y={SVG_H-PAD_BOTTOM+14} text-anchor="middle" font-size="8" fill="#64748b">{pt.dispLabel}</text>
										{/if}
									{:else}
										<line x1={pt.x} y1={pt.y} x2={pt.x} y2={SVG_H-PAD_BOTTOM} stroke="#bae6fd" stroke-width="1" stroke-dasharray="3,3"/>
										<circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke="#0ea5e9" stroke-width="2.5"/>
										<text x={pt.x} y={pt.y-10} text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">{fmtOvVal(pt.val)}</text>
										<text x={pt.x} y={SVG_H-PAD_BOTTOM+16} text-anchor="middle" font-size="10" fill="#64748b">{pt.dispLabel}</text>
									{/if}
								{/each}
							</svg>
						</div>
					{/if}
				</div>
			</div>
		{/if}

	<!-- ══════════════ 출고 상세 탭 ══════════════ -->
	{:else if activeTab === 'shipout'}

		<!-- KPI 3개 -->
		<div class="stats stats-horizontal shadow-sm w-full bg-base-100">
			<div class="stat">
				<div class="stat-figure text-primary">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl">📦</div>
				</div>
				<div class="stat-title">총출고 건수</div>
				<div class="stat-value text-base-content">{kpiCount.toLocaleString()}</div>
			</div>
			<div class="stat">
				<div class="stat-figure text-primary">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl">🧺</div>
				</div>
				<div class="stat-title">총출고 수량</div>
				<div class="stat-value text-primary">{kpiQty.toLocaleString()}</div>
			</div>
			<div class="stat">
				<div class="stat-figure text-secondary">
					<div class="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-xl">🏢</div>
				</div>
				<div class="stat-title">{filterClientId ? '선택 거래처' : '출고 거래처'}</div>
				<div class="stat-value text-base-content">
					{filterClientId ? (filterClient?.name ?? '') : kpiClients.toLocaleString()}
				</div>
			</div>
		</div>

		<!-- 거래처별 출고 현황 (전체 모드) -->
		{#if !filterClientId}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body p-0">
					<div class="border-b border-base-200 px-5 py-4">
						<h3 class="card-title text-base">거래처별 출고 현황</h3>
						<p class="mt-0.5 text-xs text-base-content/40">{periodLabel} 기준</p>
					</div>
					{#if stats.byClient.length === 0}
						<p class="px-5 py-10 text-center text-sm text-base-content/40">해당 기간 출고 데이터가 없습니다.</p>
					{:else}
						<div class="grid grid-cols-2 divide-x divide-base-200">
							<div class="overflow-hidden">
								<table class="table table-sm">
									<thead>
										<tr>
											<th>거래처</th>
											<th class="text-right">출고 건수</th>
											<th class="text-right">출고 수량</th>
										</tr>
									</thead>
									<tbody>
										{#each stats.byClient as row (row.clientId)}
											<tr class="hover">
												<td class="font-medium">{row.clientName}</td>
												<td class="text-right">{row.shipmentCount}</td>
												<td class="text-right font-bold">{row.totalQuantity.toLocaleString()}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
							<div class="space-y-3 p-5">
								<p class="mb-4 text-xs font-semibold uppercase tracking-wide text-base-content/40">수량 기준 비교</p>
								{#each stats.byClient as row (row.clientId)}
									{@const ratio = row.totalQuantity / clientMaxQty}
									<div class="flex items-center gap-3">
										<span class="w-24 shrink-0 truncate text-right text-xs font-medium text-base-content/60" title={row.clientName}>{row.clientName}</span>
										<progress
											class="progress progress-primary flex-1"
											value={Math.max(ratio * 100, row.totalQuantity > 0 ? 2 : 0)}
											max="100"
										></progress>
										<span class="w-14 shrink-0 text-right text-xs font-bold">{row.totalQuantity.toLocaleString()}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- 카테고리별 출고 현황 -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-0">
				<div class="border-b border-base-200 px-5 py-4">
					<h3 class="card-title text-base">카테고리별 출고 현황</h3>
					<p class="mt-0.5 text-xs text-base-content/40">
						{periodLabel}{#if filterClient} · {filterClient.name}{/if}
					</p>
				</div>
				{#if stats.byCategory.length === 0}
					<p class="px-5 py-10 text-center text-sm text-base-content/40">해당 기간 출고 데이터가 없습니다.</p>
				{:else}
					<div class="grid grid-cols-2 divide-x divide-base-200">
						<div class="overflow-hidden">
							<table class="table table-sm">
								<thead>
									<tr>
										<th>카테고리</th>
										<th class="text-right">출고 수량</th>
									</tr>
								</thead>
								<tbody>
									{#each stats.byCategory as row (row.category)}
										<tr class="hover">
											<td>
												<span class="badge badge-sm font-semibold
													{row.category === 'towel' ? 'badge-info' : row.category === 'sheet' ? 'badge-secondary' : 'badge-warning'}">
													{CATEGORY_LABELS[row.category]}
												</span>
											</td>
											<td class="text-right font-bold">{row.totalQuantity.toLocaleString()}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="p-5">
							<p class="mb-4 text-xs font-semibold uppercase tracking-wide text-base-content/40">카테고리 비율</p>
							{#if categoryTotal > 0}
								<div class="mb-4 flex h-8 w-full overflow-hidden rounded-full">
									{#each stats.byCategory as row (row.category)}
										{@const pct = (row.totalQuantity / categoryTotal) * 100}
										<div
											class="flex items-center justify-center text-[11px] font-bold text-base-100
												{row.category === 'towel' ? 'bg-info' : row.category === 'sheet' ? 'bg-secondary' : 'bg-warning'}"
											style="width:{pct}%"
											title="{CATEGORY_LABELS[row.category]}: {pct.toFixed(1)}%"
										>
											{pct >= 10 ? pct.toFixed(0)+'%' : ''}
										</div>
									{/each}
								</div>
							{/if}
							<div class="space-y-2.5">
								{#each stats.byCategory as row (row.category)}
									{@const pct = categoryTotal > 0 ? (row.totalQuantity / categoryTotal) * 100 : 0}
									<div class="flex items-center gap-3">
										<div class="h-3 w-3 shrink-0 rounded-full
											{row.category === 'towel' ? 'bg-info' : row.category === 'sheet' ? 'bg-secondary' : 'bg-warning'}"></div>
										<span class="w-16 text-sm font-medium">{CATEGORY_LABELS[row.category]}</span>
										<progress
											class="progress flex-1
												{row.category === 'towel' ? 'progress-info' : row.category === 'sheet' ? 'progress-secondary' : 'progress-warning'}"
											value={pct}
											max="100"
										></progress>
										<span class="w-12 shrink-0 text-right text-xs font-semibold">{pct.toFixed(1)}%</span>
										<span class="w-14 shrink-0 text-right text-xs text-base-content/50">{row.totalQuantity.toLocaleString()}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- 품목별 출고 순위 Top 10 -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-0">
				<div class="border-b border-base-200 px-5 py-4">
					<h3 class="card-title text-base">
						품목별 출고 순위 <span class="text-sm font-medium text-base-content/40">Top 10</span>
					</h3>
					<p class="mt-0.5 text-xs text-base-content/40">
						{periodLabel}{#if filterClient} · {filterClient.name}{/if}
					</p>
				</div>
				{#if topItems.length === 0}
					<p class="px-5 py-10 text-center text-sm text-base-content/40">해당 기간 출고 데이터가 없습니다.</p>
				{:else}
					<table class="table table-sm">
						<thead>
							<tr>
								<th class="w-12 text-center">순위</th>
								<th>품목명</th>
								<th>카테고리</th>
								<th class="text-right">출고 수량</th>
							</tr>
						</thead>
						<tbody>
							{#each topItems as item, idx (item.itemName + item.category)}
								<tr class="hover">
									<td class="text-center">
										{#if idx === 0}
											<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning text-xs font-black text-warning-content">1</span>
										{:else if idx === 1}
											<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-base-300 text-xs font-black text-base-content">2</span>
										{:else if idx === 2}
											<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-error/70 text-xs font-black text-error-content">3</span>
										{:else}
											<span class="text-sm text-base-content/50">{idx+1}</span>
										{/if}
									</td>
									<td class="font-medium">{item.itemName}</td>
									<td>
										<span class="badge badge-sm font-semibold
											{item.category === 'towel' ? 'badge-info' : item.category === 'sheet' ? 'badge-secondary' : 'badge-warning'}">
											{CATEGORY_LABELS[item.category]}
										</span>
									</td>
									<td class="text-right font-bold">{item.totalQuantity.toLocaleString()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>

		<!-- 출고 수량 + 청구 금액 듀얼 차트 -->
		{#if showMonthlyChart}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">

				<!-- ① 출고 수량 추이 -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body p-0">
						<div class="border-b border-base-200 px-5 py-4 flex items-start justify-between gap-3">
							<div>
								<h3 class="card-title text-base">
									출고 수량 추이
									{#if filterClient}<span class="text-sm font-medium text-base-content/40">— {filterClient.name}</span>{/if}
								</h3>
								{#if chartGranularityNote}<p class="mt-0.5 text-[11px] text-base-content/40">{chartGranularityNote}</p>{/if}
							</div>
							<div class="text-right shrink-0">
								<p class="text-lg font-black text-primary">{shipoutQtyPoints.points.reduce((s, p) => s + p.val, 0).toLocaleString()}</p>
								<p class="text-[11px] text-base-content/40">기간 합계 (개)</p>
							</div>
						</div>
						{#if shipoutQtyPoints.points.length === 0}
							<p class="px-5 py-10 text-center text-sm text-base-content/40">해당 기간 데이터가 없습니다.</p>
						{:else}
							<div class="p-4">
								<svg viewBox="0 0 {SVG_W} {SVG_H}" class="w-full" style="height:200px;" xmlns="http://www.w3.org/2000/svg">
									<defs>
										<linearGradient id="areaGradShipQty" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
											<stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02"/>
										</linearGradient>
									</defs>
									{#each shipoutYTicksQty as tick, i (i)}
										{@const yPos = PAD_TOP + (1 - tick / shipoutQtyPoints.maxVal) * (SVG_H - PAD_TOP - PAD_BOTTOM)}
										<line x1={PAD_LEFT} y1={yPos} x2={SVG_W-PAD_RIGHT} y2={yPos} stroke="#e2e8f0" stroke-width="1"/>
										<text x={PAD_LEFT-6} y={yPos+4} text-anchor="end" font-size="10" fill="#94a3b8">{tick.toLocaleString()}</text>
									{/each}
									<line x1={PAD_LEFT} y1={SVG_H-PAD_BOTTOM} x2={SVG_W-PAD_RIGHT} y2={SVG_H-PAD_BOTTOM} stroke="#cbd5e1" stroke-width="1"/>
									{#if shipoutQtyPoints.areaPath}<path d={shipoutQtyPoints.areaPath} fill="url(#areaGradShipQty)"/>{/if}
									<path d={shipoutQtyPoints.path} fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
									{#each shipoutQtyPoints.points as pt, i (i)}
										{#if shipoutQtyPoints.gran === 'daily'}
											<circle cx={pt.x} cy={pt.y} r="3" fill="#0ea5e9" stroke="white" stroke-width="1.5"/>
											{#if pt.dispLabel}
												<text x={pt.x} y={SVG_H-PAD_BOTTOM+14} text-anchor="middle" font-size="8" fill="#64748b">{pt.dispLabel}</text>
											{/if}
										{:else}
											<line x1={pt.x} y1={pt.y} x2={pt.x} y2={SVG_H-PAD_BOTTOM} stroke="#bae6fd" stroke-width="1" stroke-dasharray="3,3"/>
											<circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke="#0ea5e9" stroke-width="2.5"/>
											<text x={pt.x} y={pt.y-10} text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">{pt.val.toLocaleString()}</text>
											<text x={pt.x} y={SVG_H-PAD_BOTTOM+16} text-anchor="middle" font-size="10" fill="#64748b">{pt.dispLabel}</text>
										{/if}
									{/each}
								</svg>
							</div>
						{/if}
					</div>
				</div>

				<!-- ② 청구 금액 추이 -->
				<div class="card bg-base-100 shadow-sm">
					<div class="card-body p-0">
						<div class="border-b border-base-200 px-5 py-4 flex items-start justify-between gap-3">
							<div>
								<h3 class="card-title text-base">
									청구 금액 추이
									{#if filterClient}<span class="text-sm font-medium text-base-content/40">— {filterClient.name}</span>{/if}
								</h3>
								<p class="mt-0.5 text-[11px] text-base-content/40">출고 수량 × 단가 기준</p>
							</div>
							<div class="text-right shrink-0">
								<p class="text-lg font-black text-accent">{fmtVal(shipoutAmtPoints.points.reduce((s, p) => s + p.val, 0), 'amount')}</p>
								<p class="text-[11px] text-base-content/40">기간 합계 (원)</p>
							</div>
						</div>
						{#if shipoutAmtPoints.points.length === 0}
							<p class="px-5 py-10 text-center text-sm text-base-content/40">해당 기간 데이터가 없습니다.</p>
						{:else}
							<div class="p-4">
								<svg viewBox="0 0 {SVG_W} {SVG_H}" class="w-full" style="height:200px;" xmlns="http://www.w3.org/2000/svg">
									<defs>
										<linearGradient id="areaGradShipAmt" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.25"/>
											<stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.02"/>
										</linearGradient>
									</defs>
									{#each shipoutYTicksAmt as tick, i (i)}
										{@const yPos = PAD_TOP + (1 - tick / shipoutAmtPoints.maxVal) * (SVG_H - PAD_TOP - PAD_BOTTOM)}
										<line x1={PAD_LEFT} y1={yPos} x2={SVG_W-PAD_RIGHT} y2={yPos} stroke="#e2e8f0" stroke-width="1"/>
										<text x={PAD_LEFT-6} y={yPos+4} text-anchor="end" font-size="10" fill="#94a3b8">{fmtVal(tick, 'amount')}</text>
									{/each}
									<line x1={PAD_LEFT} y1={SVG_H-PAD_BOTTOM} x2={SVG_W-PAD_RIGHT} y2={SVG_H-PAD_BOTTOM} stroke="#cbd5e1" stroke-width="1"/>
									{#if shipoutAmtPoints.areaPath}<path d={shipoutAmtPoints.areaPath} fill="url(#areaGradShipAmt)"/>{/if}
									<path d={shipoutAmtPoints.path} fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
									{#each shipoutAmtPoints.points as pt, i (i)}
										{#if shipoutAmtPoints.gran === 'daily'}
											<circle cx={pt.x} cy={pt.y} r="3" fill="#8b5cf6" stroke="white" stroke-width="1.5"/>
											{#if pt.dispLabel}
												<text x={pt.x} y={SVG_H-PAD_BOTTOM+14} text-anchor="middle" font-size="8" fill="#64748b">{pt.dispLabel}</text>
											{/if}
										{:else}
											<line x1={pt.x} y1={pt.y} x2={pt.x} y2={SVG_H-PAD_BOTTOM} stroke="#ddd6fe" stroke-width="1" stroke-dasharray="3,3"/>
											<circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke="#8b5cf6" stroke-width="2.5"/>
											<text x={pt.x} y={pt.y-10} text-anchor="middle" font-size="11" font-weight="700" fill="#6d28d9">{fmtVal(pt.val, 'amount')}</text>
											<text x={pt.x} y={SVG_H-PAD_BOTTOM+16} text-anchor="middle" font-size="10" fill="#64748b">{pt.dispLabel}</text>
										{/if}
									{/each}
								</svg>
							</div>
						{/if}
					</div>
				</div>

			</div>
		{/if}

	<!-- ══════════════ 연도 추이 탭 ══════════════ -->
	{:else if activeTab === 'trend'}

		<!-- 컨트롤 바: 지표 선택 + 연도 커스텀 입력 -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body py-4 px-5">
				<div class="flex flex-wrap items-start gap-5">

					<!-- 지표 선택 -->
					<div class="flex items-center gap-2 shrink-0">
						<span class="text-xs font-bold uppercase tracking-widest text-base-content/40">지표</span>
						<div class="tabs tabs-boxed gap-0.5">
							<button type="button" onclick={() => trendMetric = 'qty'}
								class="tab text-xs font-semibold {trendMetric === 'qty' ? 'tab-active' : ''}">수량</button>
							<button type="button" onclick={() => trendMetric = 'amount'}
								class="tab text-xs font-semibold {trendMetric === 'amount' ? 'tab-active' : ''}">금액</button>
						</div>
					</div>

					<!-- 연도 선택: 선택된 연도 칩 + 직접 입력 -->
					<div class="flex flex-col gap-3 flex-1 min-w-0">
						<span class="text-xs font-bold uppercase tracking-widest text-base-content/40">비교 연도 선택</span>

						<!-- 선택된 연도 (removable 배지) -->
						<div class="flex flex-wrap gap-1.5 items-center">
							{#each selectedYears as yr (yr)}
								{@const color = getYearColor(yr)}
								<span class="badge gap-1 border px-2.5 py-3 text-xs font-bold"
									style="background:{color.bg};border-color:{color.stroke};color:{color.stroke};">
									<span class="h-1.5 w-1.5 rounded-full mr-0.5" style="background:{color.stroke};"></span>
									{yr}
									<button type="button" onclick={() => removeTrendYear(yr)}
										class="ml-0.5 opacity-60 hover:opacity-100 font-black text-[10px]">✕</button>
								</span>
							{/each}
						</div>

						<!-- 직접 입력 -->
						<form
							class="flex items-center gap-2"
							onsubmit={(e) => { e.preventDefault(); if (yearInput !== '') addTrendYear(yearInput); }}
						>
							<input
								type="number"
								bind:value={yearInput}
								placeholder="다른 연도 직접 입력 (예: 2019)"
								min="1900" max="2100"
								class="input input-bordered input-sm w-52"
							/>
							<button
								type="submit"
								class="btn btn-secondary btn-sm"
							>+ 추가</button>
						</form>
					</div>
				</div>
			</div>
		</div>

		<!-- SVG 멀티라인 차트 -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-0">
				<div class="border-b border-base-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
					<div>
						<h3 class="card-title text-base">
							월별 {trendMetric === 'qty' ? '출고 수량' : '청구 금액'} 추이
							{#if filterClient}<span class="ml-1 text-sm font-medium text-base-content/40">— {filterClient.name}</span>{/if}
						</h3>
						<p class="mt-0.5 text-xs text-base-content/40">선택 연도의 1–12월 비교</p>
					</div>
					<div class="flex items-center gap-3 flex-wrap">
						<!-- 범례 -->
						<div class="flex flex-wrap gap-3">
							{#each trendCalc.series as s (s.year)}
								<span class="flex items-center gap-1.5 text-xs font-semibold" style="color:{s.color.stroke}">
									<span class="inline-block h-2.5 w-5 rounded-full" style="background:{s.color.stroke};"></span>
									{s.year}년
								</span>
							{/each}
						</div>
						<!-- 수치 표시 토글 -->
						<button
							type="button"
							onclick={() => showTrendLabels = !showTrendLabels}
							class="btn btn-sm {showTrendLabels ? 'btn-secondary' : 'btn-ghost border-base-300'}"
						>
							<span>🔢</span>
							수치 {showTrendLabels ? '숨기기' : '표시'}
						</button>
					</div>
				</div>
				<div class="p-5">
					<svg viewBox="0 0 {TREND_W} {TREND_H}" class="w-full" style="height:380px;" xmlns="http://www.w3.org/2000/svg">
						<!-- y축 그리드 -->
						{#each trendCalc.yTicks as tick, i (i)}
							{@const yPos = TP.t + (1 - tick / trendCalc.maxVal) * (TREND_H - TP.t - TP.b)}
							<line x1={TP.l} y1={yPos} x2={TREND_W - TP.r} y2={yPos} stroke="#e2e8f0" stroke-width="1"/>
							<text x={TP.l - 6} y={yPos + 4} text-anchor="end" font-size="11" fill="#94a3b8">{fmtTrendVal(tick)}</text>
						{/each}
						<!-- x축 기준선 -->
						<line x1={TP.l} y1={TREND_H - TP.b} x2={TREND_W - TP.r} y2={TREND_H - TP.b} stroke="#cbd5e1" stroke-width="1.5"/>
						<!-- x축 월 라벨 -->
						{#each trendCalc.series[0]?.points ?? [] as pt (pt.month)}
							<text x={pt.x} y={TREND_H - TP.b + 18} text-anchor="middle" font-size="11" fill="#64748b">{pt.month < 10 ? '\u00A0' : ''}{pt.month}월</text>
						{/each}
						<!-- 면적 (뒤에서 앞 순서) -->
						{#each trendCalc.series as s (s.year)}
							<path d={s.areaPath} fill={s.color.stroke} fill-opacity="0.07"/>
						{/each}
						<!-- 라인 + 점 + 수치 레이블 -->
						{#each trendCalc.series as s, si (s.year)}
							<path d={s.path} fill="none" stroke={s.color.stroke} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
							{#each s.points as pt (pt.month)}
								{#if si === 0}
									<line x1={pt.x} y1={TP.t} x2={pt.x} y2={TREND_H - TP.b} stroke="#f1f5f9" stroke-width="1"/>
								{/if}
								{#if showTrendLabels && pt.val > 0}
									{@const labelY = Math.max(8, pt.y - 8 - si * 14)}
									<text
										x={pt.x}
										y={labelY}
										text-anchor="middle"
										font-size="9"
										font-weight="700"
										fill={s.color.stroke}
										opacity="0.92"
									>{fmtTrendVal(pt.val)}</text>
								{/if}
								<circle cx={pt.x} cy={pt.y} r="4.5" fill="white" stroke={s.color.stroke} stroke-width="2.5"/>
							{/each}
						{/each}
					</svg>
				</div>
			</div>
		</div>

		<!-- 월별 수치 테이블 -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body p-0">
				<div class="border-b border-base-200 px-5 py-4">
					<h3 class="card-title text-base">월별 상세 데이터</h3>
					<p class="mt-0.5 text-xs text-base-content/40">선택한 연도별 각 월의 {trendMetric === 'qty' ? '출고 수량' : '청구 금액'}</p>
				</div>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th class="whitespace-nowrap w-20">연도</th>
								{#each Array.from({length: 12}, (_, i) => i + 1) as m (m)}
									<th class="whitespace-nowrap text-right">{m}월</th>
								{/each}
								<th class="whitespace-nowrap text-right">합계</th>
							</tr>
						</thead>
						<tbody>
							{#each trendCalc.series as s (s.year)}
								{@const total = s.points.reduce((acc, p) => acc + p.val, 0)}
								<tr class="hover">
									<td class="whitespace-nowrap">
										<span class="badge border px-2.5 py-3 text-xs font-bold"
											style="background:{s.color.bg};border-color:{s.color.stroke};color:{s.color.stroke};">
											<span class="h-1.5 w-1.5 rounded-full mr-1" style="background:{s.color.stroke};"></span>
											{s.year}
										</span>
									</td>
									{#each s.points as pt (pt.month)}
										<td class="whitespace-nowrap text-right text-xs">
											{#if pt.val > 0}
												{fmtTrendVal(pt.val)}
											{:else}
												<span class="text-base-content/20">—</span>
											{/if}
										</td>
									{/each}
									<td class="whitespace-nowrap text-right text-xs font-black" style="color:{s.color.stroke}">
										{fmtTrendVal(total)}
									</td>
								</tr>
							{/each}

							<!-- 전년 대비 행 (정확히 2개 연도 선택 시) / 연도 평균 행 (3개 이상) -->
							{#if trendCalc.series.length === 2}
								{@const sA = trendCalc.series[0]}
								{@const sB = trendCalc.series[1]}
								{@const totA = sA.points.reduce((a, p) => a + p.val, 0)}
								{@const totB = sB.points.reduce((a, p) => a + p.val, 0)}
								{@const totDiff = totA !== 0 ? Math.round((totB - totA) / totA * 100) : null}
								<tr class="border-t-2 border-base-300 bg-base-200/50">
									<td class="whitespace-nowrap text-xs font-semibold text-base-content/60">
										전년 대비<br/>
										<span class="text-[10px] font-normal text-base-content/40">{sA.year}→{sB.year}</span>
									</td>
									{#each Array.from({length: 12}, (_, i) => i) as mi (mi)}
										{@const vA = sA.points[mi].val}
										{@const vB = sB.points[mi].val}
										{@const d = vA !== 0 ? Math.round((vB - vA) / vA * 100) : null}
										<td class="whitespace-nowrap text-right text-[11px] font-semibold">
											{#if d === null || (vA === 0 && vB === 0)}
												<span class="text-base-content/20">—</span>
											{:else if d > 0}
												<span class="text-success">▲{d}%</span>
											{:else if d < 0}
												<span class="text-error">▼{Math.abs(d)}%</span>
											{:else}
												<span class="text-base-content/40">±0%</span>
											{/if}
										</td>
									{/each}
									<td class="whitespace-nowrap text-right text-xs font-bold">
										{#if totDiff === null}
											<span class="text-base-content/20">—</span>
										{:else if totDiff > 0}
											<span class="text-success">▲{totDiff}%</span>
										{:else if totDiff < 0}
											<span class="text-error">▼{Math.abs(totDiff)}%</span>
										{:else}
											<span class="text-base-content/40">±0%</span>
										{/if}
									</td>
								</tr>
							{:else if trendCalc.series.length >= 3}
								<tr class="border-t-2 border-base-300 bg-base-200/50">
									<td class="whitespace-nowrap text-xs font-semibold text-base-content/60">
										연도 평균<br/>
										<span class="text-[10px] font-normal text-base-content/40">{trendCalc.series.length}개 연도</span>
									</td>
									{#each Array.from({length: 12}, (_, i) => i) as mi (mi)}
										{@const avg = Math.round(trendCalc.series.reduce((s, sr) => s + sr.points[mi].val, 0) / trendCalc.series.length)}
										<td class="whitespace-nowrap text-right text-[11px] font-semibold text-base-content/70">
											{#if avg > 0}
												{fmtTrendVal(avg)}
											{:else}
												<span class="text-base-content/20">—</span>
											{/if}
										</td>
									{/each}
									<td class="whitespace-nowrap text-right text-xs font-bold text-base-content/70">
										{fmtTrendVal(Math.round(trendCalc.series.reduce((s, sr) => s + sr.points.reduce((ss, p) => ss + p.val, 0), 0) / trendCalc.series.length))}
									</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>

	{/if}<!-- /trend /shipout /overview -->

</div>
