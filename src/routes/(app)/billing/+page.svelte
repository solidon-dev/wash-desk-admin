<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { downloadXlsx } from './excel.js';
	import jsPDF from 'jspdf';
	import autoTable, { type CellHookData, type HookData } from 'jspdf-autotable';
	import type { Cell, Sheet, MergeRegion, ColumnDef } from './excel.js';
	import DatePicker from '../stats/_components/DatePicker.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { ShipoutLog } from './+page.server';

	type InvoiceHistoryItem = {
		id: string;
		period_start: string;
		period_end: string;
		subtotal: number;
		vat: number;
		jeolsa: number;
		total: number;
		status: string;
		created_at: string;
		cancelled_at: string | null;
		snapshot_factory: unknown;
		snapshot_client: unknown;
		invoice_items: { id: string; item_name_ko: string; category_name: string | null; quantity: number; unit_price: number; amount: number; sort_order: number }[];
	};

	type BillingPageData = {
		clients: { id: string; name: string }[];
		selectedClientId: string | null;
		shipoutLogs: ShipoutLog[];
		categories: { id: string; name: string; sort_order: number }[];
		invoiceHistory: InvoiceHistoryItem[];
		[key: string]: unknown;
	};

	let { data }: { data: PageData & BillingPageData } = $props();

	type InvoiceLine    = { category: string; catSortOrder: number; itemName: string; itemSortOrder: number; quantity: number; unitPrice: number; amount: number; priceFrom: string | null; priceTo: string | null; };
	type ShipmentItem   = { itemName: string; category: string; itemSortOrder: number; quantity: number; unitPrice: number; priceFrom: string | null; priceTo: string | null; };
	type Shipment       = { id: string; clientId: string; shippedAt: string; items: ShipmentItem[] };

	// 카테고리 동적 색상 팔레트
	const CAT_COLORS = [
		{ bg: 'E0F2FE', font: '0369A1', itemBg: 'F0F9FF', itemFont: '075985' },  // blue
		{ bg: 'E0E7FF', font: '4338CA', itemBg: 'EEF2FF', itemFont: '3730A3' },  // indigo
		{ bg: 'FEF3C7', font: '92400E', itemBg: 'FFFBEB', itemFont: '78350F' },  // amber
		{ bg: 'DCFCE7', font: '166534', itemBg: 'F0FDF4', itemFont: '15803D' },  // green
		{ bg: 'FCE7F3', font: '9D174D', itemBg: 'FDF2F8', itemFont: '831843' },  // pink
	];
	function getCatColor(idx: number) { return CAT_COLORS[idx % CAT_COLORS.length]; }

	// 카테고리 인덱스 맵 (sort_order 기준)
	const catIndexMap = $derived(new SvelteMap(data.categories.map((c, i) => [c.name, i])));

	const clients = $derived(data.clients);

	let selectedClientId = $state<string>('');
	$effect.pre(() => {
		selectedClientId = data.selectedClientId ?? data.clients[0]?.id ?? '';
	});

	// shipoutLogs → Shipment[] 변환
	const shipments = $derived.by((): Shipment[] => {
		const map = new SvelteMap<string, Shipment>();
		for (const log of data.shipoutLogs) {
			if (!map.has(log.shipout_id)) {
				map.set(log.shipout_id, {
					id: log.shipout_id,
					clientId: selectedClientId,
					shippedAt: log.processed_at,
					items: [],
				});
			}
			map.get(log.shipout_id)!.items.push({
					itemName:      log.item_name_ko,
					category:      log.category_name,
					itemSortOrder: log.item_sort_order,
					quantity:      log.quantity,
					unitPrice:     log.unit_price,
					priceFrom:     log.price_from ?? null,
					priceTo:       log.price_to ?? null,
				});
		}
		return Array.from(map.values());
	});



	function buildInvoiceLines(clientId: string, from: string, to: string): InvoiceLine[] {
		const fromTs = new Date(from + 'T00:00:00').getTime();
		const toTs = new Date(to + 'T23:59:59').getTime();
		const inRange = shipments.filter(s => {
			if (s.clientId !== clientId) return false;
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs;
		});
		const catSortMap = new Map(data.categories.map((c, i) => [c.name, i]));
		// key = category + itemName + unitPrice (단가가 다르면 별도 행)
		const map: Record<string, InvoiceLine> = {};
		for (const s of inRange) {
			for (const item of s.items) {
				const key = item.category + '__' + item.itemName + '__' + item.unitPrice;
				if (!map[key]) map[key] = {
					category:      item.category,
					catSortOrder:  catSortMap.get(item.category) ?? 99,
					itemName:      item.itemName,
					itemSortOrder: item.itemSortOrder,
					quantity:  0,
					unitPrice: item.unitPrice,
					amount:    0,
					priceFrom: item.priceFrom,
					priceTo:   item.priceTo,
				};
				map[key].quantity += item.quantity;
				map[key].amount += item.quantity * map[key].unitPrice;
			}
		}
		return Object.values(map).sort((a, b) => {
			const co = a.catSortOrder - b.catSortOrder;
			return co !== 0 ? co : a.itemSortOrder - b.itemSortOrder;
		});
	}

	// ── 포맷 함수 ──
	function formatDate(d: string) { return d.replace(/-/g, '.').slice(0, 10); }
	function formatMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }
	function formatPriceRange(from: string | null, to: string | null): string {
		const f = from ? from.slice(5).replace('-', '.') : null;
		const t = to   ? to.slice(5).replace('-', '.')   : null;
		if (f && t)  return `${f}~${t}`;
		if (f && !t) return `${f}~`;
		if (!f && t) return `~${t}`;
		return '';
	}

	// ── 탭 ──
	type BillingTab = 'invoice' | 'statement' | 'history';
	const tabState = $state({ active: 'invoice' as BillingTab });
	function switchTab(t: BillingTab) { tabState.active = t; }

	// ── 거래처 선택 ──
	const selectedClient = $derived(data.clients.find((c) => c.id === selectedClientId) ?? null);

	function selectClient(id: string) {
		selectedClientId = id;
		const url = new URL(window.location.href);
		url.searchParams.set('clientId', id);
		history.replaceState({}, '', url.toString());
		invalidateAll();
	}

	// ── 기간 설정 (공통): 오늘 기준 전달 동일+1일 ~ 오늘
	function calcDefaultPeriod(): { from: string; to: string } {
		function pad(n: number) { return String(n).padStart(2, '0'); }
		function ymd(ms: number): string {
			const d = new Date(ms);
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		}
		const todayMs = Date.now();
		const toStr   = ymd(todayMs);
		// 전달 동일+1일: 현재 날짜에서 30일을 비운 후 Date로 연산
		const d    = new Date(todayMs);
		const y    = d.getFullYear();
		const m    = d.getMonth(); // 0-based
		const day  = d.getDate();
		// 전달 동일+1: Date 생성시에 월만 비우고 날짜는 유지
		const prevM   = m === 0 ? 11 : m - 1;
		const prevY   = m === 0 ? y - 1 : y;
		const lastDay = new Date(prevY, prevM + 1, 0).getDate(); // 전달 마지막 날
		const fromDay = Math.min(day + 1, lastDay);
		const fromStr = `${prevY}-${pad(prevM + 1)}-${pad(fromDay)}`;
		return { from: fromStr, to: toStr };
	}
	const { from: _defaultFrom, to: _defaultTo } = calcDefaultPeriod();
	let periodFrom = $state(_defaultFrom);
	let periodTo   = $state(_defaultTo);

	// ── DatePicker 상태 ──
	let pickerShow   = $state(false);
	let pickerTarget = $state<'from' | 'to'>('from');
	function openPicker(t: 'from' | 'to') { pickerTarget = t; pickerShow = true; }
	function onPickerSelect(_t: 'from' | 'to' | 'single', ymd: string) {
		if (pickerTarget === 'from') periodFrom = ymd;
		else periodTo = ymd;
		pickerShow = false;
	}

	// ── 청구서 미리보기 데이터 ──
	const invoiceLines = $derived.by((): InvoiceLine[] => {
		if (!selectedClientId || !periodFrom || !periodTo) return [];
		return buildInvoiceLines(selectedClientId, periodFrom, periodTo);
	});

	const invoiceTotal    = $derived(invoiceLines.reduce((s, l) => s + l.amount,   0));
	const invoiceTotalQty = $derived(invoiceLines.reduce((s, l) => s + l.quantity, 0));

	const invoiceByCategory = $derived.by(() => {
		const cats: Record<string, { qty: number; amount: number }> = {};
		for (const line of invoiceLines) {
			if (!cats[line.category]) cats[line.category] = { qty: 0, amount: 0 };
			cats[line.category].qty    += line.quantity;
			cats[line.category].amount += line.amount;
		}
		return cats;
	});

	const unpricedCount = $derived(invoiceLines.filter((l) => l.unitPrice === 0).length);

	// ── 거래내역서 뷰 모드 ──
	type StmtViewMode = 'pivot' | 'daily';
	let stmtViewMode = $state<StmtViewMode>('pivot');

	// 피벗 스크롤 컨테이너 너비 (bind:clientWidth)
	let pivotScrollWidth = $state(0);

	// 날짜 열 1개 너비(px) — 항상 "31일 기준"으로 계산
	// 31일 이하: 컨테이너를 꽉 채우는 너비, 31일 초과: 이 너비 고정 → 가로 스크롤
	const pivotDateColWidth = $derived.by(() => {
		if (!statementData || pivotScrollWidth === 0) return 28;
		const FIXED_PX = (5.2 + 7.5 + 3.8) * 11; // 구분 + 품목명 + 합계 (font-size: 11px 기준)
		const availPx = Math.max(31 * 24, pivotScrollWidth - FIXED_PX - 2); // 최소 24px * 31
		return Math.max(24, availPx / 31);
	});

	// ── 거래내역서 데이터 (품목=세로/날짜=가로 구조) ──
	type StmtRow      = { category: string; itemName: string; key: string; quantities: number[]; dateQtys: number[]; total: number };
	type StmtCatGroup = { category: string; label: string; startIdx: number; count: number };
	type StmtDailyItem = { category: string; itemName: string; quantity: number };
	type StmtDailyRow  = { date: string; items: StmtDailyItem[]; total: number };
	type StmtData     = {
		rows:       StmtRow[];
		catGroups:  StmtCatGroup[];
		dailyRows:  StmtDailyRow[];
		dates:      string[];           // periodFrom~periodTo 전체 날짜 (YYYY-MM-DD)
		dateLabels: string[];           // 화면 표시 라벨 (단일월: "15", 복수월: "3/15")
		dayTotals:  number[];           // 1~31일 합계 (31개 고정, print/Excel)
		dateTotals: number[];           // dates 기반 합계 (screen pivot)
		catTotals:  Record<string, number>;
		grandTotal: number;
		activeDays: number;             // 실제 출고 있는 날짜 수
	};

	const statementData = $derived.by((): StmtData | null => {
		if (!selectedClientId || !periodFrom || !periodTo) return null;

		const fromTs = new Date(periodFrom + 'T00:00:00').getTime();
		const toTs   = new Date(periodTo   + 'T23:59:59').getTime();

		const ships = shipments.filter((s) => {
			if (s.clientId !== selectedClientId) return false;
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs;
		});

		if (ships.length === 0) return null;

		// dates 배열 생성 (periodFrom ~ periodTo 전체)
		const dates: string[] = [];
		{
			let ts = new Date(periodFrom + 'T00:00:00').getTime();
			const endTs = new Date(periodTo + 'T00:00:00').getTime();
			while (ts <= endTs) {
				const d2 = new Date(ts);
				const y = d2.getFullYear();
				const m = String(d2.getMonth() + 1).padStart(2, '0');
				const d = String(d2.getDate()).padStart(2, '0');
				dates.push(`${y}-${m}-${d}`);
				ts += 86400000;
			}
		}

		// dateLabels 생성
		const fromMonth  = periodFrom.slice(0, 7);
		const toMonth    = periodTo.slice(0, 7);
		const singleMonth = fromMonth === toMonth;
		const dateLabels = dates.map(d =>
			singleMonth ? String(parseInt(d.slice(8, 10))) : `${parseInt(d.slice(5, 7))}/${d.slice(8, 10)}`
		);

		// 고유 품목 수집
		const itemSet: Record<string, { category: string; itemName: string; itemSortOrder: number }> = {};
		for (const s of ships) {
			for (const item of s.items) {
				const key = `${item.category}__${item.itemName}`;
				if (!itemSet[key]) itemSet[key] = { category: item.category, itemName: item.itemName, itemSortOrder: item.itemSortOrder };
			}
		}

		// 카테고리 sort_order → 품목 sort_order 순으로 정렬
		const catSortMap = new Map(data.categories.map((c, i) => [c.name, i]));
		const itemList = Object.entries(itemSet)
			.map(([key, v]) => ({ key, ...v }))
			.sort((a, b) => {
				const co = (catSortMap.get(a.category) ?? 99) - (catSortMap.get(b.category) ?? 99);
				return co !== 0 ? co : a.itemSortOrder - b.itemSortOrder;
			});

		// 카테고리 그룹 계산 (행 방향)
		const catGroups: StmtCatGroup[] = [];
		let lastCat = '';
		for (let i = 0; i < itemList.length; i++) {
			const cat = itemList[i].category;
			if (cat !== lastCat) {
				catGroups.push({ category: cat, label: cat, startIdx: i, count: 1 });
				lastCat = cat;
			} else {
				catGroups[catGroups.length - 1].count++;
			}
		}

		// 품목별 × 날짜(YYYY-MM-DD) 집계
		const byItemDate: Record<string, Record<string, number>> = {};
		const byDate: Record<string, Record<string, number>> = {};
		for (const s of ships) {
			const date = s.shippedAt.slice(0, 10);
			if (!byDate[date]) byDate[date] = {};
			for (const item of s.items) {
				const key = `${item.category}__${item.itemName}`;
				if (!byItemDate[key]) byItemDate[key] = {};
				byItemDate[key][date] = (byItemDate[key][date] ?? 0) + item.quantity;
				byDate[date][key]     = (byDate[date][key]     ?? 0) + item.quantity;
			}
		}

		// 품목별 rows
		const rows: StmtRow[] = itemList.map((item) => {
			const dm = byItemDate[item.key] ?? {};
			const dateQtys = dates.map(d => dm[d] ?? 0);
			// print/Excel용 quantities (31개 고정)
			const dm31: Record<number, number> = {};
			for (const [d, q] of Object.entries(dm)) {
				const day = parseInt(d.slice(8, 10), 10);
				dm31[day] = (dm31[day] ?? 0) + q;
			}
			const quantities = Array.from({ length: 31 }, (_, i) => dm31[i + 1] ?? 0);
			const total = dateQtys.reduce((s, n) => s + n, 0);
			return { ...item, quantities, dateQtys, total };
		});

		// 날짜(1~31일) 합계 (print/Excel용)
		const dayTotals = Array.from({ length: 31 }, (_, i) =>
			rows.reduce((s, r) => s + r.quantities[i], 0)
		);

		// dates 기반 합계 (screen pivot용)
		const dateTotals = dates.map((_, i) => rows.reduce((s, r) => s + r.dateQtys[i], 0));

		// 카테고리별 총합
		const catTotals: Record<string, number> = {};
		for (const row of rows) {
			catTotals[row.category] = (catTotals[row.category] ?? 0) + row.total;
		}
		const grandTotal = rows.reduce((s, r) => s + r.total, 0);

		// 일별 상세 rows
		const activeDateKeys = Object.keys(byDate).sort();
		const dailyRows: StmtDailyRow[] = activeDateKeys.map((date) => {
			const dm = byDate[date];
			const items: StmtDailyItem[] = [];
			for (const item of itemList) {
				const qty = dm[item.key] ?? 0;
				if (qty > 0) items.push({ category: item.category, itemName: item.itemName, quantity: qty });
			}
			const total = items.reduce((s, it) => s + it.quantity, 0);
			return { date, items, total };
		});

		return { rows, catGroups, dailyRows, dates, dateLabels, dayTotals, dateTotals, catTotals, grandTotal, activeDays: activeDateKeys.length };
	});

	// ── 인쇄 / PDF ──


	// ── 공급자 정보 (로컬스토리지 지속) ──
	const SUPPLIER_DEFAULT = {
		regNo:   '233-87-00260',
		name:    '㎌아람씨앤큐',
		ceo:     '문창배',
		address: '제주특별자치도 제주시 애월읍 납읍동 2길 16',
		bizType: '서비스',
		bizItem: '세탁업',
		tel:     '064) 799 - 3211',
		bank:    '농협 301-3119-3577-71',
	};
	function loadSupplier() {
		try {
			const saved = localStorage.getItem('washdesk_supplier');
			return saved ? { ...SUPPLIER_DEFAULT, ...JSON.parse(saved) } : { ...SUPPLIER_DEFAULT };
		} catch { return { ...SUPPLIER_DEFAULT }; }
	}
	function saveSupplier(s: typeof SUPPLIER_DEFAULT) {
		try { localStorage.setItem('washdesk_supplier', JSON.stringify(s)); } catch (e) { console.warn(e); }
	}

	// ── PDF 미리보기 모달 상태 ──
	let showSupplierModal = $state(false);
	let supplierEdit = $state(loadSupplier());

	let showPdfModal  = $state(false);
	let pdfBlobUrl    = $state<string | null>(null);
	let pdfGenerating = $state(false);
	let issuingInvoice = $state(false);
	let invoiceHistory = $derived((data as BillingPageData).invoiceHistory ?? []);
	let historyPdfModal = $state(false);
	let historyPdfUrl   = $state<string | null>(null);
	let historyPdfLoading = $state(false);

	// 삭제 확인 모달
	let deleteConfirmModal = $state(false);
	let deleteTargetId     = $state<string | null>(null);
	let deleteLoading      = $state(false);
	let localDeletedIds    = $state(new Set<string>());
	let filteredHistory    = $derived(invoiceHistory.filter(inv => !localDeletedIds.has(inv.id)));

	// 폰트 캐시 (최초 1회 fetch 후 재사용)
	let _fontCache: { reg: string; bold: string } | null = null;
	async function loadFonts(): Promise<{ reg: string; bold: string }> {
		if (_fontCache) return _fontCache;
		const [regResp, boldResp] = await Promise.all([
			fetch('/NanumGothic-Regular.ttf'),
			fetch('/NanumGothic-Bold.ttf'),
		]);
		if (!regResp.ok)  throw new Error('폰트 로드 실패(Regular)');
		if (!boldResp.ok) throw new Error('폰트 로드 실패(Bold)');
		const [regBuf, boldBuf] = await Promise.all([regResp.arrayBuffer(), boldResp.arrayBuffer()]);
		_fontCache = { reg: arrayBufferToBase64(regBuf), bold: arrayBufferToBase64(boldBuf) };
		return _fontCache;
	}

	function openSupplierThenPdf() {
		if (!selectedClient || invoiceLines.length === 0) return;
		supplierEdit = loadSupplier();
		showSupplierModal = true;
	}

	// 페이지 로드 시 폰트 미리 캐싱
	$effect(() => { loadFonts().catch(() => {}); });

	async function confirmSupplierAndPdf() {
		saveSupplier(supplierEdit);
		showSupplierModal = false;
		pdfGenerating = true;
		showPdfModal  = true;
		pdfBlobUrl    = null;
		await tick();
		try {
			const blobUrl = await generateInvoicePdf({
				supplier: supplierEdit,
				clientName: selectedClient?.name ?? '',
				periodFrom,
				periodTo,
				lines: invoiceLines,
				supplyAmount: invoiceTotal,
			});
			pdfBlobUrl = blobUrl;

			// DB 저장 — 텍스트 데이터만 전송
			issuingInvoice = true;
			try {
				const supplyAmount = invoiceTotal;
				const vatRaw = Math.floor(supplyAmount * 0.1);
				const vat    = Math.floor(vatRaw / 10) * 10;
				const jeolsa = vatRaw - vat;
				const total  = supplyAmount + vat;

				const fd = new FormData();
				fd.append('client_id',        selectedClientId);
				fd.append('period_from',       periodFrom);
				fd.append('period_to',         periodTo);
				fd.append('subtotal',          String(supplyAmount));
				fd.append('vat',               String(vat));
				fd.append('jeolsa',            String(jeolsa));
				fd.append('total',             String(total));
				fd.append('snapshot_factory',  JSON.stringify(supplierEdit));
				fd.append('snapshot_client',   JSON.stringify({ id: selectedClientId, name: selectedClient?.name ?? '' }));
				fd.append('items',             JSON.stringify(invoiceLines));

				const res  = await fetch('?/issueInvoice', { method: 'POST', body: fd });
				const json = await res.json();
				if (!res.ok || json?.type === 'failure') {
					console.error('청구서 저장 실패:', json);
				} else {
					await invalidateAll();
				}
			} catch (e) {
				console.error('청구서 저장 중 오류:', e);
			} finally {
				issuingInvoice = false;
			}
		} finally {
			pdfGenerating = false;
		}
	}

	async function openPdfModal() {
		openSupplierThenPdf();
	}

	function closePdfModal() {
		showPdfModal = false;
		if (pdfBlobUrl) {
			URL.revokeObjectURL(pdfBlobUrl);
			pdfBlobUrl = null;
		}
	}

	// ArrayBuffer → Base64 안전 변환 (스택 오버플로우 방지)
	function arrayBufferToBase64(buffer: ArrayBuffer): string {
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const chunkSize = 8192;
		for (let i = 0; i < bytes.length; i += chunkSize) {
			binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
		}
		return btoa(binary);
	}

	function downloadPdf() {
		if (!pdfBlobUrl || !selectedClient) return;
		const a = document.createElement('a');
		a.href = pdfBlobUrl;
		a.download = `청구서_${selectedClient.name}_${periodFrom}~${periodTo}.pdf`;
		a.click();
	}

	type PdfParams = {
		supplier: typeof SUPPLIER_DEFAULT;
		clientName: string;
		periodFrom: string;
		periodTo: string;
		lines: InvoiceLine[];
		supplyAmount: number;
	};

	async function generateInvoicePdf(params: PdfParams): Promise<string> {
		const { supplier: SUPPLIER, clientName, periodFrom: pFrom, periodTo: pTo, lines, supplyAmount } = params;
		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

		// ── 나눔고딕 캐시에서 로드 ──
		const fonts = await loadFonts();
		doc.addFileToVFS('NanumGothic-Regular.ttf', fonts.reg);
		doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
		doc.addFileToVFS('NanumGothic-Bold.ttf', fonts.bold);
		doc.addFont('NanumGothic-Bold.ttf', 'NanumGothic', 'bold');

		const pageW   = doc.internal.pageSize.getWidth(); // 210mm
		const margin  = 12;
		const cW      = pageW - margin * 2; // 186mm
		let   y       = margin;

		// ── 금액 계산 ──
		const vatRaw     = Math.floor(supplyAmount * 0.1);
		const vat        = Math.floor(vatRaw / 10) * 10;   // 10원 미만 절사
		const jeolsa     = vatRaw - vat;                    // 절사액 (양수, 표시는 음수)
		const grandTotal = supplyAmount + vat;

		// ═══════════════════════════════════════
		// 1. 제목
		// ═══════════════════════════════════════
		// ── 제목 텍스트: YYYY년 MM월 청구서 ──
		const titleDate = (() => {
			const d = new Date(pTo + 'T00:00:00');
			return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
		})();
		doc.setFillColor(10, 36, 99);
		doc.rect(margin, y, cW, 13, 'F');
		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(15);
		doc.setTextColor(255, 255, 255);
		doc.text(`${titleDate}  청  구  서`, pageW / 2, y + 9, { align: 'center' });
		y += 17;

		// ═══════════════════════════════════════
		// 2. 헤더: 좌(수신자) | 우(공급자)
		// ═══════════════════════════════════════
		const leftW  = cW * 0.38;       // ~70.7mm
		const rightW = cW - leftW;      // ~115.3mm
		const rightX = margin + leftW;
		const hdrH   = 54;

		// 외곽 사각형
		doc.setDrawColor(150, 165, 195);
		doc.setLineWidth(0.4);
		doc.rect(margin, y, cW, hdrH);
		// 좌우 세로 구분선
		doc.line(rightX, y, rightX, y + hdrH);

		// ─ 좌측: 날짜 / 수신자 / 청구 안내 ─
		const dateStr = (() => {
			const d = new Date(pTo + 'T00:00:00');
			return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
		})();
		doc.setFont('NanumGothic', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(75, 90, 115);
		doc.text(dateStr, margin + 5, y + 10);

		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(13);
		doc.setTextColor(10, 20, 45);
		doc.text(clientName || '-', margin + 5, y + 24);
		doc.setFontSize(10);
		doc.text('귀하', margin + 5, y + 33);

		doc.setFont('NanumGothic', 'normal');
		doc.setFontSize(8.5);
		doc.setTextColor(75, 90, 115);
		doc.text('아래와 같이 청구합니다.', margin + 5, y + 46);

		// ─ 우측: 공급자 정보 ─
		const ROW_COUNT  = 6;
		const sRowH      = hdrH / ROW_COUNT; // 9mm
		const labelColW  = 16;

		// 공급자 헤더 바
		doc.setFillColor(230, 237, 255);
		doc.rect(rightX, y, rightW, sRowH, 'F');
		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(30, 50, 120);
		doc.text('공  급  자', rightX + rightW / 2, y + sRowH * 0.72, { align: 'center' });

		// 가로 구분선 (1줄~5줄)
		doc.setDrawColor(190, 205, 225);
		doc.setLineWidth(0.2);
		for (let i = 1; i <= 5; i++) {
			doc.line(rightX, y + sRowH * i, rightX + rightW, y + sRowH * i);
		}
		// 라벨 | 값 세로선
		doc.line(rightX + labelColW, y + sRowH, rightX + labelColW, y + hdrH);

		const supplierRows = [
			{ label: '등록번호', v1: SUPPLIER.regNo,    l2: '',        v2: '' },
			{ label: '상호명',   v1: SUPPLIER.name,    l2: '성  명', v2: SUPPLIER.ceo },
			{ label: '주    소', v1: SUPPLIER.address, l2: '',        v2: '' },
			{ label: '업    태', v1: SUPPLIER.bizType, l2: '종    목', v2: SUPPLIER.bizItem },
			{ label: 'TEL',      v1: SUPPLIER.tel,     l2: '',        v2: '' },
		];
		const label2ColW = 14; // 2번째 라벨 열 너비
		supplierRows.forEach((row, i) => {
			const ry = y + sRowH * (i + 1) + sRowH * 0.68;
			// 1번째 라벨
			doc.setFont('NanumGothic', 'bold');
			doc.setFontSize(6.5);
			doc.setTextColor(100, 116, 145);
			doc.text(row.label, rightX + labelColW / 2, ry, { align: 'center' });

			if (row.l2) {
				// 2열 구조: [라벨1][값1 절반] | [라벨2][값2 절반]
				const halfX = rightX + labelColW + (rightW - labelColW) * 0.5;
				// 중간 세로선
				doc.setDrawColor(190, 205, 225);
				doc.setLineWidth(0.2);
				doc.line(halfX, y + sRowH * (i + 1), halfX, y + sRowH * (i + 2));
				// 2번째 라벨 세로선
				doc.line(halfX + label2ColW, y + sRowH * (i + 1), halfX + label2ColW, y + sRowH * (i + 2));
				// 값1
				doc.setFont('NanumGothic', 'normal');
				doc.setFontSize(7.5);
				doc.setTextColor(15, 25, 55);
				doc.text(row.v1, rightX + labelColW + 2, ry);
				// 2번째 라벨
				doc.setFont('NanumGothic', 'bold');
				doc.setFontSize(6.5);
				doc.setTextColor(100, 116, 145);
				doc.text(row.l2, halfX + label2ColW / 2, ry, { align: 'center' });
				// 값2
				doc.setFont('NanumGothic', 'normal');
				doc.setFontSize(7.5);
				doc.setTextColor(15, 25, 55);
				doc.text(row.v2, halfX + label2ColW + 2, ry);
			} else {
				// 1열 구조: 값1 전체
				doc.setFont('NanumGothic', 'normal');
				doc.setFontSize(7.5);
				doc.setTextColor(15, 25, 55);
				doc.text(row.v1, rightX + labelColW + 2, ry);
			}
		});
		y += hdrH + 4;

		// ═══════════════════════════════════════
		// 3. 청구금액 요약 바
		// ═══════════════════════════════════════
		doc.setFillColor(236, 244, 255);
		doc.setDrawColor(130, 175, 240);
		doc.setLineWidth(0.35);
		doc.rect(margin, y, cW, 11, 'FD');
		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(70, 105, 165);
		doc.text('청구금액', margin + 5, y + 7.2);
		doc.setFontSize(13);
		doc.setTextColor(10, 36, 140);
		doc.text(`${grandTotal.toLocaleString()} 원`, pageW / 2, y + 7.5, { align: 'center' });
		doc.setFontSize(7.5);
		doc.setTextColor(100, 125, 160);
		doc.text(`청구기간: ${pFrom} ~ ${pTo}`, margin + cW - 3, y + 7.2, { align: 'right' });
		y += 15;

		// ═══════════════════════════════════════
		// 4. 품목 테이블
		// ═══════════════════════════════════════
		const catLabelMap: Record<string, string> = Object.fromEntries(data.categories.map(c => [c.name, c.name]));
		const col1 = 24; const col2 = 20; const col3 = 36; const col4 = 40;
		const col0 = cW - col1 - col2 - col3 - col4;
		const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
		autoTable(doc, {
			startY: y,
			margin: { left: margin, right: margin },
			head: [['품목명', '구분', '수량', '단가', '금액']],
			body: lines.map(l => {
				const hasDup = lines.filter(x => x.itemName === l.itemName).length > 1;
				const rangeLabel = formatPriceRange(l.priceFrom, l.priceTo);
				const nameCell = hasDup && rangeLabel ? `${l.itemName} (${rangeLabel})` : l.itemName;
				return [
					nameCell,
					catLabelMap[l.category] ?? l.category,
					l.quantity.toLocaleString(),
					l.unitPrice > 0 ? `${l.unitPrice.toLocaleString()} 원` : '-',
					`${l.amount.toLocaleString()} 원`,
				];
			}),
			foot: [['품목합계', '', totalQty.toLocaleString(), '', `${supplyAmount.toLocaleString()} 원`]],
			showFoot: 'lastPage',
			styles:            { font: 'NanumGothic', fontSize: 8, valign: 'middle' },
			headStyles:        { fillColor: [225, 232, 245], textColor: [60, 80, 130], fontStyle: 'bold', fontSize: 8 },
			bodyStyles:        { textColor: [40, 55, 80], fontStyle: 'normal' },
			footStyles:        { fillColor: [236, 244, 255], textColor: [10, 36, 140], fontStyle: 'bold', fontSize: 9 },
			alternateRowStyles:{ fillColor: [248, 251, 255] },
			columnStyles: {
				0: { cellWidth: col0 },
				1: { cellWidth: col1 },
				2: { cellWidth: col2 },
				3: { cellWidth: col3 },
				4: { cellWidth: col4 },
			},
			didParseCell: (data: CellHookData) => {
				data.cell.styles.font = 'NanumGothic';
				if (data.column.index === 0) data.cell.styles.halign = 'left';
				if (data.column.index === 1) data.cell.styles.halign = 'center';
				if (data.column.index >= 2)  data.cell.styles.halign = 'right';
			},
			didDrawPage: (data: HookData) => { y = data.cursor?.y ?? y; },
		});

		const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
		let fy = finalY + 6;

		// ═══════════════════════════════════════
		// 5. 청구 구조 + VAT 요약 (차우 배치)
		// ═══════════════════════════════════════
		const sumTblW  = 90;                         // 요약 표 너비
		const sumTblX  = margin + cW - sumTblW;      // 오른쪽 정렬
		const sumLabelW = 38;
		const sumRowH  = 7.5;
		const sumRows  = [
			{ label: '공급가액',   value: supplyAmount.toLocaleString() + ' 원', bold: false },
			{ label: '절  사',   value: jeolsa > 0 ? `-${jeolsa}` : '-',          bold: false },
			{ label: 'VAT (10%)', value: vat.toLocaleString() + ' 원',          bold: false },
			{ label: '총계 금액', value: grandTotal.toLocaleString() + ' 원',  bold: true  },
		];

		// 계좌번호 (좌측)
		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(8.5);
		doc.setTextColor(10, 36, 140);
		doc.text(`입금계좌: ${SUPPLIER.bank}  ${SUPPLIER.name}`, margin, fy + 5);

		// 요약 표
		sumRows.forEach((row, i) => {
			const rx = sumTblX;
			const ry = fy + i * sumRowH;
			// 배경
			doc.setFillColor(
				row.bold ? 224 : 245,
				row.bold ? 236 : 249,
				row.bold ? 255 : 255,
			);
			doc.rect(rx, ry, sumTblW, sumRowH, 'F');
			// 테두리
			doc.setDrawColor(row.bold ? 100 : 190, row.bold ? 140 : 210, row.bold ? 220 : 235);
			doc.setLineWidth(row.bold ? 0.5 : 0.2);
			doc.rect(rx, ry, sumTblW, sumRowH);
			// 세로 구분선
			doc.line(rx + sumLabelW, ry, rx + sumLabelW, ry + sumRowH);
			// 라벨
			doc.setFont('NanumGothic', row.bold ? 'bold' : 'normal');
			doc.setFontSize(8);
			doc.setTextColor(row.bold ? 10 : 75, row.bold ? 36 : 90, row.bold ? 140 : 125);
			doc.text(row.label, rx + sumLabelW / 2, ry + sumRowH * 0.68, { align: 'center' });
			// 값
			doc.setFont('NanumGothic', row.bold ? 'bold' : 'normal');
			doc.setFontSize(row.bold ? 9 : 8);
			doc.setTextColor(row.bold ? 10 : 30, row.bold ? 36 : 45, row.bold ? 140 : 80);
			doc.text(row.value, rx + sumTblW - 4, ry + sumRowH * 0.68, { align: 'right' });
		});

		fy += sumRows.length * sumRowH + 8;

		// ── 푸터 ──
		doc.setDrawColor(210, 220, 235);
		doc.setLineWidth(0.3);
		doc.line(margin, fy, margin + cW, fy);
		fy += 5;
		// 회사명 좌측
		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(8);
		doc.setTextColor(30, 50, 110);
		doc.text(SUPPLIER.name, margin, fy);
		// TEL 중앙
		doc.setFont('NanumGothic', 'normal');
		doc.setFontSize(7);
		doc.setTextColor(110, 125, 150);
		doc.text(`TEL. ${SUPPLIER.tel}`, pageW / 2, fy, { align: 'center' });
		// 주소 우측
		doc.text(SUPPLIER.address, margin + cW, fy, { align: 'right' });
		fy += 5;
		// 구분선
		doc.setDrawColor(225, 232, 245);
		doc.setLineWidth(0.2);
		doc.line(margin, fy, margin + cW, fy);
		fy += 4;
		doc.setFont('NanumGothic', 'normal');
		doc.setFontSize(6.5);
		doc.setTextColor(185, 195, 215);
		doc.text(`사업자등록번호 ${SUPPLIER.regNo}  |  대표 ${SUPPLIER.ceo}  |  ${SUPPLIER.bizType} / ${SUPPLIER.bizItem}`, pageW / 2, fy, { align: 'center' });

		return URL.createObjectURL(doc.output('blob'));
	}

	// ── 거래내역서 엑셀 내보내기 ──
	function exportStatementExcel() {
		const sd = statementData;
		if (!sd || !selectedClient) return;

		const clientName = selectedClient.name;
		const period = `${periodFrom}~${periodTo}`;
		const filename = `거래내역서_${clientName}_${period}.xlsx`;

		// ── 스타일 정의 ──
		const S_TITLE:    Cell['style'] = { bold: true, fontSize: 16, align: 'center', fontColor: '0F172A' };
		const S_META:     Cell['style'] = { fontSize: 10, align: 'center', fontColor: '64748B' };
		// 동적 카테고리 스타일 빌더 (exportStatementExcel 내부에서도 사용)
		const getCatHeadStyle = (catName: string): Cell['style'] => {
			const idx = catIndexMap.get(catName) ?? 0;
			const c = getCatColor(idx);
			return { bold: true, fontSize: 10, align: 'center', bgColor: c.bg, fontColor: c.font, border: true };
		};
		const getItemHeadStyle = (catName: string): Cell['style'] => {
			const idx = catIndexMap.get(catName) ?? 0;
			const c = getCatColor(idx);
			return { bold: true, fontSize: 9, align: 'left', bgColor: c.itemBg, fontColor: c.itemFont, border: true, wrapText: true };
		};
		const getCellStyle = (catName: string): Cell['style'] => {
			const idx = catIndexMap.get(catName) ?? 0;
			const c = getCatColor(idx);
			return { fontSize: 9, align: 'center', fontColor: c.font, border: true, numFmt: '#,##0' };
		};
		const S_DAY_HEAD:      Cell['style'] = { bold: true, fontSize: 9,  align: 'center', bgColor: 'F8FAFC', fontColor: '334155', border: true };
		const S_SUBTOTAL_HEAD: Cell['style'] = { bold: true, fontSize: 9,  align: 'center', bgColor: 'F1F5F9', fontColor: '475569', border: true };
		const S_CELL_EMPTY:   Cell['style'] = { fontSize: 9, align: 'center', fontColor: 'E2E8F0', border: true };
		const S_SUBTOTAL_VAL: Cell['style'] = { bold: true, fontSize: 9,  align: 'center', bgColor: 'F1F5F9', fontColor: '334155', border: true, numFmt: '#,##0' };
		const S_FOOT_LABEL:   Cell['style'] = { bold: true, fontSize: 9,  align: 'center', bgColor: 'EEF2FF', fontColor: '334155', border: true };

		const S_FOOT_GRAND:   Cell['style'] = { bold: true, fontSize: 11, align: 'center', bgColor: 'EEF2FF', fontColor: '4338CA', border: true, borderThick: true, numFmt: '#,##0' };
		const S_SUMMARY_LABEL: Cell['style'] = { bold: true, fontSize: 10, align: 'left', bgColor: 'F8FAFC', fontColor: '475569', border: true };

		// ── 레이아웃 상수 ──
		// 열 구성: 카테고리(1) + 품목명(1) + 1~31일(31) + 합계(1) = 34열
		const TOTAL_COLS = 34;

		// ── 열 너비 ──
		const xlsColumns: ColumnDef[] = [
			{ width: 8 },    // 카테고리
			{ width: 14 },   // 품목명
			...Array(31).fill({ width: 4.5 }),  // 1~31일
			{ width: 7 },    // 합계
		];

		// ── 병합 영역 ──
		const merges: MergeRegion[] = [];
		let R = 1;
		const sheetRows: Sheet['rows'] = [];

		// 행1: 제목
		sheetRows.push({ cells: [
			{ value: '세 탁 거 래 내 역 서', style: S_TITLE },
			...Array(TOTAL_COLS - 1).fill({ value: '', style: S_TITLE }),
		], height: 30 });
		merges.push({ r1: R, c1: 1, r2: R, c2: TOTAL_COLS });
		R++;

		// 행2: 메타
		sheetRows.push({ cells: [
			{ value: `거래처: ${clientName}    |    기간: ${periodFrom} ~ ${periodTo}    |    발행일: ${new Date().toISOString().slice(0,10)}`, style: S_META },
			...Array(TOTAL_COLS - 1).fill({ value: '', style: S_META }),
		], height: 18 });
		merges.push({ r1: R, c1: 1, r2: R, c2: TOTAL_COLS });
		R++;

		// 행3: 품목수 & 출고일수 & 총수량
		sheetRows.push({ cells: [
			{ value: `품목 ${sd.rows.length}종  |  출고 ${sd.activeDays}일  |  총 출고: ${sd.grandTotal.toLocaleString()}개`, style: S_META },
			...Array(TOTAL_COLS - 1).fill({ value: '', style: S_META }),
		], height: 16 });
		merges.push({ r1: R, c1: 1, r2: R, c2: TOTAL_COLS });
		R++;

		// 행4: 빈 행
		sheetRows.push({ cells: [{ value: '' }], height: 8 });
		R++;

		// 행5: 헤더 (구분 | 품목명 | 1 | 2 | ... | 31 | 합계)
		const headRow: Cell[] = [
			{ value: '구분',  style: S_DAY_HEAD },
			{ value: '품목명', style: S_DAY_HEAD },
			...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, style: S_DAY_HEAD })),
			{ value: '합계',  style: S_SUBTOTAL_HEAD },
		];
		sheetRows.push({ cells: headRow, height: 18 });
		R++;

		// 행6~N: 품목별 데이터 (카테고리 그룹별 병합)
		const dataStartR = R;
		for (const cg of sd.catGroups) {
			const groupRows = sd.rows.slice(cg.startIdx, cg.startIdx + cg.count);
			const catStyle  = getCatHeadStyle(cg.category);
			const itemStyle = getItemHeadStyle(cg.category);
			const cellStyle = getCellStyle(cg.category);
			const bgAlt     = getCatColor(catIndexMap.get(cg.category) ?? 0).itemBg;

			for (let ri = 0; ri < groupRows.length; ri++) {
				const row   = groupRows[ri];
				const altBg = (cg.startIdx + ri) % 2 === 1;
				const cells: Cell[] = [
					// 카테고리: 첫 행만 값, 나머지는 빈 값 (병합 후 보임)
					{ value: ri === 0 ? cg.label : '', style: catStyle },
					{ value: row.itemName, style: itemStyle },
					...row.quantities.map((qty) => qty > 0
						? { value: qty, style: { ...cellStyle, bgColor: altBg ? bgAlt : 'FFFFFF' } }
						: { value: null, style: { ...S_CELL_EMPTY, bgColor: altBg ? 'F8FAFC' : 'FFFFFF' } }
					),
					{ value: row.total > 0 ? row.total : null, style: { ...S_SUBTOTAL_VAL, bgColor: altBg ? 'F1F5F9' : 'F8FAFC' } },
				];
				sheetRows.push({ cells, height: 16 });
				R++;
			}
			// 카테고리 열 병합
			if (cg.count > 1) {
				merges.push({ r1: dataStartR + cg.startIdx, c1: 1, r2: dataStartR + cg.startIdx + cg.count - 1, c2: 1 });
			}
		}

		// 날짜별 합계 행
		const dayTotalRow: Cell[] = [
			{ value: '합 계', style: S_FOOT_LABEL },
			{ value: '',      style: S_FOOT_LABEL },
			...sd.dayTotals.map((t) => t > 0
				? { value: t, style: S_FOOT_GRAND }
				: { value: null, style: { ...S_FOOT_LABEL, numFmt: '#,##0' } }
			),
			{ value: sd.grandTotal, style: S_FOOT_GRAND },
		];
		merges.push({ r1: R, c1: 1, r2: R, c2: 2 });
		sheetRows.push({ cells: dayTotalRow, height: 20 });
		R++;

		// 빈 행
		sheetRows.push({ cells: [{ value: '' }], height: 10 });
		R++;

		// ── 요약 섹션 ──
		sheetRows.push({ cells: [
			{ value: '[ 카테고리별 요약 ]', style: { bold: true, fontSize: 11, fontColor: '334155' } },
		], height: 20 });
		merges.push({ r1: R, c1: 1, r2: R, c2: 4 });
		R++;

		for (const cg of sd.catGroups) {
			const _cgColor = getCatColor(catIndexMap.get(cg.category) ?? 0);
			const labelStyle: Cell['style'] = {
				bold: true, fontSize: 10, align: 'left',
				bgColor:   _cgColor.itemBg,
				fontColor: _cgColor.itemFont,
				border: true,
			};
			const valStyle: Cell['style'] = {
				bold: true, fontSize: 11, align: 'center',
				bgColor:   _cgColor.bg,
				fontColor: _cgColor.font,
				border: true, numFmt: '#,##0',
			};
			sheetRows.push({ cells: [
				{ value: `${cg.label} (${cg.count}종)`, style: labelStyle },
				{ value: sd.catTotals[cg.category] ?? 0, style: valStyle },
				{ value: '', style: valStyle },
				{ value: '개', style: { fontSize: 10, fontColor: '64748B' } },
			], height: 20 });
			merges.push({ r1: R, c1: 2, r2: R, c2: 3 });
			R++;
		}

		sheetRows.push({ cells: [
			{ value: '총 합계', style: { ...S_SUMMARY_LABEL, bgColor: 'EEF2FF', fontColor: '4338CA', bold: true } },
			{ value: sd.grandTotal, style: S_FOOT_GRAND },
			{ value: '', style: S_FOOT_GRAND },
			{ value: '개', style: { fontSize: 10, fontColor: '64748B' } },
		], height: 22 });
		merges.push({ r1: R, c1: 2, r2: R, c2: 3 });

		// ── 시트 조립 ──
		const sheet: Sheet = {
			name: `거래내역서_${periodFrom.slice(0,7)}`,
			rows: sheetRows,
			merges,
			columns: xlsColumns,
			freezeRow: 5,   // 헤더 5행 고정
			freezeCol: 2,   // 카테고리+품목명 2열 고정
		};

		downloadXlsx([sheet], filename);
	}

	// ── 청구서 엑셀 내보내기 ──
	function exportInvoiceExcel() {
		if (!selectedClient || invoiceLines.length === 0) return;

		const clientName = selectedClient.name;
		const period = `${periodFrom}~${periodTo}`;
		const filename = `청구서_${clientName}_${period}.xlsx`;

		const S_TITLE:  Cell['style'] = { bold: true, fontSize: 16, align: 'center', fontColor: '0F172A' };
		const S_META:   Cell['style'] = { fontSize: 10, align: 'center', fontColor: '64748B' };
		const S_HEAD:   Cell['style'] = { bold: true, fontSize: 10, align: 'center', bgColor: 'F8FAFC', fontColor: '475569', border: true };
		const S_LABEL:  Cell['style'] = { bold: true, fontSize: 10, align: 'left',   bgColor: 'F8FAFC', fontColor: '475569', border: true };
		const S_NUM:    Cell['style'] = { fontSize: 10, align: 'right', border: true, numFmt: '#,##0', fontColor: '334155' };
		const S_PRICE:  Cell['style'] = { fontSize: 10, align: 'right', border: true, numFmt: '#,##0', fontColor: '64748B' };
		const S_AMOUNT: Cell['style'] = { bold: true, fontSize: 10, align: 'right', border: true, numFmt: '#,##0', fontColor: '1E293B' };
		const getCatExcelStyle = (idx: number): Cell['style'] => {
			const c = getCatColor(idx);
			return { bold: true, fontSize: 10, align: 'center', bgColor: c.bg, fontColor: c.font, border: true };
		};
		const S_TOTAL: Cell['style'] = { bold: true, fontSize: 12, align: 'right', bgColor: 'EEF2FF', fontColor: '4338CA', border: true, borderThick: true, numFmt: '#,##0' };
		const S_TOTAL_LABEL: Cell['style'] = { bold: true, fontSize: 12, align: 'left', bgColor: 'EEF2FF', fontColor: '4338CA', border: true, borderThick: true };

		const merges: MergeRegion[] = [];
		const sheetRows: Sheet['rows'] = [];
		let R = 1;

		// 제목
		sheetRows.push({ cells: [{ value: '세 탁 청 구 서', style: S_TITLE }, ...Array(4).fill({ value: '', style: S_TITLE })], height: 30 });
		merges.push({ r1: R, c1: 1, r2: R, c2: 5 }); R++;

		// 메타
		sheetRows.push({ cells: [{ value: `거래처: ${clientName}    |    기간: ${periodFrom} ~ ${periodTo}    |    발행일: ${new Date().toISOString().slice(0,10)}`, style: S_META }, ...Array(4).fill({ value: '', style: S_META })], height: 18 });
		merges.push({ r1: R, c1: 1, r2: R, c2: 5 }); R++;

		// 거래처 정보
		sheetRows.push({ cells: [{ value: '' }], height: 8 }); R++;
		if ('businessNo' in selectedClient && selectedClient.businessNo) {
			sheetRows.push({ cells: [{ value: '사업자번호', style: S_LABEL }, { value: (selectedClient as { businessNo?: string }).businessNo ?? '', style: { fontSize: 10, border: true } }, { value: '' }, { value: '' }, { value: '' }], height: 17 }); R++;
		}
		if ('ownerName' in selectedClient && selectedClient.ownerName) {
			sheetRows.push({ cells: [{ value: '대표자', style: S_LABEL }, { value: (selectedClient as { ownerName?: string }).ownerName ?? '', style: { fontSize: 10, border: true } }, { value: '' }, { value: '' }, { value: '' }], height: 17 }); R++;
		}
		sheetRows.push({ cells: [{ value: '' }], height: 8 }); R++;

		// 헤더
		sheetRows.push({ cells: [
			{ value: '품목명',  style: S_HEAD },
			{ value: '카테고리', style: S_HEAD },
			{ value: '수량',   style: S_HEAD },
			{ value: '단가(원)', style: S_HEAD },
			{ value: '금액(원)', style: S_HEAD },
		], height: 20 }); R++;

		// 데이터
		for (const line of invoiceLines) {
			sheetRows.push({ cells: [
				{ value: line.itemName, style: { fontSize: 10, align: 'left', border: true, fontColor: '334155' } },
				{ value: line.category, style: getCatExcelStyle(catIndexMap.get(line.category) ?? 0) },
				{ value: line.quantity, style: S_NUM },
				{ value: line.unitPrice > 0 ? line.unitPrice : null, style: S_PRICE },
				{ value: line.amount, style: S_AMOUNT },
			], height: 17 }); R++;
		}

		// 합계
		sheetRows.push({ cells: [
			{ value: '합  계', style: S_TOTAL_LABEL },
			{ value: '', style: S_TOTAL_LABEL },
			{ value: invoiceTotalQty, style: { ...S_TOTAL, fontSize: 10 } },
			{ value: '', style: S_TOTAL },
			{ value: invoiceTotal, style: { ...S_TOTAL, fontSize: 14 } },
		], height: 26 });

		const sheet: Sheet = {
			name: `청구서_${periodFrom.slice(0,7)}`,
			rows: sheetRows,
			merges,
			columns: [{ width: 22 }, { width: 10 }, { width: 8 }, { width: 12 }, { width: 14 }],
		};

		downloadXlsx([sheet], filename);
	}

	// ── 헬퍼 ──
	const categoryColor: Record<string, string> = {
		towel:   'bg-info',
		sheet:   'bg-secondary',
		uniform: 'bg-warning'
	};


</script>

<svelte:head>
	<title>청구서 관리 — 세탁 관리자</title>
</svelte:head>

<!-- ═══════════════ 화면 UI ═══════════════ -->
<div class="h-screen flex flex-col bg-base-200 overflow-hidden" id="billing-screen-ui">

	<!-- ── 상단 통합 헤더 바 ── -->
	<div class="shrink-0 bg-base-100 border-b border-base-200 px-8 py-0">
		<div class="flex items-stretch h-16 gap-0">
			<!-- 제목 -->
			<div class="flex items-center gap-3 pr-6 border-r border-base-200">
				<Icon icon="lucide:receipt" class="h-5 w-5 text-primary" />
				<h2 class="text-lg font-extrabold text-base-content whitespace-nowrap">청구 관리</h2>
			</div>

			<!-- 거래처 선택 -->
			<div class="flex items-center gap-2.5 px-6 border-r border-base-200">
				<span class="text-xs font-bold text-base-content/40 shrink-0">거래처</span>
				<select class="select select-bordered select-sm font-bold min-w-36" value={selectedClientId} onchange={(e) => selectClient((e.target as HTMLSelectElement).value)}>
					{#each clients as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>

			<!-- 조회 기간 -->
			<div class="flex items-center gap-2.5 px-6 border-r border-base-200">
				<span class="text-xs font-bold text-base-content/40 shrink-0">기간</span>
				<button type="button" class="btn btn-sm btn-ghost border border-base-300 gap-1.5 font-mono text-sm" onclick={() => openPicker('from')}>
					<Icon icon="lucide:calendar" class="h-3.5 w-3.5 text-base-content/50" />
					{periodFrom || '시작일'}
				</button>
				<span class="text-base-content/30 text-xs font-bold">→</span>
				<button type="button" class="btn btn-sm btn-ghost border border-base-300 gap-1.5 font-mono text-sm" onclick={() => openPicker('to')}>
					<Icon icon="lucide:calendar" class="h-3.5 w-3.5 text-base-content/50" />
					{periodTo || '종료일'}
				</button>
				{#if periodFrom && periodTo}
					{@const days = Math.round((new Date(periodTo).getTime() - new Date(periodFrom).getTime()) / 86400000) + 1}
					<span class="badge badge-ghost badge-sm font-semibold">{days}일</span>
				{/if}
			</div>

			<!-- 탭 (오른쪽 끝) -->
			<div class="ml-auto flex items-center pl-6">
				<div role="tablist" class="tabs tabs-boxed bg-base-200">
					<button type="button" class="tab {tabState.active === 'invoice' ? 'tab-active' : ''}" onclick={() => switchTab('invoice')}>청구서</button>
						<button type="button" class="tab {tabState.active === 'statement' ? 'tab-active' : ''}" onclick={() => switchTab('statement')}>거래내역서</button>
						<button type="button" class="tab {tabState.active === 'history' ? 'tab-active' : ''}" onclick={() => switchTab('history')}>발행 내역</button>

				</div>
			</div>
		</div>
	</div>

	<!-- ── 탭 콘텐츠 영역 (나머지 높이 전체 사용) ── -->
	<div class="flex-1 overflow-auto px-8 py-5">

	<!-- ── 청구서 탭 ── -->
	{#if tabState.active === 'invoice'}
		<div class="grid grid-cols-12 gap-5 h-full">
			<!-- 왼쪽: 품목표 -->
			<div class="col-span-8 flex flex-col min-h-0">
				<div class="card bg-base-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
					<div class="flex items-center gap-3 border-b border-base-200 px-5 py-3 shrink-0">
						<h3 class="text-base font-bold">품목별 청구 내역</h3>
						{#if unpricedCount > 0}
							<span class="badge badge-warning badge-sm font-semibold">단가 미설정 {unpricedCount}건</span>
						{/if}
					</div>
					{#if invoiceLines.length === 0}
						<div class="flex-1 flex flex-col items-center justify-center">
							<p class="text-base-content/40">해당 기간에 출고 내역이 없습니다.</p>
							<p class="mt-1 text-xs text-base-content/30">거래처와 기간을 확인해 주세요.</p>
						</div>
					{:else}
						<div class="flex-1 overflow-y-auto">
							<table class="table table-sm w-full">
								<thead class="sticky top-0 z-10 bg-base-200">
									<tr>
										<th class="text-xs">품목명</th>
										<th class="w-20 text-xs text-right">수량</th>
										<th class="w-28 text-xs text-right">단가</th>
										<th class="w-28 text-xs text-right">금액</th>
									</tr>
								</thead>
								<tbody>
									{#each Object.keys(invoiceByCategory) as cat (cat)}
										{@const catLines = invoiceLines.filter((l) => l.category === cat)}
										{#if catLines.length > 0}
											<tr class="bg-base-200/50">
												<td colspan="4" class="py-2 pl-3">
													<span class="inline-flex items-center gap-1.5">
														<span class="h-2 w-2 rounded-full {categoryColor[cat] ?? 'bg-base-content/30'}"></span>
														<span class="text-xs font-bold">{cat}</span>
														{#if invoiceByCategory[cat]}
															<span class="ml-2 text-[11px] text-base-content/40">소계 {invoiceByCategory[cat].qty.toLocaleString()}개</span>
														{/if}
													</span>
												</td>
											</tr>
											{#each catLines as line (line.category + line.itemName + line.unitPrice)}
												{@const hasDup = catLines.filter(l => l.itemName === line.itemName).length > 1}
												{@const rangeLabel = formatPriceRange(line.priceFrom, line.priceTo)}
												<tr class="hover">
													<td class="pl-8 font-medium">
														{line.itemName}
														{#if hasDup && rangeLabel}
															<span class="ml-1.5 text-[11px] font-normal text-base-content/40">({rangeLabel})</span>
														{/if}
													</td>
													<td class="w-20 text-right">{line.quantity.toLocaleString()}</td>
													<td class="w-28 whitespace-nowrap text-right {line.unitPrice === 0 ? 'font-semibold text-warning' : 'text-base-content/70'}">{line.unitPrice === 0 ? '미설정' : formatMoney(line.unitPrice)}</td>
													<td class="w-28 whitespace-nowrap text-right font-bold {line.amount === 0 ? 'text-base-content/30' : ''}">{formatMoney(line.amount)}</td>
												</tr>
											{/each}
											{#if catLines.length > 1}
												<tr class="bg-base-200/50">
													<td class="pl-8 text-xs font-semibold text-base-content/40">소계</td>
													<td class="w-20 text-right text-xs font-bold">{catLines.reduce((s, l) => s + l.quantity, 0).toLocaleString()}</td>
													<td class="w-28"></td>
													<td class="w-28 whitespace-nowrap text-right text-xs font-bold">{formatMoney(catLines.reduce((s, l) => s + l.amount, 0))}</td>
												</tr>
											{/if}
										{/if}
									{/each}
								</tbody>
								<tfoot class="sticky bottom-0 z-10 bg-base-100">
									<tr class="border-t-2 border-base-300 bg-primary/10">
										<td class="px-3 py-3 text-sm font-extrabold">합계</td>
										<td class="w-20 px-3 py-3 text-right text-sm font-extrabold">{invoiceTotalQty.toLocaleString()}</td>
										<td class="w-28 px-3 py-3"></td>
										<td class="w-28 whitespace-nowrap px-3 py-3 text-right text-lg font-black text-primary">{formatMoney(invoiceTotal)}</td>
									</tr>
								</tfoot>
							</table>
						</div>
					{/if}
				</div>
			</div>

			<!-- 오른쪽: 요약 + 액션 -->
			<div class="col-span-4 flex flex-col gap-4 min-h-0">
				<!-- 청구 요약 카드 -->
				<div class="card bg-base-100 shadow-sm overflow-hidden shrink-0">
					<div class="bg-primary px-5 py-3">
						<p class="text-xs font-bold uppercase tracking-widest text-primary-content/70">청구 요약</p>
						<p class="mt-0.5 text-sm font-bold text-primary-content">{selectedClient?.name ?? '-'}</p>
					</div>
					<div class="p-5 space-y-3">
						<div class="flex justify-between items-center text-sm">
							<span class="text-base-content/50">기간</span>
							<span class="text-right text-xs font-semibold tabular-nums">{formatDate(periodFrom)} ~ {formatDate(periodTo)}</span>
						</div>
						<div class="flex justify-between items-center text-sm">
							<span class="text-base-content/50">품목 수</span>
							<span class="font-bold">{invoiceLines.length}종</span>
						</div>
						<div class="flex justify-between items-center text-sm">
							<span class="text-base-content/50">총 수량</span>
							<span class="font-bold tabular-nums">{invoiceTotalQty.toLocaleString()}개</span>
						</div>
						{#if unpricedCount > 0}
							<div class="flex justify-between items-center text-sm">
								<span class="text-warning">단가 미설정</span>
								<span class="font-bold text-warning">{unpricedCount}건</span>
							</div>
						{/if}
						<div class="border-t border-base-200 pt-3 mt-1">
							<div class="flex justify-between items-end">
								<span class="text-sm font-bold">청구 금액</span>
								<span class="text-2xl font-black text-primary tabular-nums">{formatMoney(invoiceTotal)}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- 카테고리별 소계 -->
				{#if invoiceLines.length > 0}
					<div class="card bg-base-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
						<p class="shrink-0 border-b border-base-200 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-base-content/40">카테고리별 소계</p>
						<div class="flex-1 overflow-y-auto p-4 space-y-2">
							{#each Object.keys(invoiceByCategory) as cat (cat)}
								{@const catData = invoiceByCategory[cat]}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<span class="h-2 w-2 rounded-full {categoryColor[cat] ?? 'bg-base-content/30'}"></span>
										<span class="text-sm">{cat}</span>
									</div>
									<div class="text-right">
										<span class="text-xs text-base-content/40 tabular-nums">{catData.qty.toLocaleString()}개 · </span>
										<span class="text-sm font-bold tabular-nums">{catData.amount.toLocaleString()}원</span>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- 액션 버튼 -->
					<div class="space-y-2 shrink-0">
						<button type="button" class="btn btn-primary w-full gap-2" onclick={openPdfModal}>
							<Icon icon="lucide:file-text" class="h-4 w-4" />
							청구서 PDF
						</button>
						<button type="button" class="btn btn-success w-full gap-2" onclick={exportInvoiceExcel}>
							<Icon icon="lucide:file-spreadsheet" class="h-4 w-4" />
							청구서 엑셀 저장
						</button>
					</div>
				{/if}
			</div>
		</div>

	<!-- ── 거래내역서 탭 ── -->
	{:else if tabState.active === 'statement'}
		<div class="space-y-4">
			<!-- 뷰 모드 + 액션만 (기간/거래처는 상단 공통 바) -->
			<div class="flex items-center gap-3">
				<div class="tabs tabs-boxed">
					<button type="button" class="tab {stmtViewMode === 'pivot' ? 'tab-active' : ''}" onclick={() => stmtViewMode = 'pivot'}>피벗표</button>
					<button type="button" class="tab {stmtViewMode === 'daily' ? 'tab-active' : ''}" onclick={() => stmtViewMode = 'daily'}>일별상세</button>
				</div>
				{#if statementData}
					<button type="button" class="btn btn-success btn-sm gap-1.5 ml-auto" onclick={exportStatementExcel}>
						<Icon icon="lucide:file-spreadsheet" class="h-4 w-4" />
						엑셀 저장
					</button>
				{/if}
			</div>

			{#if !statementData}
				<div class="card border-2 border-dashed border-success/30 bg-success/5 p-16 text-center shadow-sm">
					<p class="text-4xl">📋</p>
					<p class="mt-3 text-lg font-bold text-success">거래내역이 없습니다</p>
					<p class="mt-1 text-sm text-success/70">선택한 기간에 출고 기록이 없거나, 거래처를 확인해 주세요.</p>
				</div>
			{:else}
				<!-- ━━ 피벗 뷰 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
				{#if stmtViewMode === 'pivot'}
						<!-- 피벗 테이블 — 세로=품목, 가로=1~31일 고정 (가로 스크롤 없음) -->
						<div class="card bg-base-100 shadow-sm overflow-hidden">
							<!-- 카테고리 범례 -->
							<div class="flex items-center gap-4 border-b border-base-200 px-4 py-2.5 bg-base-200/50">
								{#each statementData.catGroups as cg (cg.category)}
									{@const dot = cg.category === 'towel' ? 'bg-info' : cg.category === 'sheet' ? 'bg-primary' : 'bg-warning'}
									{@const txt = cg.category === 'towel' ? 'text-info' : cg.category === 'sheet' ? 'text-primary' : 'text-warning'}
									<div class="flex items-center gap-1.5">
										<span class="h-2.5 w-2.5 rounded-full {dot}"></span>
										<span class="text-xs font-semibold {txt}">{cg.label} ({cg.count}종)</span>
									</div>
								{/each}
								<span class="ml-auto text-[10px] text-base-content/40">품목 {statementData.rows.length}종 · 출고 {statementData.activeDays}일</span>
							</div>

							<div bind:clientWidth={pivotScrollWidth} style="overflow-y: auto; {statementData.dates.length > 31 ? 'overflow-x: auto;' : ''} max-height: 70vh;">
								<table class="border-collapse" style="table-layout: fixed; font-size: 11px; width: {statementData.dates.length > 31 ? ((5.2 + 7.5 + 3.8) * 11 + statementData.dates.length * pivotDateColWidth) + 'px' : '100%'};">
									<colgroup>
										<col style="width: 5.2em" /><!-- 구분 -->
										<col style="width: 7.5em" /><!-- 품목명 -->
										{#each statementData.dates as d (d)}
											<col style="width: {pivotDateColWidth}px" /><!-- 날짜 -->
										{/each}
										<col style="width: 3.8em" /><!-- 합계 -->
									</colgroup>
									<thead class="sticky top-0 z-20">
										<tr class="border-b-2 border-base-300 bg-base-200">
											<th class="sticky left-0 z-30 bg-base-200 border-r border-base-300 py-2 text-center text-[10px] font-bold">구분</th>
											<th class="sticky bg-base-200 border-r border-base-300 py-2 text-center text-[10px] font-bold" style="left: 5.2em; z-index: 31;">품목명</th>
											{#each statementData.dateLabels as label, i (i)}
												<th class="py-2 text-center text-[10px] font-bold border-r border-base-200">{label}</th>
											{/each}
											<th class="py-2 text-center text-[10px] font-bold border-l border-base-300 bg-base-200">합계</th>
										</tr>
									</thead>
									<tbody>
										{#each statementData.catGroups as cg (cg.category)}
											{@const catBg  = cg.category === 'towel' ? 'bg-info/10'   : cg.category === 'sheet' ? 'bg-primary/10'   : 'bg-warning/10'}
											{@const catTxt = cg.category === 'towel' ? 'text-info'    : cg.category === 'sheet' ? 'text-primary'    : 'text-warning'}
											{@const altBg  = cg.category === 'towel' ? 'bg-info/5'    : cg.category === 'sheet' ? 'bg-primary/5'    : 'bg-warning/5'}
											{@const activeBg = cg.category === 'towel' ? 'bg-info/20 font-semibold' : cg.category === 'sheet' ? 'bg-primary/20 font-semibold' : 'bg-warning/20 font-semibold'}
											{#each statementData.rows.slice(cg.startIdx, cg.startIdx + cg.count) as row, ri (row.key)}
												<tr class="border-b border-base-200 hover:bg-base-200/30 transition-colors {ri % 2 === 1 ? altBg : 'bg-base-100'}">
													{#if ri === 0}
														<td rowspan={cg.count}
															class="sticky left-0 z-10 border-r border-base-200 text-center align-middle py-1 font-bold text-[10px] {catBg} {catTxt}"
															style="writing-mode: vertical-rl; letter-spacing: 0.05em;">
															{cg.label}
														</td>
													{/if}
													<td class="sticky border-r border-base-200 px-1 py-1.5 text-[11px] font-medium truncate {ri % 2 === 1 ? altBg : 'bg-base-100'}" style="left: 5.2em; z-index: 9;">
														{row.itemName}
													</td>
													{#each row.dateQtys as qty, di (di)}
														<td class="py-1.5 text-center border-r border-base-100 {qty > 0 ? activeBg : ''}">
															{qty > 0 ? qty : ''}
														</td>
													{/each}
													<td class="py-1.5 text-center font-bold border-l border-base-200">
														{row.total > 0 ? row.total : ''}
													</td>
												</tr>
											{/each}
										{/each}
									</tbody>
									<tfoot class="sticky bottom-0 z-20">
										<tr class="border-t-2 border-primary/30 bg-primary/10">
											<td colspan="2" class="sticky left-0 z-30 bg-primary/10 border-r border-primary/20 px-1 py-2 text-center text-xs font-extrabold text-primary">합 계</td>
											{#each statementData.dateTotals as total, i (i)}
												<td class="py-2 text-center text-xs font-bold border-r border-primary/10 {total > 0 ? 'text-primary' : 'text-base-content/20'}">
													{total > 0 ? total : ''}
												</td>
											{/each}
											<td class="py-2 text-center text-sm font-black text-primary border-l border-primary/20">{statementData.grandTotal.toLocaleString()}</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>

				<!-- ━━ 일별 상세 뷰 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
					{:else}
						{@const isMultiMonth = periodFrom.slice(0, 7) !== periodTo.slice(0, 7)}
						{@const catCols = statementData.catGroups}
						<div class="card bg-base-100 shadow-sm overflow-hidden">

							<!-- ── 컬럼 헤더 sticky ── -->
							<div class="sticky top-0 z-10 grid border-b border-base-200 bg-base-100 shadow-sm"
								 style="grid-template-columns: 6rem {catCols.map(() => '1fr').join(' ')} 6rem;">
								<div class="flex items-center justify-center px-3 py-3.5 border-r border-base-200">
									<span class="text-xs font-bold uppercase tracking-widest text-base-content/40">날짜</span>
								</div>
								{#each catCols as cg (cg.category)}
									{@const ci  = catIndexMap.get(cg.category) ?? 0}
									{@const col = getCatColor(ci)}
									<div class="flex items-center gap-2 border-r border-base-200 px-4 py-3.5"
										 style="border-top: 3px solid #{col.font};">
										<span class="h-2.5 w-2.5 rounded-full shrink-0" style="background: #{col.font};"></span>
										<span class="text-sm font-bold" style="color: #{col.font};">{cg.label}</span>
										{#if (statementData.catTotals[cg.category] ?? 0) > 0}
											<span class="ml-auto text-xs font-semibold tabular-nums" style="color: #{col.font};">
												{statementData.catTotals[cg.category].toLocaleString()}개
											</span>
										{/if}
									</div>
								{/each}
								<div class="flex items-center justify-end px-4 py-3.5">
									<span class="text-xs font-bold uppercase tracking-widest text-base-content/40">합계</span>
								</div>
							</div>

							<!-- ── 스크롤 바디 ── -->
							<div style="max-height: 65vh; overflow-y: auto;">
								{#each statementData.dailyRows as drow (drow.date)}
									{@const dow       = ['일','월','화','수','목','금','토'][new Date(drow.date).getDay()]}
									{@const isWeekend = new Date(drow.date).getDay() === 0 || new Date(drow.date).getDay() === 6}

									<div class="grid border-b border-base-200 last:border-b-0 transition-colors hover:bg-base-200/30 {isWeekend ? 'bg-error/5' : 'bg-base-100'}"
										 style="grid-template-columns: 6rem {catCols.map(() => '1fr').join(' ')} 6rem;">

										<!-- 날짜 셀 -->
										<div class="flex flex-col items-center justify-center border-r border-base-200 py-4 px-2 {isWeekend ? 'bg-error/10' : ''}">
											{#if isMultiMonth}
												<span class="text-[10px] font-semibold text-base-content/40 leading-none mb-1">{drow.date.slice(5,7)}월</span>
											{/if}
											<span class="text-3xl font-black leading-none tabular-nums {isWeekend ? 'text-error' : ''}">{drow.date.slice(8,10)}</span>
											<span class="mt-1.5 text-xs font-bold {isWeekend ? 'text-error/70' : 'text-base-content/40'}">{dow}</span>
										</div>

										<!-- 카테고리별 셀 동적 -->
										{#each catCols as cg (cg.category)}
											{@const ci       = catIndexMap.get(cg.category) ?? 0}
											{@const col      = getCatColor(ci)}
											{@const catItems = drow.items.filter(it => it.category === cg.category)}
											<div class="border-r border-base-200 px-4 py-3.5"
												 style="border-left: 2px solid #{col.font}33;">
												{#if catItems.length > 0}
													<div class="space-y-1.5">
														{#each catItems as it (it.itemName)}
															<div class="flex items-center justify-between gap-2">
																<span class="text-sm leading-snug">{it.itemName}</span>
																<span class="shrink-0 text-sm font-bold tabular-nums" style="color: #{col.font};">
																	{it.quantity.toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span>
																</span>
															</div>
														{/each}
													</div>
												{:else}
													<span class="text-base text-base-content/20 select-none">—</span>
												{/if}
											</div>
										{/each}

										<!-- 합계 셀 -->
										<div class="flex flex-col items-end justify-center px-4 py-3.5">
											<span class="text-xl font-black tabular-nums leading-none {isWeekend ? 'text-error' : ''}">{drow.total.toLocaleString()}</span>
											<span class="mt-1 text-xs text-base-content/40">개</span>
										</div>
									</div>
								{/each}
							</div>

							<!-- ── 하단 합계 행 ── -->
							<div class="grid border-t-2 border-base-300 bg-base-200"
								 style="grid-template-columns: 6rem {catCols.map(() => '1fr').join(' ')} 6rem;">
								<div class="flex items-center justify-center px-3 py-3 border-r border-base-200">
									<span class="text-xs font-bold">{statementData.activeDays}일</span>
								</div>
								{#each catCols as cg (cg.category)}
									{@const ci  = catIndexMap.get(cg.category) ?? 0}
									{@const col = getCatColor(ci)}
									{@const tot = statementData.catTotals[cg.category] ?? 0}
									<div class="flex items-center justify-between px-4 py-3 border-r border-base-200">
										{#if tot > 0}
											<span class="text-xs text-base-content/40">소계</span>
											<span class="text-sm font-black tabular-nums" style="color: #{col.font};">
												{tot.toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span>
											</span>
										{:else}
											<span class="text-sm text-base-content/20">—</span>
										{/if}
									</div>
								{/each}
								<div class="flex flex-col items-end justify-center px-4 py-3">
									<span class="text-base font-black tabular-nums">{statementData.grandTotal.toLocaleString()}</span>
									<span class="text-xs text-base-content/40">개</span>
								</div>
							</div>

						</div>
					{/if}
			{/if}
		</div>
	{:else if tabState.active === 'history'}
		<div class="space-y-4">
			<div class="card bg-base-100 shadow-sm overflow-hidden">
				<div class="flex items-center gap-3 border-b border-base-200 px-5 py-3">
					<h3 class="text-base font-bold">발행 내역</h3>
					<span class="badge badge-ghost badge-sm">{filteredHistory.length}건</span>
				</div>
				{#if filteredHistory.length === 0}
					<div class="flex flex-col items-center justify-center py-16">
						<p class="text-base-content/40">발행된 청구서가 없습니다.</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm w-full">
							<thead class="bg-base-200">
								<tr>
									<th class="text-xs">발행일</th>
									<th class="text-xs">청구 기간</th>
									<th class="text-xs text-right">품목수</th>
									<th class="text-xs text-right">공급가액</th>
									<th class="text-xs text-right">VAT</th>
									<th class="text-xs text-right">합계</th>
									<th class="text-xs text-center">상태</th>
									<th class="text-xs text-center">액션</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredHistory as inv (inv.id)}
									<tr class="hover">
										<td class="text-xs">{formatDate(inv.created_at.slice(0, 10))}</td>
										<td class="text-xs font-mono">{formatDate(inv.period_start)} ~ {formatDate(inv.period_end)}</td>
										<td class="text-xs text-right">{inv.invoice_items.length}</td>
										<td class="text-xs text-right tabular-nums">{inv.subtotal.toLocaleString('ko-KR')}</td>
										<td class="text-xs text-right tabular-nums">{inv.vat.toLocaleString('ko-KR')}</td>
										<td class="text-xs text-right font-bold tabular-nums">{inv.total.toLocaleString('ko-KR')}</td>
										<td class="text-center">
											{#if inv.status === 'issued'}
												<span class="badge badge-success badge-sm">발행</span>
											{:else}
												<span class="badge badge-error badge-sm">취소</span>
											{/if}
										</td>
										<td class="text-center">
											<div class="flex items-center justify-center gap-1">
												<button
													type="button"
													class="btn btn-xs btn-ghost gap-1"
													onclick={async () => {
														const sf = inv.snapshot_factory as typeof SUPPLIER_DEFAULT | null;
														const sc = inv.snapshot_client as { name?: string } | null;
														const histLines: InvoiceLine[] = [...inv.invoice_items]
															.sort((a, b) => a.sort_order - b.sort_order)
															.map(it => ({
																category:      it.category_name ?? '',
																catSortOrder:  0,
																itemName:      it.item_name_ko,
																itemSortOrder: it.sort_order,
																quantity:      it.quantity,
																unitPrice:     it.unit_price,
																amount:        it.amount,
																priceFrom:     null,
																priceTo:       null,
															}));
														historyPdfLoading = true;
														historyPdfModal = true;
														historyPdfUrl = null;
														try {
															historyPdfUrl = await generateInvoicePdf({
																supplier:     sf ?? SUPPLIER_DEFAULT,
																clientName:   sc?.name ?? '',
																periodFrom:   inv.period_start,
																periodTo:     inv.period_end,
																lines:        histLines,
																supplyAmount: inv.subtotal,
															});
														} finally {
															historyPdfLoading = false;
														}
													}}
												>
													<Icon icon="lucide:file-text" class="h-3 w-3" />재출력
												</button>
												{#if inv.status === 'issued'}
													<button
														type="button"
														class="btn btn-xs btn-error btn-ghost gap-1"
														onclick={() => { deleteTargetId = inv.id; deleteConfirmModal = true; }}
													>
														<Icon icon="lucide:trash-2" class="h-3 w-3" />삭제
													</button>
												{/if}
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
	{/if}
	</div><!-- /flex-1 overflow-auto -->
</div>

<!-- ═══════════════ 청구서 저장 확인 모달 ═══════════════ -->


<!-- ═══════════════ 저장된 청구서 열람 모달 ═══════════════ -->


<!-- ═══════════════ 저장된 청구서 열람 모달 ═══════════════ -->


<!-- ═══════════════ 청구서 PDF 미리보기 모달 ═══════════════ -->
<!-- DatePicker: 기간 선택 (청구서 / 거래내역서 공통) -->
<DatePicker
	show={pickerShow}
	target={pickerTarget}
	fromDate={periodFrom}
	toDate={periodTo}
	onselect={onPickerSelect}
	onclose={() => (pickerShow = false)}
/>



{#if showSupplierModal}
<dialog class="modal modal-open" aria-modal="true">
	<div class="modal-box w-full max-w-lg">
		<h3 class="mb-1 text-base font-extrabold">공급자 정보 확인</h3>
		<p class="mb-4 text-xs text-base-content/50">입력값은 자동 저장됩니다. 다음 출력 시 그대로 사용됩니다.</p>

		<div class="grid grid-cols-2 gap-3">
			<div class="form-control">
				<label for="sup-regNo" class="label label-text text-xs font-semibold">등록번호</label>
				<input id="sup-regNo" type="text" bind:value={supplierEdit.regNo} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control">
				<label for="sup-name" class="label label-text text-xs font-semibold">상호명</label>
				<input id="sup-name" type="text" bind:value={supplierEdit.name} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control">
				<label for="sup-ceo" class="label label-text text-xs font-semibold">대표자 성명</label>
				<input id="sup-ceo" type="text" bind:value={supplierEdit.ceo} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control">
				<label for="sup-tel" class="label label-text text-xs font-semibold">TEL</label>
				<input id="sup-tel" type="text" bind:value={supplierEdit.tel} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control col-span-2">
				<label for="sup-address" class="label label-text text-xs font-semibold">사업장 주소</label>
				<input id="sup-address" type="text" bind:value={supplierEdit.address} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control">
				<label for="sup-bizType" class="label label-text text-xs font-semibold">업태</label>
				<input id="sup-bizType" type="text" bind:value={supplierEdit.bizType} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control">
				<label for="sup-bizItem" class="label label-text text-xs font-semibold">종목</label>
				<input id="sup-bizItem" type="text" bind:value={supplierEdit.bizItem} class="input input-bordered input-sm w-full" />
			</div>
			<div class="form-control col-span-2">
				<label for="sup-bank" class="label label-text text-xs font-semibold">입금계좌</label>
				<input id="sup-bank" type="text" bind:value={supplierEdit.bank} class="input input-bordered input-sm w-full" placeholder="은행명 계좌번호" />
			</div>
		</div>

		<div class="modal-action mt-5">
			<button type="button" class="btn btn-ghost btn-sm"
				onclick={() => (showSupplierModal = false)}>취소</button>
			<button type="button" class="btn btn-primary btn-sm gap-1.5"
				onclick={confirmSupplierAndPdf}>
				<Icon icon="lucide:file-text" class="h-4 w-4" />
				PDF 출력
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="닫기" onclick={() => (showSupplierModal = false)}></button>
	</form>
</dialog>
{/if}

{#if showPdfModal}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box flex w-full max-w-4xl flex-col gap-0 overflow-hidden p-0" style="max-height: 90vh;">
			<!-- 헤더 -->
			<div class="flex shrink-0 items-center justify-between border-b border-base-200 bg-base-100 px-5 py-4">
				<div class="flex items-center gap-2">
					<Icon icon="lucide:file-text" class="h-5 w-5 text-primary" />
					<h3 class="text-base font-extrabold">청구서 PDF 미리보기</h3>
					{#if selectedClient}
						<span class="badge badge-primary badge-sm">{selectedClient.name}</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if issuingInvoice}
						<span class="loading loading-spinner loading-xs text-primary"></span>
						<span class="text-xs text-base-content/50">저장 중...</span>
					{/if}
					{#if pdfBlobUrl}
						<button type="button" class="btn btn-primary btn-sm gap-1.5" onclick={downloadPdf}>
							<Icon icon="lucide:download" class="h-4 w-4" />
							다운로드
						</button>
					{/if}
					<button type="button" class="btn btn-ghost btn-sm btn-square" onclick={closePdfModal} aria-label="닫기">
						<Icon icon="lucide:x" class="h-4 w-4" />
					</button>
				</div>
			</div>

			<!-- 미리보기 영역 -->
			<div class="flex-1 overflow-hidden bg-base-200/50">
				{#if pdfGenerating}
					<div class="flex h-full min-h-96 items-center justify-center gap-3">
						<span class="loading loading-spinner loading-md text-primary"></span>
						<span class="text-sm font-semibold text-base-content/60">PDF 생성 중...</span>
					</div>
				{:else if pdfBlobUrl}
					<iframe
						src="{pdfBlobUrl}#toolbar=1&navpanes=0"
						class="h-full w-full border-0"
						style="min-height: 70vh;"
						title="청구서 미리보기"
					></iframe>
				{:else}
					<div class="flex h-full min-h-96 items-center justify-center">
						<p class="text-sm text-base-content/40">PDF를 불러올 수 없습니다.</p>
					</div>
				{/if}
			</div>
		</div>
		<form method="dialog" class="modal-backdrop"><button onclick={closePdfModal}>close</button></form>
	</dialog>
{/if}

{#if historyPdfModal}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box flex w-full max-w-4xl flex-col gap-0 overflow-hidden p-0" style="max-height: 90vh;">
			<div class="flex shrink-0 items-center justify-between border-b border-base-200 bg-base-100 px-5 py-4">
				<div class="flex items-center gap-2">
					<Icon icon="lucide:file-text" class="h-5 w-5 text-primary" />
					<h3 class="text-base font-extrabold">청구서 재출력</h3>
				</div>
				<button type="button" class="btn btn-ghost btn-sm btn-square" onclick={() => { historyPdfModal = false; historyPdfUrl = null; }} aria-label="닫기">
					<Icon icon="lucide:x" class="h-4 w-4" />
				</button>
			</div>
			<div class="flex-1 overflow-hidden bg-base-200/50" style="min-height: 70vh;">
				{#if historyPdfLoading}
					<div class="flex h-full min-h-96 items-center justify-center gap-3">
						<span class="loading loading-spinner loading-md text-primary"></span>
						<span class="text-sm font-semibold text-base-content/60">PDF 불러오는 중...</span>
					</div>
				{:else if historyPdfUrl}
					<iframe src={historyPdfUrl} title="청구서 PDF" class="h-full w-full" style="min-height: 70vh;"></iframe>
				{:else}
					<div class="flex h-full min-h-96 items-center justify-center">
						<p class="text-sm text-base-content/40">PDF를 불러올 수 없습니다.</p>
					</div>
				{/if}
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={() => { historyPdfModal = false; historyPdfUrl = null; }} aria-label="닫기"></button>
		</form>
	</dialog>
{/if}

{#if deleteConfirmModal}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box max-w-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
					<Icon icon="lucide:trash-2" class="h-5 w-5 text-error" />
				</div>
				<div>
					<h3 class="text-base font-extrabold">청구서 삭제</h3>
					<p class="text-sm text-base-content/50 mt-0.5">이 청구서를 삭제하면 복구할 수 없습니다.</p>
				</div>
			</div>
			<div class="modal-action mt-2">
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => { deleteConfirmModal = false; deleteTargetId = null; }} disabled={deleteLoading}>취소</button>
				<button
					type="button"
					class="btn btn-error btn-sm gap-1.5"
					disabled={deleteLoading}
					onclick={async () => {
						if (!deleteTargetId) return;
						deleteLoading = true;
						try {
							const fdx = new FormData();
							fdx.append('invoice_id', deleteTargetId);
							const res = await fetch('?/cancelInvoice', { method: 'POST', body: fdx });
							if (res.ok) {
								localDeletedIds = new Set([...localDeletedIds, deleteTargetId]);
							}
							deleteConfirmModal = false;
							deleteTargetId = null;
						} finally {
							deleteLoading = false;
						}
					}}
				>
					{#if deleteLoading}<span class="loading loading-spinner loading-xs"></span>{/if}
					<Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />삭제
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button aria-label="닫기" onclick={() => { deleteConfirmModal = false; deleteTargetId = null; }}></button>
		</form>
	</dialog>
{/if}

