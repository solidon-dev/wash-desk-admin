import type { StatsShipout } from '$lib/api/stats';

// ─── 인터페이스 ────────────────────────────────────────────────────────────────

export interface CategoryRow {
	cat: string;
	label: string;
	qty: number;
	amount: number;
	color: string;
}

export interface ItemRow {
	name: string;
	cat: string;
	qty: number;
	amount: number;
}

export interface ClientRow {
	id: string;
	name: string;
	count: number;
	qty: number;
	amount: number;
}

export interface Stats {
	count: number;
	qty: number;
	amount: number;
	byCategory: CategoryRow[];
	byItem: ItemRow[];
	byClient: ClientRow[];
}

export interface MonthlyRow {
	month: number;
	qty: number;
	amount: number;
}

export interface DailyRow {
	date: string; // 'YYYY-MM-DD'
	qty: number;
	amount: number;
}

export interface RangeMonthRow {
	ym: string; // 'YYYY-MM'
	label: string;
	qty: number;
	amount: number;
}

export interface DiffResult {
	sign: string;
	pct: string;
	cls: string;
}

// ─── 카테고리 메타 ─────────────────────────────────────────────────────────────

// DB categories.name 기준 색상 / 레이블 맵
export const CATEGORY_COLORS: Record<string, string> = {
	타올류: '#3B82F6',
	린넨류: '#8B5CF6',
	침구류: '#EC4899',
	욕실용품: '#06B6D4',
	유니폼: '#F59E0B',
	주방용품: '#10B981',
	'스파·사우나': '#6366F1',
	테이블웨어: '#F97316',
	'커튼·암막': '#84CC16',
	객실용품: '#EF4444',
	기타: '#9CA3AF'
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_COLORS);

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

export function pad(n: number): string {
	return String(n).padStart(2, '0');
}

export function fmtQty(n: number): string {
	return n.toLocaleString('ko-KR');
}

export function fmtAmt(n: number): string {
	if (n >= 100_000_000) {
		const val = n / 100_000_000;
		return `${val % 1 === 0 ? val : val.toFixed(1)}억`;
	}
	if (n >= 10_000) {
		const val = n / 10_000;
		return `${val % 1 === 0 ? val : val.toFixed(1)}만`;
	}
	return String(n);
}

export function fmtAmtFull(n: number): string {
	return n.toLocaleString('ko-KR') + '원';
}

export function inRange(dateStr: string, from: string, to: string): boolean {
	const d = dateStr.slice(0, 10);
	return d >= from && d <= to;
}

export function pad2(n: number) {
	return String(n).padStart(2, '0');
}

export function offsetDate(base: Date, days: number): string {
	const ms = base.getTime() + days * 86_400_000;
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function daysBetween(from: string, to: string): number {
	const a = new Date(from + 'T00:00:00').getTime();
	const b = new Date(to + 'T00:00:00').getTime();
	return Math.round((b - a) / 86_400_000) + 1;
}

export function prevPeriod(from: string, to: string): { from: string; to: string } {
	const len = daysBetween(from, to);
	const fromDate = new Date(from + 'T00:00:00');
	const prevTo = offsetDate(fromDate, -1);
	const prevFrom = offsetDate(new Date(prevTo + 'T00:00:00'), -(len - 1));
	return { from: prevFrom, to: prevTo };
}

export function diff(curr: number, prev: number): DiffResult {
	if (prev === 0) {
		if (curr === 0) return { sign: '', pct: '0.0%', cls: 'flat' };
		return { sign: '+', pct: '100.0%', cls: 'up' };
	}
	const rate = ((curr - prev) / prev) * 100;
	if (rate > 0) return { sign: '+', pct: `${rate.toFixed(1)}%`, cls: 'up' };
	if (rate < 0) return { sign: '-', pct: `${Math.abs(rate).toFixed(1)}%`, cls: 'down' };
	return { sign: '', pct: '0.0%', cls: 'flat' };
}

// ─── DB 데이터 기반 집계 ───────────────────────────────────────────────────────

/**
 * StatsShipout[] 에서 기간 + 거래처 필터 후 통계 집계
 */
export function calcStats(
	shipouts: StatsShipout[],
	from: string,
	to: string,
	clientId?: string
): Stats {
	const filtered = shipouts.filter(
		(s) => inRange(s.created_at, from, to) && (clientId == null || s.client_id === clientId)
	);

	const catMap: Record<string, { qty: number; amount: number }> = {};
	const itemMap: Record<string, { cat: string; qty: number; amount: number }> = {};
	const clientMap: Record<string, { name: string; count: number; qty: number; amount: number }> =
		{};

	let totalQty = 0;
	let totalAmount = 0;

	for (const s of filtered) {
		if (!clientMap[s.client_id]) {
			clientMap[s.client_id] = { name: s.client_name, count: 0, qty: 0, amount: 0 };
		}
		clientMap[s.client_id].count += 1;

		for (const item of s.items) {
			const amount = item.quantity * item.unit_price;
			const cat = item.category_name;

			totalQty += item.quantity;
			totalAmount += amount;

			if (!catMap[cat]) catMap[cat] = { qty: 0, amount: 0 };
			catMap[cat].qty += item.quantity;
			catMap[cat].amount += amount;

			if (!itemMap[item.item_name]) itemMap[item.item_name] = { cat, qty: 0, amount: 0 };
			itemMap[item.item_name].qty += item.quantity;
			itemMap[item.item_name].amount += amount;

			clientMap[s.client_id].qty += item.quantity;
			clientMap[s.client_id].amount += amount;
		}
	}

	// byCategory: CATEGORY_KEYS 순서 유지, qty > 0인 것만
	const byCategory: CategoryRow[] = CATEGORY_KEYS.filter((cat) => catMap[cat]?.qty > 0).map(
		(cat) => ({
			cat,
			label: cat,
			qty: catMap[cat].qty,
			amount: catMap[cat].amount,
			color: CATEGORY_COLORS[cat] ?? '#9CA3AF'
		})
	);

	// byItem: qty 내림차순
	const byItem: ItemRow[] = Object.entries(itemMap)
		.map(([name, v]) => ({ name, cat: v.cat, qty: v.qty, amount: v.amount }))
		.sort((a, b) => b.qty - a.qty);

	// byClient: qty 내림차순
	const byClient: ClientRow[] = Object.entries(clientMap)
		.map(([id, v]) => ({ id, name: v.name, count: v.count, qty: v.qty, amount: v.amount }))
		.sort((a, b) => b.qty - a.qty);

	return {
		count: filtered.length,
		qty: totalQty,
		amount: totalAmount,
		byCategory,
		byItem,
		byClient
	};
}

/**
 * 일별 수량·금액 집계 (from ~ to 매일)
 */
export function calcDaily(
	shipouts: StatsShipout[],
	from: string,
	to: string,
	clientId?: string
): DailyRow[] {
	const len = daysBetween(from, to);
	const fromDate = new Date(from + 'T00:00:00');
	const rows: DailyRow[] = Array.from({ length: len }, (_, i) => ({
		date: offsetDate(fromDate, i),
		qty: 0,
		amount: 0
	}));
	const idx: Record<string, DailyRow> = Object.fromEntries(rows.map((r) => [r.date, r]));

	for (const s of shipouts) {
		if (clientId != null && s.client_id !== clientId) continue;
		const d = s.created_at.slice(0, 10);
		const row = idx[d];
		if (!row) continue;
		for (const item of s.items) {
			row.qty += item.quantity;
			row.amount += item.quantity * item.unit_price;
		}
	}
	return rows;
}

/**
 * 범위 월별 집계
 */
export function calcRangeMonthly(
	shipouts: StatsShipout[],
	from: string,
	to: string,
	clientId?: string
): RangeMonthRow[] {
	const fromY = parseInt(from.slice(0, 4), 10);
	const fromM = parseInt(from.slice(5, 7), 10);
	const toY = parseInt(to.slice(0, 4), 10);
	const toM = parseInt(to.slice(5, 7), 10);

	const months: RangeMonthRow[] = [];
	let y = fromY,
		m = fromM;
	while (y < toY || (y === toY && m <= toM)) {
		const ym = `${y}-${pad2(m)}`;
		const sameYear = fromY === toY;
		months.push({
			ym,
			label: sameYear ? `${m}월` : `${String(y).slice(2)}/${pad2(m)}`,
			qty: 0,
			amount: 0
		});
		if (m === 12) {
			m = 1;
			y += 1;
		} else {
			m += 1;
		}
	}

	const idx: Record<string, RangeMonthRow> = Object.fromEntries(months.map((r) => [r.ym, r]));
	for (const s of shipouts) {
		if (clientId != null && s.client_id !== clientId) continue;
		if (!inRange(s.created_at, from, to)) continue;
		const ym = s.created_at.slice(0, 7);
		const row = idx[ym];
		if (!row) continue;
		for (const item of s.items) {
			row.qty += item.quantity;
			row.amount += item.quantity * item.unit_price;
		}
	}
	return months;
}

/**
 * 카테고리별 월별 수량 집계 (연간 스택바 차트용, 1~12월)
 */
export function calcMonthlyCategoryStack(
	shipouts: StatsShipout[],
	year: number,
	clientId?: string
): Record<string, number[]> {
	const result: Record<string, number[]> = {};
	for (const cat of CATEGORY_KEYS) {
		result[cat] = new Array(12).fill(0);
	}

	for (const s of shipouts) {
		const dateYear = parseInt(s.created_at.slice(0, 4), 10);
		if (dateYear !== year) continue;
		if (clientId != null && s.client_id !== clientId) continue;

		const monthIdx = parseInt(s.created_at.slice(5, 7), 10) - 1;
		for (const item of s.items) {
			const cat = item.category_name;
			if (result[cat]) {
				result[cat][monthIdx] += item.quantity;
			}
		}
	}
	return result;
}
