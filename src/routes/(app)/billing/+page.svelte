<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { downloadXlsx } from './excel.js';
	import jsPDF from 'jspdf';
	import autoTable, { type CellHookData, type HookData } from 'jspdf-autotable';
	import type { Cell, Sheet, MergeRegion, ColumnDef } from './excel.js';
	import DatePicker from '../stats/_components/DatePicker.svelte';

	const CATEGORY_LABELS: Record<string, string> = { towel: '타월', sheet: '시트', uniform: '유니폼', all: '전체' };

	type InvoiceLine    = { category: string; itemName: string; quantity: number; unitPrice: number; amount: number };


	const clients: { id: string; name: string; businessNo?: string; ownerName?: string; managerName?: string; phone?: string; address?: string; type?: string }[] = [
		{ id: 'client-001', name: '그랜드호텔' },
		{ id: 'client-002', name: '오션뷰펜션' },
		{ id: 'client-003', name: '제주리조트' },
		{ id: 'client-004', name: '힐사이드호텔' },
		{ id: 'client-005', name: '선셋펜션' },
		{ id: 'client-006', name: '블루라군리조트' },
	];

	let shipments = $state([
		// ─── client-001 그랜드호텔 (4/14 ~ 5/13 한달치)
		{ id: 'ship-001', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 120 },
			{ laundryItemId: 'item-012', itemName: '중형타올',     category: 'towel',   quantity: 80  },
			{ laundryItemId: 'item-002', itemName: '싱글시트',     category: 'sheet',   quantity: 60  },
			{ laundryItemId: 'item-014', itemName: '베개커버',     category: 'sheet',   quantity: 90  },
		], driverId: 'driver-001', shippedAt: '2026-04-14T09:00:00', createdAt: '2026-04-14T09:00:00' },
		{ id: 'ship-002', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 95  },
			{ laundryItemId: 'item-019', itemName: '발매트',       category: 'towel',   quantity: 50  },
			{ laundryItemId: 'item-003', itemName: '직원유니폼',   category: 'uniform', quantity: 18  },
			{ laundryItemId: 'item-016', itemName: '주방앞치마',   category: 'uniform', quantity: 12  },
		], driverId: 'driver-001', shippedAt: '2026-04-16T10:00:00', createdAt: '2026-04-16T10:00:00' },
		{ id: 'ship-003', clientId: 'client-001', items: [
			{ laundryItemId: 'item-013', itemName: '소형타올',     category: 'towel',   quantity: 70  },
			{ laundryItemId: 'item-021', itemName: '헤어타올',     category: 'towel',   quantity: 85  },
			{ laundryItemId: 'item-005', itemName: '더블시트',     category: 'sheet',   quantity: 45  },
			{ laundryItemId: 'item-015', itemName: '이불커버',     category: 'sheet',   quantity: 40  },
		], driverId: 'driver-002', shippedAt: '2026-04-17T11:00:00', createdAt: '2026-04-17T11:00:00' },
		{ id: 'ship-004', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 110 },
			{ laundryItemId: 'item-012', itemName: '중형타올',     category: 'towel',   quantity: 65  },
			{ laundryItemId: 'item-022', itemName: '킹시트',       category: 'sheet',   quantity: 35  },
			{ laundryItemId: 'item-018', itemName: '매트리스커버', category: 'sheet',   quantity: 20  },
			{ laundryItemId: 'item-020', itemName: '조리복',       category: 'uniform', quantity: 15  },
		], driverId: 'driver-001', shippedAt: '2026-04-19T09:30:00', createdAt: '2026-04-19T09:30:00' },
		{ id: 'ship-005', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 130 },
			{ laundryItemId: 'item-019', itemName: '발매트',       category: 'towel',   quantity: 55  },
			{ laundryItemId: 'item-002', itemName: '싱글시트',     category: 'sheet',   quantity: 70  },
			{ laundryItemId: 'item-014', itemName: '베개커버',     category: 'sheet',   quantity: 100 },
			{ laundryItemId: 'item-003', itemName: '직원유니폼',   category: 'uniform', quantity: 20  },
		], driverId: 'driver-001', shippedAt: '2026-04-22T10:00:00', createdAt: '2026-04-22T10:00:00' },
		{ id: 'ship-006', clientId: 'client-001', items: [
			{ laundryItemId: 'item-013', itemName: '소형타올',     category: 'towel',   quantity: 60  },
			{ laundryItemId: 'item-021', itemName: '헤어타올',     category: 'towel',   quantity: 90  },
			{ laundryItemId: 'item-005', itemName: '더블시트',     category: 'sheet',   quantity: 50  },
			{ laundryItemId: 'item-017', itemName: '풀커버',       category: 'sheet',   quantity: 28  },
			{ laundryItemId: 'item-016', itemName: '주방앞치마',   category: 'uniform', quantity: 14  },
		], driverId: 'driver-002', shippedAt: '2026-04-24T11:00:00', createdAt: '2026-04-24T11:00:00' },
		{ id: 'ship-007', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 100 },
			{ laundryItemId: 'item-012', itemName: '중형타올',     category: 'towel',   quantity: 75  },
			{ laundryItemId: 'item-022', itemName: '킹시트',       category: 'sheet',   quantity: 40  },
			{ laundryItemId: 'item-015', itemName: '이불커버',     category: 'sheet',   quantity: 50  },
			{ laundryItemId: 'item-020', itemName: '조리복',       category: 'uniform', quantity: 20  },
		], driverId: 'driver-001', shippedAt: '2026-04-26T09:00:00', createdAt: '2026-04-26T09:00:00' },
		{ id: 'ship-008', clientId: 'client-001', items: [
			{ laundryItemId: 'item-019', itemName: '발매트',       category: 'towel',   quantity: 60  },
			{ laundryItemId: 'item-021', itemName: '헤어타올',     category: 'towel',   quantity: 95  },
			{ laundryItemId: 'item-002', itemName: '싱글시트',     category: 'sheet',   quantity: 65  },
			{ laundryItemId: 'item-018', itemName: '매트리스커버', category: 'sheet',   quantity: 18  },
			{ laundryItemId: 'item-003', itemName: '직원유니폼',   category: 'uniform', quantity: 16  },
		], driverId: 'driver-002', shippedAt: '2026-04-29T10:00:00', createdAt: '2026-04-29T10:00:00' },
		{ id: 'ship-009', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 120 },
			{ laundryItemId: 'item-013', itemName: '소형타올',     category: 'towel',   quantity: 70  },
			{ laundryItemId: 'item-014', itemName: '베개커버',     category: 'sheet',   quantity: 110 },
			{ laundryItemId: 'item-005', itemName: '더블시트',     category: 'sheet',   quantity: 40  },
			{ laundryItemId: 'item-016', itemName: '주방앞치마',   category: 'uniform', quantity: 15  },
		], driverId: 'driver-001', shippedAt: '2026-05-01T09:00:00', createdAt: '2026-05-01T09:00:00' },
		{ id: 'ship-010', clientId: 'client-001', items: [
			{ laundryItemId: 'item-012', itemName: '중형타올',     category: 'towel',   quantity: 80  },
			{ laundryItemId: 'item-019', itemName: '발매트',       category: 'towel',   quantity: 55  },
			{ laundryItemId: 'item-022', itemName: '킹시트',       category: 'sheet',   quantity: 38  },
			{ laundryItemId: 'item-015', itemName: '이불커버',     category: 'sheet',   quantity: 45  },
			{ laundryItemId: 'item-020', itemName: '조리복',       category: 'uniform', quantity: 18  },
		], driverId: 'driver-002', shippedAt: '2026-05-03T10:00:00', createdAt: '2026-05-03T10:00:00' },
		{ id: 'ship-011', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 105 },
			{ laundryItemId: 'item-021', itemName: '헤어타올',     category: 'towel',   quantity: 90  },
			{ laundryItemId: 'item-002', itemName: '싱글시트',     category: 'sheet',   quantity: 60  },
			{ laundryItemId: 'item-017', itemName: '풀커버',       category: 'sheet',   quantity: 30  },
			{ laundryItemId: 'item-003', itemName: '직원유니폼',   category: 'uniform', quantity: 22  },
		], driverId: 'driver-001', shippedAt: '2026-05-05T09:00:00', createdAt: '2026-05-05T09:00:00' },
		{ id: 'ship-012', clientId: 'client-001', items: [
			{ laundryItemId: 'item-013', itemName: '소형타올',     category: 'towel',   quantity: 65  },
			{ laundryItemId: 'item-019', itemName: '발매트',       category: 'towel',   quantity: 50  },
			{ laundryItemId: 'item-014', itemName: '베개커버',     category: 'sheet',   quantity: 120 },
			{ laundryItemId: 'item-018', itemName: '매트리스커버', category: 'sheet',   quantity: 22  },
			{ laundryItemId: 'item-016', itemName: '주방앞치마',   category: 'uniform', quantity: 10  },
		], driverId: 'driver-002', shippedAt: '2026-05-07T10:30:00', createdAt: '2026-05-07T10:30:00' },
		{ id: 'ship-013', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',   quantity: 115 },
			{ laundryItemId: 'item-012', itemName: '중형타올',     category: 'towel',   quantity: 70  },
			{ laundryItemId: 'item-005', itemName: '더블시트',     category: 'sheet',   quantity: 55  },
			{ laundryItemId: 'item-015', itemName: '이불커버',     category: 'sheet',   quantity: 48  },
			{ laundryItemId: 'item-020', itemName: '조리복',       category: 'uniform', quantity: 25  },
		], driverId: 'driver-001', shippedAt: '2026-05-09T09:00:00', createdAt: '2026-05-09T09:00:00' },
		{ id: 'ship-014', clientId: 'client-001', items: [
			{ laundryItemId: 'item-021', itemName: '헤어타올',     category: 'towel',   quantity: 100 },
			{ laundryItemId: 'item-013', itemName: '소형타올',     category: 'towel',   quantity: 60  },
			{ laundryItemId: 'item-022', itemName: '킹시트',       category: 'sheet',   quantity: 42  },
			{ laundryItemId: 'item-017', itemName: '풀커버',       category: 'sheet',   quantity: 32  },
			{ laundryItemId: 'item-003', itemName: '직원유니폼',   category: 'uniform', quantity: 14  },
			{ laundryItemId: 'item-016', itemName: '주방앞치마',   category: 'uniform', quantity: 12  },
		], driverId: 'driver-002', shippedAt: '2026-05-11T10:00:00', createdAt: '2026-05-11T10:00:00' },
		{ id: 'ship-015', clientId: 'client-001', items: [
			{ laundryItemId: 'item-001', itemName: '대형타올',     category: 'towel',     quantity: 130 },
			{ laundryItemId: 'item-012', itemName: '중형타올',     category: 'towel',     quantity: 75  },
			{ laundryItemId: 'item-019', itemName: '발매트',       category: 'towel',     quantity: 58  },
			{ laundryItemId: 'item-002', itemName: '싱글시트',     category: 'sheet',     quantity: 72  },
			{ laundryItemId: 'item-014', itemName: '베개커버',     category: 'sheet',     quantity: 115 },
			{ laundryItemId: 'item-018', itemName: '매트리스커버', category: 'sheet',     quantity: 20  },
			{ laundryItemId: 'item-020', itemName: '조리복',       category: 'uniform',   quantity: 22  },
		], driverId: 'driver-001', shippedAt: '2026-05-13T09:00:00', createdAt: '2026-05-13T09:00:00' },
		{ id: 'ship-016', clientId: 'client-001', items: [
			{ laundryItemId: 'item-c1a', itemName: '카테고1 품목A', category: 'category1',  quantity: 30  },
			{ laundryItemId: 'item-c1b', itemName: '카테고1 품목B', category: 'category1',  quantity: 45  },
			{ laundryItemId: 'item-c2a', itemName: '카테고2 품목A', category: 'category2',  quantity: 20  },
			{ laundryItemId: 'item-c2b', itemName: '카테고2 품목B', category: 'category2',  quantity: 18  },
			{ laundryItemId: 'item-c3a', itemName: '카테고3 품목A', category: 'category3',  quantity: 15  },
			{ laundryItemId: 'item-c4a', itemName: '카테고4 품목A', category: 'category4',  quantity: 10  },
			{ laundryItemId: 'item-c5a', itemName: '카테고5 품목A', category: 'category5',  quantity: 8   },
			{ laundryItemId: 'item-c6a', itemName: '카테고6 품목A', category: 'category6',  quantity: 25  },
			{ laundryItemId: 'item-c7a', itemName: '카테고7 품목A', category: 'category7',  quantity: 12  },
			{ laundryItemId: 'item-c8a', itemName: '카테고8 품목A', category: 'category8',  quantity: 9   },
			{ laundryItemId: 'item-c9a', itemName: '카테고9 품목A', category: 'category9',  quantity: 7   },
			{ laundryItemId: 'item-c10', itemName: '카테고10 품목A', category: 'category10', quantity: 5   },
		], driverId: 'driver-001', shippedAt: '2026-05-01T09:00:00', createdAt: '2026-05-01T09:00:00' },
		// client-002 (오션뷰펜션)
		{ id: 'ship-101', clientId: 'client-002', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 45 }], driverId: 'driver-001', shippedAt: '2026-04-15T14:00:00', createdAt: '2026-04-15T14:00:00' },
		{ id: 'ship-102', clientId: 'client-002', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 60 }, { laundryItemId: 'item-007', itemName: '퀘시트', category: 'sheet', quantity: 20 }], driverId: 'driver-001', shippedAt: '2026-04-21T13:00:00', createdAt: '2026-04-21T13:00:00' },
		{ id: 'ship-103', clientId: 'client-002', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 50 }], driverId: 'driver-002', shippedAt: '2026-04-28T15:00:00', createdAt: '2026-04-28T15:00:00' },
		{ id: 'ship-104', clientId: 'client-002', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 55 }, { laundryItemId: 'item-007', itemName: '퀘시트', category: 'sheet', quantity: 25 }], driverId: 'driver-001', shippedAt: '2026-05-05T14:00:00', createdAt: '2026-05-05T14:00:00' },
		{ id: 'ship-105', clientId: 'client-002', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 70 }], driverId: 'driver-001', shippedAt: '2026-05-12T13:30:00', createdAt: '2026-05-12T13:30:00' },
		// client-003 (제주리조트)
		{ id: 'ship-201', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 150 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 40 }], driverId: 'driver-001', shippedAt: '2026-04-14T11:00:00', createdAt: '2026-04-14T11:00:00' },
		{ id: 'ship-202', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 180 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 20 }], driverId: 'driver-002', shippedAt: '2026-04-18T10:00:00', createdAt: '2026-04-18T10:00:00' },
		{ id: 'ship-203', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 160 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 35 }], driverId: 'driver-001', shippedAt: '2026-04-23T11:00:00', createdAt: '2026-04-23T11:00:00' },
		{ id: 'ship-204', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 200 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 18 }], driverId: 'driver-002', shippedAt: '2026-04-29T10:30:00', createdAt: '2026-04-29T10:30:00' },
		{ id: 'ship-205', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 170 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 45 }], driverId: 'driver-001', shippedAt: '2026-05-06T11:00:00', createdAt: '2026-05-06T11:00:00' },
		{ id: 'ship-206', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 190 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 15 }], driverId: 'driver-002', shippedAt: '2026-05-10T10:00:00', createdAt: '2026-05-10T10:00:00' },
		// client-004 (힐사이드호텔)
		{ id: 'ship-301', clientId: 'client-004', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 90 }, { laundryItemId: 'item-010', itemName: '트윈시트', category: 'sheet', quantity: 50 }], driverId: 'driver-001', shippedAt: '2026-04-16T09:00:00', createdAt: '2026-04-16T09:00:00' },
		{ id: 'ship-302', clientId: 'client-004', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 75 }, { laundryItemId: 'item-011', itemName: '프론트유니폼', category: 'uniform', quantity: 10 }], driverId: 'driver-002', shippedAt: '2026-04-22T10:00:00', createdAt: '2026-04-22T10:00:00' },
		{ id: 'ship-303', clientId: 'client-004', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 100 }, { laundryItemId: 'item-010', itemName: '트윈시트', category: 'sheet', quantity: 55 }], driverId: 'driver-001', shippedAt: '2026-04-30T09:00:00', createdAt: '2026-04-30T09:00:00' },
		{ id: 'ship-304', clientId: 'client-004', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 85 }, { laundryItemId: 'item-011', itemName: '프론트유니폼', category: 'uniform', quantity: 8 }], driverId: 'driver-002', shippedAt: '2026-05-07T10:00:00', createdAt: '2026-05-07T10:00:00' },
		{ id: 'ship-305', clientId: 'client-004', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 95 }, { laundryItemId: 'item-010', itemName: '트윈시트', category: 'sheet', quantity: 48 }], driverId: 'driver-001', shippedAt: '2026-05-13T09:30:00', createdAt: '2026-05-13T09:30:00' },
		// client-005 (선셋펜션)
		{ id: 'ship-401', clientId: 'client-005', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 35 }, { laundryItemId: 'item-007', itemName: '퀘시트', category: 'sheet', quantity: 15 }], driverId: 'driver-001', shippedAt: '2026-04-17T14:00:00', createdAt: '2026-04-17T14:00:00' },
		{ id: 'ship-402', clientId: 'client-005', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 40 }], driverId: 'driver-002', shippedAt: '2026-04-25T13:00:00', createdAt: '2026-04-25T13:00:00' },
		{ id: 'ship-403', clientId: 'client-005', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 38 }, { laundryItemId: 'item-007', itemName: '퀘시트', category: 'sheet', quantity: 18 }], driverId: 'driver-001', shippedAt: '2026-05-04T14:00:00', createdAt: '2026-05-04T14:00:00' },
		{ id: 'ship-404', clientId: 'client-005', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 45 }], driverId: 'driver-001', shippedAt: '2026-05-11T13:30:00', createdAt: '2026-05-11T13:30:00' },
		// client-006 (블루라균리조트)
		{ id: 'ship-501', clientId: 'client-006', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 200 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 60 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 25 }], driverId: 'driver-002', shippedAt: '2026-04-15T10:00:00', createdAt: '2026-04-15T10:00:00' },
		{ id: 'ship-502', clientId: 'client-006', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 220 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 55 }], driverId: 'driver-001', shippedAt: '2026-04-20T11:00:00', createdAt: '2026-04-20T11:00:00' },
		{ id: 'ship-503', clientId: 'client-006', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 180 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 22 }], driverId: 'driver-002', shippedAt: '2026-04-26T10:00:00', createdAt: '2026-04-26T10:00:00' },
		{ id: 'ship-504', clientId: 'client-006', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 240 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 65 }], driverId: 'driver-001', shippedAt: '2026-05-03T11:00:00', createdAt: '2026-05-03T11:00:00' },
		{ id: 'ship-505', clientId: 'client-006', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 210 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 20 }], driverId: 'driver-002', shippedAt: '2026-05-09T10:30:00', createdAt: '2026-05-09T10:30:00' },
		{ id: 'ship-506', clientId: 'client-006', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 230 }, { laundryItemId: 'item-008', itemName: '킹시트', category: 'sheet', quantity: 58 }, { laundryItemId: 'item-009', itemName: '조리복', category: 'uniform', quantity: 18 }], driverId: 'driver-001', shippedAt: '2026-05-13T11:00:00', createdAt: '2026-05-13T11:00:00' },
	]);


	let clientItemPrices  = $state<{ clientId: string; category: string; itemName: string; unitPrice: number }[]>([
		{ clientId: 'client-001', category: 'towel',   itemName: '대형타올',     unitPrice: 800  },
		{ clientId: 'client-001', category: 'towel',   itemName: '중형타올',     unitPrice: 650  },
		{ clientId: 'client-001', category: 'towel',   itemName: '소형타올',     unitPrice: 500  },
		{ clientId: 'client-001', category: 'towel',   itemName: '헤어타올',     unitPrice: 450  },
		{ clientId: 'client-001', category: 'towel',   itemName: '발매트',       unitPrice: 700  },
		{ clientId: 'client-001', category: 'sheet',   itemName: '싱글시트',     unitPrice: 1200 },
		{ clientId: 'client-001', category: 'sheet',   itemName: '더블시트',     unitPrice: 1500 },
		{ clientId: 'client-001', category: 'sheet',   itemName: '킹시트',       unitPrice: 1800 },
		{ clientId: 'client-001', category: 'sheet',   itemName: '베개커버',     unitPrice: 400  },
		{ clientId: 'client-001', category: 'sheet',   itemName: '이불커버',     unitPrice: 1100 },
		{ clientId: 'client-001', category: 'sheet',   itemName: '풀커버',       unitPrice: 900  },
		{ clientId: 'client-001', category: 'sheet',   itemName: '매트리스커버', unitPrice: 2000 },
		{ clientId: 'client-001', category: 'uniform', itemName: '직원유니폼',   unitPrice: 2500 },
		{ clientId: 'client-001', category: 'uniform', itemName: '주방앞치마',   unitPrice: 1500 },
		{ clientId: 'client-001', category: 'uniform', itemName: '조리복',       unitPrice: 3000 },
		{ clientId: 'client-002', category: 'towel',   itemName: '소형타올',     unitPrice: 600  },
		{ clientId: 'client-002', category: 'sheet',   itemName: '퀸시트',       unitPrice: 1800 },
		{ clientId: 'client-003', category: 'towel',   itemName: '바스타올',     unitPrice: 1000 },
		{ clientId: 'client-003', category: 'sheet',   itemName: '킹시트',       unitPrice: 2200 },
		{ clientId: 'client-003', category: 'uniform', itemName: '조리복',       unitPrice: 3000 },
		{ clientId: 'client-004', category: 'towel',   itemName: '대형타올',     unitPrice: 850  },
		{ clientId: 'client-004', category: 'sheet',   itemName: '트윈시트',     unitPrice: 1400 },
		{ clientId: 'client-004', category: 'uniform', itemName: '프론트유니폼', unitPrice: 2800 },
		{ clientId: 'client-005', category: 'towel',   itemName: '소형타올',     unitPrice: 650  },
		{ clientId: 'client-005', category: 'sheet',   itemName: '퀸시트',       unitPrice: 1700 },
		{ clientId: 'client-006', category: 'towel',   itemName: '바스타올',     unitPrice: 1100 },
		{ clientId: 'client-006', category: 'sheet',   itemName: '킹시트',       unitPrice: 2400 },
		{ clientId: 'client-006', category: 'uniform', itemName: '조리복',       unitPrice: 3200 },
	]);

	function getUnitPrice(clientId: string, category: string, itemName: string): number {
		const p = clientItemPrices.find(pr => pr.clientId === clientId && pr.category === category && pr.itemName === itemName);
		return p?.unitPrice ?? 0;
	}

	function buildInvoiceLines(clientId: string, from: string, to: string): InvoiceLine[] {
		const fromTs = new Date(from + 'T00:00:00').getTime();
		const toTs = new Date(to + 'T23:59:59').getTime();
		const inRange = shipments.filter(s => {
			if (s.clientId !== clientId) return false;
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs;
		});
		const map: Record<string, InvoiceLine> = {};
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

	// ── 포맷 함수 ──
	function formatDate(d: string) { return d.replace(/-/g, '.').slice(0, 10); }
	function formatMoney(n: number) { return n.toLocaleString('ko-KR') + '원'; }

	// ── 탭 ──
	type BillingTab = 'invoice' | 'statement';
	const tabState = $state({ active: 'invoice' as BillingTab });
	function switchTab(t: BillingTab) { tabState.active = t; }

	// ── 거래처 선택 ──
	let selectedClientId = $state<string>(clients[0]?.id ?? '');
	const selectedClient = $derived(clients.find((c) => c.id === selectedClientId) ?? null);

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
		const itemSet: Record<string, { category: string; itemName: string }> = {};
		for (const s of ships) {
			for (const item of s.items) {
				const key = `${item.category}__${item.itemName}`;
				if (!itemSet[key]) itemSet[key] = { category: item.category, itemName: item.itemName };
			}
		}

		// 카테고리 → 품목명 정렬
		const catOrder: Record<string, number> = { towel: 0, sheet: 1, uniform: 2 };
		const itemList = Object.entries(itemSet)
			.map(([key, v]) => ({ key, ...v }))
			.sort((a, b) => {
				const co = (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
				return co !== 0 ? co : a.itemName.localeCompare(b.itemName);
			});

		// 카테고리 그룹 계산 (행 방향)
		const catGroups: StmtCatGroup[] = [];
		let lastCat = '';
		for (let i = 0; i < itemList.length; i++) {
			const cat = itemList[i].category;
			if (cat !== lastCat) {
				catGroups.push({ category: cat, label: CATEGORY_LABELS[cat as 'towel'|'sheet'|'uniform'] ?? cat, startIdx: i, count: 1 });
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

	function openSupplierThenPdf() {
		if (!selectedClient || invoiceLines.length === 0) return;
		supplierEdit = loadSupplier();
		showSupplierModal = true;
	}

	async function confirmSupplierAndPdf() {
		saveSupplier(supplierEdit);
		showSupplierModal = false;
		pdfGenerating = true;
		showPdfModal  = true;
		pdfBlobUrl    = null;
		await tick();
		try {
			const url = await generateInvoicePdf();
			pdfBlobUrl = url;
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

	async function generateInvoicePdf(): Promise<string> {
		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

		// ── 나눔고딕 Regular + Bold 로드 ──
		const [fontRegResp, fontBoldResp] = await Promise.all([
			fetch('/NanumGothic-Regular.ttf'),
			fetch('/NanumGothic-Bold.ttf'),
		]);
		if (!fontRegResp.ok)  throw new Error(`폰트 로드 실패(Regular): ${fontRegResp.status}`);
		if (!fontBoldResp.ok) throw new Error(`폰트 로드 실패(Bold): ${fontBoldResp.status}`);
		const [fontRegBuf, fontBoldBuf] = await Promise.all([fontRegResp.arrayBuffer(), fontBoldResp.arrayBuffer()]);
		doc.addFileToVFS('NanumGothic-Regular.ttf', arrayBufferToBase64(fontRegBuf));
		doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
		doc.addFileToVFS('NanumGothic-Bold.ttf', arrayBufferToBase64(fontBoldBuf));
		doc.addFont('NanumGothic-Bold.ttf', 'NanumGothic', 'bold');

		const pageW   = doc.internal.pageSize.getWidth(); // 210mm
		const margin  = 12;
		const cW      = pageW - margin * 2; // 186mm
		let   y       = margin;

		// ── 공급자 상태 사용 ──
		const SUPPLIER = supplierEdit;

		// ── 금액 계산 ──
		const supplyAmount = invoiceTotal;
		const vatRaw     = Math.floor(supplyAmount * 0.1);
		const vat        = Math.floor(vatRaw / 10) * 10;   // 10원 미만 절사
		const jeolsa     = vatRaw - vat;                    // 절사액 (양수, 표시는 음수)
		const grandTotal = supplyAmount + vat;

		// ═══════════════════════════════════════
		// 1. 제목
		// ═══════════════════════════════════════
		// ── 제목 텍스트: YYYY년 MM월 청구서 ──
		const titleDate = (() => {
			const d = new Date(periodTo + 'T00:00:00');
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
			const d = new Date(periodTo + 'T00:00:00');
			return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
		})();
		doc.setFont('NanumGothic', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(75, 90, 115);
		doc.text(dateStr, margin + 5, y + 10);

		doc.setFont('NanumGothic', 'bold');
		doc.setFontSize(13);
		doc.setTextColor(10, 20, 45);
		doc.text(selectedClient?.name ?? '-', margin + 5, y + 24);
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
		doc.text(`청구기간: ${periodFrom} ~ ${periodTo}`, margin + cW - 3, y + 7.2, { align: 'right' });
		y += 15;

		// ═══════════════════════════════════════
		// 4. 품목 테이블
		// ═══════════════════════════════════════
		const catLabelMap: Record<string, string> = { towel: '수건', sheet: '시트', uniform: '유니폼' };
		const col1 = 24; const col2 = 20; const col3 = 36; const col4 = 40;
		const col0 = cW - col1 - col2 - col3 - col4;
		const totalQty = invoiceLines.reduce((s, l) => s + l.quantity, 0);
		autoTable(doc, {
			startY: y,
			margin: { left: margin, right: margin },
			head: [['품목명', '구분', '수량', '단가', '금액']],
			body: invoiceLines.map(l => [
				l.itemName,
				catLabelMap[l.category] ?? l.category,
				l.quantity.toLocaleString(),
				l.unitPrice > 0 ? `${l.unitPrice.toLocaleString()} 원` : '-',
				`${l.amount.toLocaleString()} 원`,
			]),
			foot: [['품목합계', '', totalQty.toLocaleString(), '', `${supplyAmount.toLocaleString()} 원`]],
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
		const S_CAT_HEAD: Record<string, Cell['style']> = {
			towel:   { bold: true, fontSize: 10, align: 'center', bgColor: 'E0F2FE', fontColor: '0369A1', border: true },
			sheet:   { bold: true, fontSize: 10, align: 'center', bgColor: 'E0E7FF', fontColor: '4338CA', border: true },
			uniform: { bold: true, fontSize: 10, align: 'center', bgColor: 'FEF3C7', fontColor: '92400E', border: true },
		};
		const S_ITEM_HEAD: Record<string, Cell['style']> = {
			towel:   { bold: true, fontSize: 9, align: 'left', bgColor: 'F0F9FF', fontColor: '075985', border: true, wrapText: true },
			sheet:   { bold: true, fontSize: 9, align: 'left', bgColor: 'EEF2FF', fontColor: '3730A3', border: true, wrapText: true },
			uniform: { bold: true, fontSize: 9, align: 'left', bgColor: 'FFFBEB', fontColor: '78350F', border: true, wrapText: true },
		};
		const S_DAY_HEAD:     Cell['style'] = { bold: true, fontSize: 9,  align: 'center', bgColor: 'F8FAFC', fontColor: '334155', border: true };
		const S_SUBTOTAL_HEAD: Cell['style'] = { bold: true, fontSize: 9, align: 'center', bgColor: 'F1F5F9', fontColor: '475569', border: true };
		const S_CELL_TOWEL:   Cell['style'] = { fontSize: 9, align: 'center', fontColor: '0369A1', border: true, numFmt: '#,##0' };
		const S_CELL_SHEET:   Cell['style'] = { fontSize: 9, align: 'center', fontColor: '4338CA', border: true, numFmt: '#,##0' };
		const S_CELL_UNIFORM: Cell['style'] = { fontSize: 9, align: 'center', fontColor: '92400E', border: true, numFmt: '#,##0' };
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
			const catStyle  = S_CAT_HEAD[cg.category] ?? S_CAT_HEAD['towel'];
			const itemStyle = S_ITEM_HEAD[cg.category] ?? S_ITEM_HEAD['towel'];
			const cellStyle = cg.category === 'towel' ? S_CELL_TOWEL : cg.category === 'sheet' ? S_CELL_SHEET : S_CELL_UNIFORM;

			for (let ri = 0; ri < groupRows.length; ri++) {
				const row   = groupRows[ri];
				const altBg = (cg.startIdx + ri) % 2 === 1;
				const bgAlt = cg.category === 'towel' ? 'F0F9FF' : cg.category === 'sheet' ? 'EEF2FF' : 'FFFBEB';
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
			const labelStyle: Cell['style'] = {
				bold: true, fontSize: 10, align: 'left',
				bgColor:   cg.category === 'towel' ? 'F0F9FF' : cg.category === 'sheet' ? 'EEF2FF' : 'FFFBEB',
				fontColor: cg.category === 'towel' ? '0369A1' : cg.category === 'sheet' ? '4338CA' : '92400E',
				border: true,
			};
			const valStyle: Cell['style'] = {
				bold: true, fontSize: 11, align: 'center',
				bgColor:   cg.category === 'towel' ? 'E0F2FE' : cg.category === 'sheet' ? 'E0E7FF' : 'FEF3C7',
				fontColor: cg.category === 'towel' ? '0369A1' : cg.category === 'sheet' ? '4338CA' : '92400E',
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
		const S_CAT: Record<string, Cell['style']> = {
			towel:   { bold: true, fontSize: 10, align: 'center', bgColor: 'E0F2FE', fontColor: '0369A1', border: true },
			sheet:   { bold: true, fontSize: 10, align: 'center', bgColor: 'E0E7FF', fontColor: '4338CA', border: true },
			uniform: { bold: true, fontSize: 10, align: 'center', bgColor: 'FEF3C7', fontColor: '92400E', border: true },
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
		if (selectedClient.businessNo) {
			sheetRows.push({ cells: [{ value: '사업자번호', style: S_LABEL }, { value: selectedClient.businessNo, style: { fontSize: 10, border: true } }, { value: '' }, { value: '' }, { value: '' }], height: 17 }); R++;
		}
		if (selectedClient.ownerName) {
			sheetRows.push({ cells: [{ value: '대표자', style: S_LABEL }, { value: selectedClient.ownerName, style: { fontSize: 10, border: true } }, { value: '' }, { value: '' }, { value: '' }], height: 17 }); R++;
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
				{ value: CATEGORY_LABELS[line.category], style: S_CAT[line.category] ?? S_HEAD },
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
	const categoryBadge: Record<string, string> = {
		towel:   'badge-info',
		sheet:   'badge-secondary',
		uniform: 'badge-warning'
	};
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
				<select class="select select-bordered select-sm font-bold min-w-36" bind:value={selectedClientId}>
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
									{#each (['towel', 'sheet', 'uniform'] as const) as cat (cat)}
										{@const catLines = invoiceLines.filter((l) => l.category === cat)}
										{#if catLines.length > 0}
											<tr class="bg-base-200/50">
												<td colspan="4" class="py-2 pl-3">
													<span class="inline-flex items-center gap-1.5">
														<span class="h-2 w-2 rounded-full {categoryColor[cat]}"></span>
														<span class="text-xs font-bold {categoryBadge[cat].includes('info') ? 'text-info' : categoryBadge[cat].includes('primary') ? 'text-primary' : 'text-warning'}">{CATEGORY_LABELS[cat]}</span>
														{#if invoiceByCategory[cat]}
															<span class="ml-2 text-[11px] text-base-content/40">소계 {invoiceByCategory[cat].qty.toLocaleString()}개</span>
														{/if}
													</span>
												</td>
											</tr>
											{#each catLines as line (line.category + line.itemName)}
												<tr class="hover">
													<td class="pl-8 font-medium">{line.itemName}</td>
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
										<span class="text-sm">{CATEGORY_LABELS[cat] ?? cat}</span>
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
						<div class="card bg-base-100 shadow-sm overflow-hidden">

							<!-- ── 컨럼 헤더 (sticky) ── -->
							<div class="sticky top-0 z-10 grid border-b border-base-200 bg-base-100 shadow-sm"
								 style="grid-template-columns: 6rem 1fr 1fr 1fr 6rem;">
								<!-- 날짜 -->
								<div class="flex items-center justify-center px-3 py-3.5 border-r border-base-200">
									<span class="text-xs font-bold uppercase tracking-widest text-base-content/40">날짜</span>
								</div>
								<!-- 타월 -->
								<div class="flex items-center gap-2 border-r border-base-200 px-4 py-3.5" style="border-top: 3px solid oklch(var(--in));">
									<span class="h-2.5 w-2.5 rounded-full bg-info shrink-0"></span>
									<span class="text-sm font-bold text-info">타월</span>
									{#if statementData.catTotals['towel'] > 0}
										<span class="ml-auto text-xs font-semibold text-info tabular-nums">{statementData.catTotals['towel'].toLocaleString()}개</span>
									{/if}
								</div>
								<!-- 시트 -->
								<div class="flex items-center gap-2 border-r border-base-200 px-4 py-3.5" style="border-top: 3px solid oklch(var(--p));">
									<span class="h-2.5 w-2.5 rounded-full bg-primary shrink-0"></span>
									<span class="text-sm font-bold text-primary">시트</span>
									{#if statementData.catTotals['sheet'] > 0}
										<span class="ml-auto text-xs font-semibold text-primary tabular-nums">{statementData.catTotals['sheet'].toLocaleString()}개</span>
									{/if}
								</div>
								<!-- 유니폼 -->
								<div class="flex items-center gap-2 border-r border-base-200 px-4 py-3.5" style="border-top: 3px solid oklch(var(--wa));">
									<span class="h-2.5 w-2.5 rounded-full bg-warning shrink-0"></span>
									<span class="text-sm font-bold text-warning">유니폼</span>
									{#if statementData.catTotals['uniform'] > 0}
										<span class="ml-auto text-xs font-semibold text-warning tabular-nums">{statementData.catTotals['uniform'].toLocaleString()}개</span>
									{/if}
								</div>
								<!-- 합계 -->
								<div class="flex items-center justify-end px-4 py-3.5">
									<span class="text-xs font-bold uppercase tracking-widest text-base-content/40">합계</span>
								</div>
							</div>

							<!-- ── 스크롤 바디 ── -->
							<div style="max-height: 65vh; overflow-y: auto;">
								{#each statementData.dailyRows as drow (drow.date)}
									{@const dow      = ['일','월','화','수','목','금','토'][new Date(drow.date).getDay()]}
									{@const isWeekend = new Date(drow.date).getDay() === 0 || new Date(drow.date).getDay() === 6}
									{@const towelItems   = drow.items.filter(it => it.category === 'towel')}
									{@const sheetItems   = drow.items.filter(it => it.category === 'sheet')}
									{@const uniformItems = drow.items.filter(it => it.category === 'uniform')}

									<div class="grid border-b border-base-200 last:border-b-0 transition-colors hover:bg-base-200/30 {isWeekend ? 'bg-error/5' : 'bg-base-100'}"
										 style="grid-template-columns: 6rem 1fr 1fr 1fr 6rem;">

										<!-- 날짜 셀 -->
										<div class="flex flex-col items-center justify-center border-r border-base-200 py-4 px-2 {isWeekend ? 'bg-error/10' : ''}">
											{#if isMultiMonth}
												<span class="text-[10px] font-semibold text-base-content/40 leading-none mb-1">{drow.date.slice(5,7)}월</span>
											{/if}
											<span class="text-3xl font-black leading-none tabular-nums {isWeekend ? 'text-error' : ''}">{drow.date.slice(8,10)}</span>
											<span class="mt-1.5 text-xs font-bold {isWeekend ? 'text-error/70' : 'text-base-content/40'}">{dow}</span>
										</div>

										<!-- 타월 셀 -->
										<div class="border-r border-base-200 px-4 py-3.5" style="border-left: 2px solid oklch(var(--in) / 0.3);">
											{#if towelItems.length > 0}
												<div class="space-y-1.5">
													{#each towelItems as it (it.itemName)}
														<div class="flex items-center justify-between gap-2">
															<span class="text-sm leading-snug">{it.itemName}</span>
															<span class="shrink-0 text-sm font-bold tabular-nums text-info">{it.quantity.toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span></span>
														</div>
													{/each}
												</div>
											{:else}
												<span class="text-base text-base-content/20 select-none">—</span>
											{/if}
										</div>

										<!-- 시트 셀 -->
										<div class="border-r border-base-200 px-4 py-3.5" style="border-left: 2px solid oklch(var(--p) / 0.3);">
											{#if sheetItems.length > 0}
												<div class="space-y-1.5">
													{#each sheetItems as it (it.itemName)}
														<div class="flex items-center justify-between gap-2">
															<span class="text-sm leading-snug">{it.itemName}</span>
															<span class="shrink-0 text-sm font-bold tabular-nums text-primary">{it.quantity.toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span></span>
														</div>
													{/each}
												</div>
											{:else}
												<span class="text-base text-base-content/20 select-none">—</span>
											{/if}
										</div>

										<!-- 유니폼 셀 -->
										<div class="border-r border-base-200 px-4 py-3.5" style="border-left: 2px solid oklch(var(--wa) / 0.3);">
											{#if uniformItems.length > 0}
												<div class="space-y-1.5">
													{#each uniformItems as it (it.itemName)}
														<div class="flex items-center justify-between gap-2">
															<span class="text-sm leading-snug">{it.itemName}</span>
															<span class="shrink-0 text-sm font-bold tabular-nums text-warning">{it.quantity.toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span></span>
														</div>
													{/each}
												</div>
											{:else}
												<span class="text-base text-base-content/20 select-none">—</span>
											{/if}
										</div>

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
								 style="grid-template-columns: 6rem 1fr 1fr 1fr 6rem;">
								<div class="flex items-center justify-center px-3 py-3 border-r border-base-200">
									<span class="text-xs font-bold">{statementData.activeDays}일</span>
								</div>
								<div class="flex items-center justify-between px-4 py-3 border-r border-base-200">
									{#if statementData.catTotals['towel'] > 0}
										<span class="text-xs text-base-content/40">소계</span>
										<span class="text-sm font-black tabular-nums text-info">{statementData.catTotals['towel'].toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span></span>
									{:else}
										<span class="text-sm text-base-content/20">—</span>
									{/if}
								</div>
								<div class="flex items-center justify-between px-4 py-3 border-r border-base-200">
									{#if statementData.catTotals['sheet'] > 0}
										<span class="text-xs text-base-content/40">소계</span>
										<span class="text-sm font-black tabular-nums text-primary">{statementData.catTotals['sheet'].toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span></span>
									{:else}
										<span class="text-sm text-base-content/20">—</span>
									{/if}
								</div>
								<div class="flex items-center justify-between px-4 py-3 border-r border-base-200">
									{#if statementData.catTotals['uniform'] > 0}
										<span class="text-xs text-base-content/40">소계</span>
										<span class="text-sm font-black tabular-nums text-warning">{statementData.catTotals['uniform'].toLocaleString()}<span class="ml-0.5 text-xs font-normal text-base-content/40">개</span></span>
									{:else}
										<span class="text-sm text-base-content/20">—</span>
									{/if}
								</div>
								<div class="flex flex-col items-end justify-center px-4 py-3">
									<span class="text-base font-black tabular-nums">{statementData.grandTotal.toLocaleString()}</span>
									<span class="text-xs text-base-content/40">개</span>
								</div>
							</div>

						</div>
					{/if}
			{/if}
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




