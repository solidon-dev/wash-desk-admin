import {
  clients,
  UNIT_PRICES,
  ITEM_CATEGORY,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from './data';
import type { Shipment } from './data';

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
  date: string;   // 'YYYY-MM-DD'
  qty: number;
  amount: number;
}

export interface RangeMonthRow {
  ym: string;     // 'YYYY-MM'
  label: string;  // '5월' | '25/12'
  qty: number;
  amount: number;
}

export interface DiffResult {
  sign: string;
  pct: string;
  cls: string;
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

/**
 * 숫자를 2자리 문자열로 패딩
 * @example pad(5) → "05"
 */
export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * 수량 포맷 (천 단위 쉼표)
 * @example fmtQty(1234) → "1,234"
 */
export function fmtQty(n: number): string {
  return n.toLocaleString('ko-KR');
}

/**
 * 금액 축약 포맷 (억/만 단위)
 * @example fmtAmt(150000000) → "1.5억"
 * @example fmtAmt(30000) → "3만"
 * @example fmtAmt(500) → "500"
 */
export function fmtAmt(n: number): string {
  if (n >= 100_000_000) {
    const val = n / 100_000_000;
    // 소수점 한 자리까지, 불필요한 .0 제거
    const str = val % 1 === 0 ? String(val) : val.toFixed(1);
    return `${str}억`;
  }
  if (n >= 10_000) {
    const val = n / 10_000;
    const str = val % 1 === 0 ? String(val) : val.toFixed(1);
    return `${str}만`;
  }
  return String(n);
}

/**
 * 금액 전체 포맷 (천 단위 쉼표 + 원)
 * @example fmtAmtFull(1234567) → "1,234,567원"
 */
export function fmtAmtFull(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

// ─── 범위 필터 ────────────────────────────────────────────────────────────────

/**
 * shippedAt이 from~to 범위 내에 있는지 확인
 * - from: 해당 날짜 00:00:00 이상
 * - to:   해당 날짜 23:59:59 이하
 * @param shippedAt ISO 8601 문자열 (예: "2026-01-03T09:00:00")
 * @param from 'YYYY-MM-DD'
 * @param to   'YYYY-MM-DD'
 */
export function inRange(shippedAt: string, from: string, to: string): boolean {
  // 문자열 비교: ISO 형식 날짜는 사전순 = 시간순
  const dateStr = shippedAt.slice(0, 10); // "YYYY-MM-DD" 부분만 추출
  return dateStr >= from && dateStr <= to;
}

// ─── 통계 집계 ────────────────────────────────────────────────────────────────

/**
 * 기간 + 거래처 필터 후 전체 통계 집계
 * @param shipments 전체 출고 목록
 * @param from 'YYYY-MM-DD'
 * @param to   'YYYY-MM-DD'
 * @param clientId 거래처 ID (생략 시 전체)
 */
export function calcStats(
  shipments: Shipment[],
  from: string,
  to: string,
  clientId?: string,
): Stats {
  // 필터
  const filtered = shipments.filter(
    (s) =>
      inRange(s.shippedAt, from, to) &&
      (clientId == null || s.clientId === clientId),
  );

  // 집계용 맵
  const catMap: Record<string, { qty: number; amount: number }> = {};
  const itemMap: Record<string, { cat: string; qty: number; amount: number }> = {};
  const clientMap: Record<string, { count: number; qty: number; amount: number }> = {};

  let totalQty = 0;
  let totalAmount = 0;

  for (const s of filtered) {
    // 거래처별 카운트 초기화
    if (!clientMap[s.clientId]) {
      clientMap[s.clientId] = { count: 0, qty: 0, amount: 0 };
    }
    clientMap[s.clientId].count += 1;

    for (const item of s.items) {
      const unitPrice = UNIT_PRICES[item.itemName] ?? 0;
      const amount = item.quantity * unitPrice;
      const cat = ITEM_CATEGORY[item.itemName] ?? item.category;

      totalQty += item.quantity;
      totalAmount += amount;

      // 카테고리별
      if (!catMap[cat]) catMap[cat] = { qty: 0, amount: 0 };
      catMap[cat].qty += item.quantity;
      catMap[cat].amount += amount;

      // 품목별
      if (!itemMap[item.itemName]) itemMap[item.itemName] = { cat, qty: 0, amount: 0 };
      itemMap[item.itemName].qty += item.quantity;
      itemMap[item.itemName].amount += amount;

      // 거래처별
      clientMap[s.clientId].qty += item.quantity;
      clientMap[s.clientId].amount += amount;
    }
  }

  // byCategory: CATEGORY_KEYS 순서 유지, qty > 0인 것만
  const byCategory: CategoryRow[] = CATEGORY_KEYS.filter(
    (cat) => catMap[cat]?.qty > 0,
  ).map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    qty: catMap[cat].qty,
    amount: catMap[cat].amount,
    color: CATEGORY_COLORS[cat],
  }));

  // byItem: qty 내림차순
  const byItem: ItemRow[] = Object.entries(itemMap)
    .map(([name, v]) => ({ name, cat: v.cat, qty: v.qty, amount: v.amount }))
    .sort((a, b) => b.qty - a.qty);

  // byClient: 거래처 이름 포함, qty 내림차순
  const clientNameMap: Record<string, string> = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );
  const byClient: ClientRow[] = Object.entries(clientMap)
    .map(([id, v]) => ({
      id,
      name: clientNameMap[id] ?? id,
      count: v.count,
      qty: v.qty,
      amount: v.amount,
    }))
    .sort((a, b) => b.qty - a.qty);

  return {
    count: filtered.length,
    qty: totalQty,
    amount: totalAmount,
    byCategory,
    byItem,
    byClient,
  };
}

// ─── 월별 집계 ────────────────────────────────────────────────────────────────

/**
 * 특정 연도의 월별 수량·금액 집계 (12개월 배열)
 * @param shipments 전체 출고 목록
 * @param year 연도 (예: 2026)
 * @param clientId 거래처 ID (생략 시 전체)
 * @returns month: 1~12, qty, amount
 */
export function calcMonthly(
  shipments: Shipment[],
  year: number,
  clientId?: string,
): MonthlyRow[] {
  const rows: MonthlyRow[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    qty: 0,
    amount: 0,
  }));

  for (const s of shipments) {
    // 연도·거래처 필터
    const dateYear = parseInt(s.shippedAt.slice(0, 4), 10);
    if (dateYear !== year) continue;
    if (clientId != null && s.clientId !== clientId) continue;

    const month = parseInt(s.shippedAt.slice(5, 7), 10); // 1~12
    const row = rows[month - 1];

    for (const item of s.items) {
      const unitPrice = UNIT_PRICES[item.itemName] ?? 0;
      row.qty += item.quantity;
      row.amount += item.quantity * unitPrice;
    }
  }

  return rows;
}

// ─── 월별 카테고리 스택 ───────────────────────────────────────────────────────

/**
 * 카테고리별 월별 수량 집계
 * @returns Record<카테고리키, 12개 월별 qty 배열>
 *   인덱스 0 = 1월, 인덱스 11 = 12월
 */
export function calcMonthlyCategoryStack(
  shipments: Shipment[],
  year: number,
  clientId?: string,
): Record<string, number[]> {
  // 모든 카테고리 키에 대해 12개짜리 0 배열 초기화
  const result: Record<string, number[]> = {};
  for (const cat of CATEGORY_KEYS) {
    result[cat] = new Array(12).fill(0);
  }

  for (const s of shipments) {
    const dateYear = parseInt(s.shippedAt.slice(0, 4), 10);
    if (dateYear !== year) continue;
    if (clientId != null && s.clientId !== clientId) continue;

    const monthIdx = parseInt(s.shippedAt.slice(5, 7), 10) - 1; // 0~11

    for (const item of s.items) {
      const cat = ITEM_CATEGORY[item.itemName] ?? item.category;
      if (result[cat]) {
        result[cat][monthIdx] += item.quantity;
      }
    }
  }

  return result;
}

// ─── 증감률 ───────────────────────────────────────────────────────────────────

/**
 * 현재 값 vs 이전 값 증감률 계산
 * @returns sign: '+' | '-' | '',  pct: '12.3%',  cls: 'up' | 'down' | 'flat'
 */
export function diff(curr: number, prev: number): DiffResult {
  if (prev === 0) {
    if (curr === 0) {
      return { sign: '', pct: '0.0%', cls: 'flat' };
    }
    // 이전이 0이고 현재가 양수이면 신규 발생
    return { sign: '+', pct: '100.0%', cls: 'up' };
  }

  const rate = ((curr - prev) / prev) * 100;

  if (rate > 0) {
    return { sign: '+', pct: `${rate.toFixed(1)}%`, cls: 'up' };
  }
  if (rate < 0) {
    return { sign: '-', pct: `${Math.abs(rate).toFixed(1)}%`, cls: 'down' };
  }
  return { sign: '', pct: '0.0%', cls: 'flat' };
}

/**
 * 기준일에서 n일 오프셋한 'YYYY-MM-DD' 문자열 반환 (순수 함수)
 */
export function offsetDate(base: Date, days: number): string {
  const ms = base.getTime() + days * 86_400_000;
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── 기간 유틸 ────────────────────────────────────────────────────────────────

/** 두 'YYYY-MM-DD' 사이의 일수 (양 끝 포함) */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00').getTime();
  const b = new Date(to + 'T00:00:00').getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

/** 직전 동일 길이 기간 반환. ex) 5/1~5/12 (12일) → 4/19~4/30 */
export function prevPeriod(from: string, to: string): { from: string; to: string } {
  const len = daysBetween(from, to);
  const fromDate = new Date(from + 'T00:00:00');
  const prevTo = offsetDate(fromDate, -1);
  const prevFrom = offsetDate(new Date(prevTo + 'T00:00:00'), -(len - 1));
  return { from: prevFrom, to: prevTo };
}

// ─── 일별 집계 ────────────────────────────────────────────────────────────────

/** from~to 사이 매일자 0으로 채운 후 출고 합산 */
export function calcDaily(
  shipments: Shipment[],
  from: string,
  to: string,
  clientId?: string,
): DailyRow[] {
  const len = daysBetween(from, to);
  const fromDate = new Date(from + 'T00:00:00');
  const rows: DailyRow[] = Array.from({ length: len }, (_, i) => ({
    date: offsetDate(fromDate, i),
    qty: 0,
    amount: 0,
  }));
  const idx: Record<string, DailyRow> = Object.fromEntries(rows.map((r) => [r.date, r]));

  for (const s of shipments) {
    if (clientId != null && s.clientId !== clientId) continue;
    const d = s.shippedAt.slice(0, 10);
    const row = idx[d];
    if (!row) continue;
    for (const item of s.items) {
      const unit = UNIT_PRICES[item.itemName] ?? 0;
      row.qty += item.quantity;
      row.amount += item.quantity * unit;
    }
  }
  return rows;
}

// ─── 범위 월별 집계 (연도 무관, 범위가 걸치는 모든 월) ──────────────────────

export function calcRangeMonthly(
  shipments: Shipment[],
  from: string,
  to: string,
  clientId?: string,
): RangeMonthRow[] {
  const fromY = parseInt(from.slice(0, 4), 10);
  const fromM = parseInt(from.slice(5, 7), 10);
  const toY   = parseInt(to.slice(0, 4), 10);
  const toM   = parseInt(to.slice(5, 7), 10);

  const months: RangeMonthRow[] = [];
  let y = fromY, m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    const ym = `${y}-${pad(m)}`;
    const sameYear = fromY === toY;
    months.push({
      ym,
      label: sameYear ? `${m}월` : `${String(y).slice(2)}/${pad(m)}`,
      qty: 0,
      amount: 0,
    });
    if (m === 12) { m = 1; y += 1; } else { m += 1; }
  }

  const idx: Record<string, RangeMonthRow> = Object.fromEntries(months.map((r) => [r.ym, r]));
  for (const s of shipments) {
    if (clientId != null && s.clientId !== clientId) continue;
    if (!inRange(s.shippedAt, from, to)) continue;
    const ym = s.shippedAt.slice(0, 7);
    const row = idx[ym];
    if (!row) continue;
    for (const item of s.items) {
      const unit = UNIT_PRICES[item.itemName] ?? 0;
      row.qty += item.quantity;
      row.amount += item.quantity * unit;
    }
  }
  return months;
}
