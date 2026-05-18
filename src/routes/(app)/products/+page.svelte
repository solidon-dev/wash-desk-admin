<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { goto, invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { createListStore } from '$lib';
	import type { PageProps, PageData } from './$types';

	// ── 서버 데이터 ───────────────────────────────────────────────
	let { data }: PageProps = $props();

	type Item = PageData['items'][number];
	type Price = { id: string; item_id: string; unit_price: number; effective_from: string };

	// ── 낙관적 로컬 상태 (CONVENTIONS 섹션 3 — createListStore 패턴)
	const itemStore = createListStore(() => data.items);
	const priceStore = createListStore(() => data.itemPrices as Price[]);
	const categoryStore = createListStore(() => data.categories);
	const sortedCategories = $derived(
		[...categoryStore.items].sort((a, b) => a.sort_order - b.sort_order)
	);

	// ── 토스트 ────────────────────────────────────────────────────
	type Toast = { id: number; msg: string; type: 'error' | 'success' };
	let toasts = $state<Toast[]>([]);
	let _toastId = 0;
	function showToast(msg: string, type: Toast['type'] = 'error') {
		const id = ++_toastId;
		toasts = [...toasts, { id, msg, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 3500);
	}

	// ── 거래처 선택 ────────────────────────────────────────────────
	// 무효 id가 내려온 경우 첫 번째 거래처로 재진입 (쿠키는 서버에서 이미 삭제)
	$effect(() => {
		if (data.invalidClientId) {
			const fallback = data.clients[0]?.id;
			if (fallback) goto(`?clientId=${fallback}`, { replaceState: true });
		}
	});

	const selectedClientId = $derived(data.selectedClientId ?? null);

	const selectedClient = $derived(data.clients.find((c) => c.id === selectedClientId) ?? null);

	function selectClient(id: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('clientId', id);
		showClientModal = false;
		goto(url.toString(), { replaceState: true });
	}

	// 거래처 선택 모달
	let showClientModal = $state(false);
	const clientSearchItems = $derived(
		data.clients.map((c) => ({ id: c.id, label: c.name, sub: '' }))
	);

	// ── 카테고리 ───────────────────────────────────────────────────
	let selectedCategoryId = $state<string | null>(null);

	const effectiveCategoryId = $derived.by(() => {
		const cats = sortedCategories;
		if (selectedCategoryId && cats.find((c) => c.id === selectedCategoryId))
			return selectedCategoryId;
		return cats[0]?.id ?? null;
	});

	// 거래처 변경 시에만 초기화 (카테고리 추가/삭제 시에는 실행 안 되도록 격리)
	let _lastClientId: string | null = null;
	$effect(() => {
		const cid = selectedClientId;
		if (_lastClientId === null) {
			_lastClientId = cid;
			return;
		}
		if (cid === _lastClientId) return;
		_lastClientId = cid;
		selectedCategoryId = null;
		itemStore.reset();
		priceStore.reset();
		categoryStore.reset();
		resetGrid();
	});

	// 카테고리가 실제로 바뀔 때(클릭/거래처변경)만 그리드 초기화
	let _lastEffectiveCategoryId: string | null = null;
	$effect(() => {
		const cur = effectiveCategoryId;
		if (cur === _lastEffectiveCategoryId) return;
		_lastEffectiveCategoryId = cur;
		resetGrid();
	});

	// 카테고리 드래그
	let catDragSrcIdx = $state<number | null>(null);
	let catDragOverIdx = $state<number | null>(null);

	// 카테고리 순번 편집
	let editingCatOrderIdx = $state<number | null>(null);
	let catOrderInputValue = $state('');

	function startCatOrderEdit(i: number) {
		editingCatOrderIdx = i;
		catOrderInputValue = String(i + 1);
		tick().then(() => {
			const el = document.getElementById(`cat-order-input-${i}`) as HTMLInputElement | null;
			if (el) {
				el.focus();
				el.select();
			}
		});
	}

	function cancelCatOrderEdit() {
		editingCatOrderIdx = null;
	}

	// 카테고리 이름 추가 인풋
	let newCatInput = $state('');

	// ── 카테고리 삭제 확인 모달
	let deleteCatTarget = $state<string | null>(null);

	// ── 품목 그리드 ────────────────────────────────────────────────
	const currentItems = $derived(
		effectiveCategoryId
			? itemStore.items
					.filter((i) => i.category_id === effectiveCategoryId)
					.sort((a, b) => a.sort_order - b.sort_order)
			: []
	);

	type GridCol = 0 | 1 | 2 | 3 | 4 | 5;
	// col: 0=품목명, 1=단가, 2=가격적용일, 3=별칭, 4=중국어, 5=영어

	function todayYMD() {
		const d = new Date();
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
	}

	let activeRow = $state<number | null>(null);
	let nameDrafts = $state<Record<string, string>>({});
	let aliasDrafts = $state<Record<string, string>>({});
	let cnDrafts = $state<Record<string, string>>({});
	let enDrafts = $state<Record<string, string>>({});
	let priceDrafts = $state<Record<string, string>>({});
	let dateDrafts = $state<Record<string, string>>({});

	let newName = $state('');
	let newAlias = $state('');
	let newCn = $state('');
	let newEn = $state('');
	let newPrice = $state('');
	let newPriceDate = $state(todayYMD());

	let newRowSubmitTried = $state(false);
	const newRowNameOk = $derived(newName.trim().length > 0);
	const newRowPriceOk = $derived(/^[1-9]\d*$/.test(newPrice.trim())); // 1 이상 필수
	// 날짜 빈칸이면 오늘 날짜로 대체하니 유효성 체크 제외
	const newRowDateOk = $derived(!newPriceDate.trim() || isValidDate(newPriceDate));

	// ── 단가 리셋 확인 모달 ───────────────────────────────────────────────
	// 이전 날짜로 변경 시: 삭제될 이력 목록을 보여주고 확인 시 resetPrice 호출
	type PriceResetPending = {
		item: Item;
		newDate: string;
		prevDate: string;
		existingPrices: Array<{ effective_from: string; unit_price: number }>;
	};
	let priceResetPending = $state<PriceResetPending | null>(null);
	let priceResetLoading = $state(false);

	async function confirmPriceReset() {
		if (!priceResetPending) return;
		const { item, newDate } = priceResetPending;
		const price = getPrice(item.id);
		priceResetLoading = true;

		// 낙관적 업데이트: 기존 단가 row들 제거 + 새 row pending 추가
		const prevPrices = priceStore.items.filter((p) => p.item_id === item.id).slice();
		prevPrices.forEach((p) => priceStore.remove(p.id));
		const tmpResetId = `tmp-reset-${item.id}`;
		priceStore.addPending({
			id: tmpResetId,
			item_id: item.id,
			unit_price: price,
			effective_from: newDate
		});

		const form = new FormData();
		form.append('item_id', item.id);
		form.append('unit_price', String(price));
		form.append('effective_from', newDate);

		try {
			const res = await fetch(`/products?/resetPrice`, { method: 'POST', body: form });
			const { deserialize } = await import('$app/forms');
			const result = deserialize(await res.text());
			if (result.type === 'failure' || result.type === 'error') {
				// 롤백
				priceStore.removePending(tmpResetId);
				prevPrices.forEach((p) => priceStore.restoreRemoved(p.id));
				const msg =
					(result as { data?: { error?: string } }).data?.error ?? '단가 변경에 실패했습니다.';
				showToast(msg);
			} else {
				priceStore.removePending(tmpResetId);
				await invalidateAll();
			}
		} catch {
			priceStore.removePending(tmpResetId);
			prevPrices.forEach((p) => priceStore.restoreRemoved(p.id));
			showToast('네트워크 오류 — 변경사항이 취소되었습니다.');
		}

		priceResetLoading = false;
		priceResetPending = null;
	}

	function cancelPriceReset() {
		if (!priceResetPending) return;
		// draft를 이전 날짜로 되돌리기
		dateDrafts[priceResetPending.item.id] = priceResetPending.prevDate;
		priceResetPending = null;
	}

	let editingOrderRow = $state<number | null>(null);
	let orderInputValue = $state('');

	let dragSrcIdx = $state<number | null>(null);
	let dragOverIdx = $state<number | null>(null);

	// 날짜 모달
	let showDateModal = $state(false);
	let dateModalRow = $state<number | null>(null);
	let dateModalValue = $state('');

	function resetGrid() {
		activeRow = null;
		nameDrafts = {};
		aliasDrafts = {};
		cnDrafts = {};
		enDrafts = {};
		priceDrafts = {};
		dateDrafts = {};
		newName = '';
		newAlias = '';
		newCn = '';
		newEn = '';
		newPrice = '';
		newPriceDate = todayYMD();
		newRowSubmitTried = false;
		showDateModal = false;
		dateModalRow = null;
		dateModalValue = '';
		editingCatOrderIdx = null;
		catOrderInputValue = '';
		catDragSrcIdx = null;
		catDragOverIdx = null;
	}

	function isValidDate(str: string) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
		return !isNaN(new Date(str).getTime());
	}

	// 숫자만 입력받아 YYYY-MM-DD 형태로 자동 포맷
	function formatDateInput(raw: string): string {
		const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
		if (digits.length <= 4) return digits;
		if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
		return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
	}

	// 단가/날짜 디스플레이 헬퍼
	function getPrice(itemId: string): number {
		return priceStore.items.find((p) => p.item_id === itemId)?.unit_price ?? 0;
	}
	function getPriceDate(itemId: string): string {
		return priceStore.items.find((p) => p.item_id === itemId)?.effective_from ?? '';
	}

	function getDisplayName(item: Item) {
		return nameDrafts[item.id] ?? item.name_ko;
	}
	function getDisplayAlias(item: Item) {
		return aliasDrafts[item.id] ?? item.nickname ?? '';
	}
	function getDisplayCn(item: Item) {
		return cnDrafts[item.id] ?? item.name_zh ?? '';
	}
	function getDisplayEn(item: Item) {
		return enDrafts[item.id] ?? item.name_en ?? '';
	}
	function getDisplayPrice(item: Item) {
		if (priceDrafts[item.id] !== undefined) return priceDrafts[item.id];
		const p = getPrice(item.id);
		return p > 0 ? String(p) : '';
	}
	function getDisplayDate(item: Item) {
		return dateDrafts[item.id] ?? getPriceDate(item.id);
	}

	// 셀 포커스 시 드래프트 초기화
	function onCellFocus(row: number, col: GridCol) {
		activeRow = row;
		if (row >= currentItems.length) return;
		const item = currentItems[row];
		if (col === 0 && nameDrafts[item.id] === undefined) nameDrafts[item.id] = item.name_ko;
		if (col === 1 && priceDrafts[item.id] === undefined)
			priceDrafts[item.id] = getPrice(item.id) > 0 ? String(getPrice(item.id)) : '';
		if (col === 2 && dateDrafts[item.id] === undefined) dateDrafts[item.id] = getPriceDate(item.id);
		if (col === 3 && aliasDrafts[item.id] === undefined) aliasDrafts[item.id] = item.nickname ?? '';
		if (col === 4 && cnDrafts[item.id] === undefined) cnDrafts[item.id] = item.name_zh ?? '';
		if (col === 5 && enDrafts[item.id] === undefined) enDrafts[item.id] = item.name_en ?? '';
	}

	async function moveFocus(row: number, col: GridCol) {
		const maxRow = currentItems.length;
		const clampedRow = Math.max(0, Math.min(row, maxRow));
		activeRow = clampedRow;
		await tick();
		const el = document.getElementById(`cell-${clampedRow}-${col}`) as HTMLElement | null;
		if (el) {
			el.focus();
			if ('select' in el) (el as HTMLInputElement).select();
		}
	}

	// ── submit 헬퍼 ──────────────────────────────────────────────
	// 낙관적 업데이트용: 로컬 상태 먼저 바꾸고 백그라운드로 서버 동기화
	// onRollback: 실패 시 되돌리는 함수
	async function submitBg(
		action: string,
		payload: Record<string, string>,
		onRollback?: () => void
	): Promise<boolean> {
		const form = new FormData();
		for (const [k, v] of Object.entries(payload)) form.append(k, v);
		try {
			const res = await fetch(`/products?/${action}`, { method: 'POST', body: form });
			const text = await res.text();
			const result = deserialize(text);
			if (result.type === 'failure' || result.type === 'error') {
				onRollback?.();
				const msg = (result as { data?: { error?: string } }).data?.error ?? '저장 실패';
				showToast(`저장 실패 — ${msg}`);
				return false;
			}
			return true;
		} catch {
			onRollback?.();
			showToast('네트워크 오류 — 변경사항이 취소되었습니다.');
			return false;
		}
	}

	// 구조 변경(카테고리/품목 추가·삭제·순서)은 서버 상태 재로드 필요
	async function submitAndReload(
		action: string,
		payload: Record<string, string>
	): Promise<boolean> {
		const form = new FormData();
		for (const [k, v] of Object.entries(payload)) form.append(k, v);
		try {
			const res = await fetch(`/products?/${action}`, { method: 'POST', body: form });
			const text = await res.text();
			const result = deserialize(text);
			if (result.type === 'failure' || result.type === 'error') {
				const msg = (result as { data?: { error?: string } }).data?.error ?? '저장 실패';
				showToast(`저장 실패 — ${msg}`);
				return false;
			}
			await invalidateAll();
			return true;
		} catch {
			showToast('네트워크 오류 — 변경사항이 취소되었습니다.');
			return false;
		}
	}

	// ── 품목 셀 commit (낙관적 업데이트) ────────────────────────
	function patchLocalItem(id: string, patch: Partial<Item>) {
		const cur = itemStore.items.find((i) => i.id === id);
		if (cur) itemStore.override(id, { ...cur, ...patch });
	}
	function rollbackLocalItem(id: string) {
		itemStore.clear(id);
	}

	function patchLocalPrice(itemId: string, patch: Partial<Price>) {
		const cur = priceStore.items.find((p) => p.item_id === itemId);
		if (cur) {
			priceStore.override(cur.id, { ...cur, ...patch });
		} else {
			priceStore.addPending({
				id: `tmp-price-${itemId}`,
				item_id: itemId,
				unit_price: 0,
				effective_from: todayYMD(),
				...patch
			});
		}
	}
	function rollbackLocalPrice(itemId: string) {
		const cur = priceStore.items.find((p) => p.item_id === itemId);
		if (cur) priceStore.clear(cur.id);
	}

	function commitName(item: Item) {
		const draft = nameDrafts[item.id];
		if (draft === undefined) return;
		const newN = draft.trim();
		delete nameDrafts[item.id];
		if (!newN || newN === item.name_ko) return;
		patchLocalItem(item.id, { name_ko: newN });
		submitBg(
			'upsertItem',
			{
				id: item.id,
				category_id: item.category_id,
				client_id: item.client_id,
				name_ko: newN,
				name_en: item.name_en ?? '',
				name_zh: item.name_zh ?? '',
				nickname: item.nickname ?? ''
			},
			() => rollbackLocalItem(item.id)
		);
	}

	function commitAlias(item: Item) {
		const draft = aliasDrafts[item.id];
		if (draft === undefined) return;
		delete aliasDrafts[item.id];
		const val = draft.trim();
		if (val === (item.nickname ?? '')) return;
		patchLocalItem(item.id, { nickname: val || null });
		submitBg(
			'upsertItem',
			{
				id: item.id,
				category_id: item.category_id,
				client_id: item.client_id,
				name_ko: item.name_ko,
				name_en: item.name_en ?? '',
				name_zh: item.name_zh ?? '',
				nickname: val
			},
			() => rollbackLocalItem(item.id)
		);
	}

	function commitCn(item: Item) {
		const draft = cnDrafts[item.id];
		if (draft === undefined) return;
		delete cnDrafts[item.id];
		const val = draft.trim();
		if (val === (item.name_zh ?? '')) return;
		patchLocalItem(item.id, { name_zh: val || null });
		submitBg(
			'upsertItem',
			{
				id: item.id,
				category_id: item.category_id,
				client_id: item.client_id,
				name_ko: item.name_ko,
				name_en: item.name_en ?? '',
				name_zh: val,
				nickname: item.nickname ?? ''
			},
			() => rollbackLocalItem(item.id)
		);
	}

	function commitEn(item: Item) {
		const draft = enDrafts[item.id];
		if (draft === undefined) return;
		delete enDrafts[item.id];
		const val = draft.trim();
		if (val === (item.name_en ?? '')) return;
		patchLocalItem(item.id, { name_en: val || null });
		submitBg(
			'upsertItem',
			{
				id: item.id,
				category_id: item.category_id,
				client_id: item.client_id,
				name_ko: item.name_ko,
				name_en: val,
				name_zh: item.name_zh ?? '',
				nickname: item.nickname ?? ''
			},
			() => rollbackLocalItem(item.id)
		);
	}

	function commitPrice(item: Item) {
		const draft = priceDrafts[item.id];
		if (draft === undefined) return;
		delete priceDrafts[item.id];
		if (!selectedClientId) return;
		const price = parseInt(draft.replace(/[^0-9]/g, '') || '0', 10);
		const prevPrice = getPrice(item.id);
		if (price === prevPrice) return; // 변화 없으면 서버 요청 안 함
		const date = getPriceDate(item.id) || todayYMD();
		patchLocalPrice(item.id, { unit_price: price });
		submitBg(
			'upsertPrice',
			{
				item_id: item.id,
				unit_price: String(price),
				effective_from: date
			},
			() => rollbackLocalPrice(item.id)
		);
	}

	function commitDate(item: Item) {
		const draft = dateDrafts[item.id];
		if (draft === undefined) return;
		delete dateDrafts[item.id];
		if (!selectedClientId) return;
		const raw = draft.trim();
		if (raw && !isValidDate(raw)) return;
		const val = raw || todayYMD();
		const prevDate = getPriceDate(item.id);
		if (val === prevDate) return; // 변화 없으면 서버 요청 안 함

		// 이전 날짜로 변경하는 경우 → 기존 이력 전체 삭제 후 교체 확인 모달
		if (prevDate && val < prevDate) {
			const existingPrices = priceStore.items
				.filter((p) => p.item_id === item.id)
				.map((p) => ({ effective_from: p.effective_from, unit_price: p.unit_price }))
				.sort((a, b) => a.effective_from.localeCompare(b.effective_from));
			priceResetPending = { item, newDate: val, prevDate, existingPrices };
			return;
		}

		// 이후 날짜로 변경 → 기존대로 upsert
		const price = getPrice(item.id);
		patchLocalPrice(item.id, { effective_from: val });
		submitBg(
			'upsertPrice',
			{
				item_id: item.id,
				unit_price: String(price),
				effective_from: val
			},
			() => rollbackLocalPrice(item.id)
		);
	}

	// commit은 이제 동기적 (낙관적 업데이트, bg fetch는 fire-and-forget)
	function commitCell(row: number, col: GridCol) {
		if (row >= currentItems.length) return;
		const item = currentItems[row];
		if (col === 0) commitName(item);
		else if (col === 1) commitPrice(item);
		else if (col === 2) commitDate(item);
		else if (col === 3) commitAlias(item);
		else if (col === 4) commitCn(item);
		else if (col === 5) commitEn(item);
	}

	async function handleCellKeydown(e: KeyboardEvent, row: number, col: GridCol) {
		const newRowIdx = currentItems.length;
		const isNewRow = row === newRowIdx;

		switch (e.key) {
			case 'ArrowUp':
				e.preventDefault();
				commitCell(row, col);
				if (row > 0) moveFocus(row - 1, col);
				break;
			case 'ArrowDown':
				e.preventDefault();
				commitCell(row, col);
				moveFocus(row + 1, col);
				break;
			case 'Enter':
				e.preventDefault();
				if (isNewRow) await addItemAndContinue();
				else {
					commitCell(row, col);
					moveFocus(row + 1, col);
				}
				break;
			case 'ArrowLeft':
				if (col > 0) {
					e.preventDefault();
					commitCell(row, col);
					moveFocus(row, (col - 1) as GridCol);
				}
				break;
			case 'ArrowRight':
				if (col < 5) {
					e.preventDefault();
					commitCell(row, col);
					moveFocus(row, (col + 1) as GridCol);
				}
				break;
			case 'Tab':
				e.preventDefault();
				if (!e.shiftKey) {
					commitCell(row, col);
					if (col < 5) moveFocus(row, (col + 1) as GridCol);
					else moveFocus(row + 1, 0);
				} else {
					commitCell(row, col);
					if (col > 0) moveFocus(row, (col - 1) as GridCol);
					else if (row > 0) moveFocus(row - 1, 5);
				}
				break;
			case 'Escape':
				if (!isNewRow) {
					const item = currentItems[row];
					delete nameDrafts[item.id];
					delete aliasDrafts[item.id];
					delete cnDrafts[item.id];
					delete enDrafts[item.id];
					delete priceDrafts[item.id];
					delete dateDrafts[item.id];
				} else {
					newName = '';
					newAlias = '';
					newCn = '';
					newEn = '';
					newPriceDate = todayYMD();
					newPrice = '';
				}
				(e.target as HTMLElement).blur();
				activeRow = null;
				break;
		}
	}

	let isSubmitting = $state(false);

	// 새 행 추가
	async function addItemAndContinue() {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			newRowSubmitTried = true;
			const name = newName.trim();
			if (!name || !selectedClientId || !effectiveCategoryId) return;
			if (!newRowPriceOk || !newRowDateOk) return;

			const price = parseInt(newPrice.trim(), 10);
			const priceDate = newPriceDate.trim() || todayYMD();
			const catId = effectiveCategoryId;
			const cliId = selectedClientId;
			const alias = newAlias.trim();
			const cn = newCn.trim();
			const en = newEn.trim();

			// 입력칸 즉시 비우기
			newName = '';
			newAlias = '';
			newCn = '';
			newEn = '';
			newPrice = '';
			newPriceDate = todayYMD();
			newRowSubmitTried = false;

			// 임시 ID로 낙관적 추가
			const tmpId = `tmp-${Date.now()}`;
			const maxSort =
				itemStore.items
					.filter((i) => i.category_id === catId)
					.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
			const tmpItem: Item = {
				id: tmpId,
				category_id: catId,
				client_id: cliId,
				name_ko: name,
				name_en: en || null,
				name_zh: cn || null,
				nickname: alias || null,
				sort_order: maxSort
			};
			itemStore.addPending(tmpItem);
			if (price > 0)
				priceStore.addPending({
					id: `tmp-price-${tmpId}`,
					item_id: tmpId,
					unit_price: price,
					effective_from: priceDate
				});

			await tick();
			moveFocus(currentItems.length - 1, 0);

			// 백그라운드로 서버에 저장
			const savedFocusRow = currentItems.length - 1;
			const savedFocusId = `cell-${savedFocusRow}-0`;
			const form = new FormData();
			form.append('category_id', catId);
			form.append('name_ko', name);
			form.append('name_en', en);
			form.append('name_zh', cn);
			form.append('nickname', alias);
			form.append('client_id', cliId);
			form.append('unit_price', String(price));
			form.append('effective_from', priceDate);
			form.append('sort_order', String(maxSort));

			try {
				const res = await fetch('/products?/upsertItem', { method: 'POST', body: form });
				const text = await res.text();
				if (!res.ok) throw new Error(`HTTP ${res.status}`);

				const result = deserialize(text);
				if (result.type !== 'success') {
					const errMsg = (result as { data?: { error?: string } }).data?.error ?? '서버 오류';
					throw new Error(errMsg);
				}
				const realId = (result.data as Record<string, unknown>)?.id as string | undefined;
				if (!realId) throw new Error('no id in response');

				// item key 교체 + price의 item_id도 realId로 교체 (가격/날짜 유지)
				itemStore.replacePending(tmpId, { ...tmpItem, id: realId });
				priceStore.replacePending(`tmp-price-${tmpId}`, {
					id: `tmp-price-${realId}`,
					item_id: realId,
					unit_price: price,
					effective_from: priceDate
				});

				await tick();
				if (activeRow === savedFocusRow) {
					const el = document.getElementById(savedFocusId) as HTMLInputElement | null;
					if (el) {
						el.focus();
						el.select?.();
					}
				}
			} catch (err) {
				// 실패 → 롤백
				itemStore.removePending(tmpId);
				priceStore.removePending(`tmp-price-${tmpId}`);
				const msg = err instanceof Error ? err.message : String(err);
				showToast(`품목 추가 실패 — ${msg}`);
			}
		} finally {
			isSubmitting = false;
		}
	}

	// 날짜 모달
	function confirmDateModal() {
		if (dateModalRow === null || !selectedClientId) return;
		const row = dateModalRow;
		if (row >= currentItems.length) return;
		const item = currentItems[row];
		const date = dateModalValue.trim();
		if (!date || !isValidDate(date)) return;
		const price = getPrice(item.id);
		patchLocalPrice(item.id, { effective_from: date });
		submitBg(
			'upsertPrice',
			{
				item_id: item.id,
				unit_price: String(price),
				effective_from: date
			},
			() => rollbackLocalPrice(item.id)
		);
		showDateModal = false;
		dateModalRow = null;
		dateModalValue = '';
	}

	function cancelDateModal() {
		showDateModal = false;
		dateModalRow = null;
		dateModalValue = '';
	}

	// 품목 삭제
	async function removeItem(id: string) {
		itemStore.remove(id);
		const ok = await submitBg('deleteItem', { id }, () => itemStore.restoreRemoved(id));
		if (ok) await invalidateAll();
	}

	// 순서 편집
	function startOrderEdit(i: number) {
		editingOrderRow = i;
		orderInputValue = String(i + 1);
		tick().then(() => {
			const el = document.getElementById(`order-input-${i}`) as HTMLInputElement | null;
			if (el) {
				el.focus();
				el.select();
			}
		});
	}

	async function commitOrderEdit(i: number) {
		if (!effectiveCategoryId) {
			editingOrderRow = null;
			return;
		}
		const max = currentItems.length;
		const raw = parseInt(orderInputValue, 10);
		if (!isNaN(raw)) {
			const to = Math.max(1, Math.min(raw, max)) - 1;
			if (to !== i) {
				const reordered = [...currentItems];
				const [moved] = reordered.splice(i, 1);
				reordered.splice(to, 0, moved);
				reordered.forEach((r, idx) => itemStore.override(r.id, { ...r, sort_order: idx }));
				const ok = await submitBg(
					'reorderItems',
					{ ids: JSON.stringify(reordered.map((x) => x.id)) },
					() => {
						reordered.forEach((r) => itemStore.clear(r.id));
					}
				);
				void ok;
			}
		}
		editingOrderRow = null;
	}

	function cancelOrderEdit() {
		editingOrderRow = null;
	}

	// 품목 드래그
	function onDragStart(e: DragEvent, i: number) {
		dragSrcIdx = i;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(i));
		}
	}
	function onDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIdx = i;
	}
	function onDragLeave(e: DragEvent, i: number) {
		const related = e.relatedTarget as Node | null;
		if (related && (e.currentTarget as HTMLElement).contains(related)) return;
		if (dragOverIdx === i) dragOverIdx = null;
	}
	async function onDrop(e: DragEvent, i: number) {
		e.preventDefault();
		if (dragSrcIdx !== null && dragSrcIdx !== i && effectiveCategoryId) {
			const reordered = [...currentItems];
			const [moved] = reordered.splice(dragSrcIdx, 1);
			reordered.splice(i, 0, moved);
			reordered.forEach((r, idx) => itemStore.override(r.id, { ...r, sort_order: idx }));
			const ok = await submitBg(
				'reorderItems',
				{ ids: JSON.stringify(reordered.map((x) => x.id)) },
				() => {
					reordered.forEach((r) => itemStore.clear(r.id));
				}
			);
			void ok;
		}
		dragSrcIdx = null;
		dragOverIdx = null;
	}
	function onDragEnd() {
		dragSrcIdx = null;
		dragOverIdx = null;
	}

	// 카테고리 드래그
	function onCatDragStart(e: DragEvent, i: number) {
		catDragSrcIdx = i;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(i));
		}
	}
	function onCatDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		catDragOverIdx = i;
	}
	function onCatDragLeave(e: DragEvent, i: number) {
		const related = e.relatedTarget as Node | null;
		if (related && (e.currentTarget as HTMLElement).contains(related)) return;
		if (catDragOverIdx === i) catDragOverIdx = null;
	}
	async function onCatDrop(e: DragEvent, i: number) {
		e.preventDefault();
		if (catDragSrcIdx !== null && catDragSrcIdx !== i) {
			const reordered = [...sortedCategories];
			const [moved] = reordered.splice(catDragSrcIdx, 1);
			reordered.splice(i, 0, moved);
			reordered.forEach((c, idx) => categoryStore.override(c.id, { ...c, sort_order: idx }));
			const ok = await submitBg(
				'reorderCategories',
				{ ids: JSON.stringify(reordered.map((x) => x.id)) },
				() => {
					reordered.forEach((c) => categoryStore.clear(c.id));
				}
			);
			void ok;
		}
		catDragSrcIdx = null;
		catDragOverIdx = null;
	}
	function onCatDragEnd() {
		catDragSrcIdx = null;
		catDragOverIdx = null;
	}

	async function commitCatOrderEdit(i: number) {
		const max = sortedCategories.length;
		const raw = parseInt(catOrderInputValue, 10);
		if (!isNaN(raw)) {
			const to = Math.max(1, Math.min(raw, max)) - 1;
			if (to !== i) {
				const reordered = [...sortedCategories];
				const [moved] = reordered.splice(i, 1);
				reordered.splice(to, 0, moved);
				reordered.forEach((c, idx) => categoryStore.override(c.id, { ...c, sort_order: idx }));
				const ok = await submitBg(
					'reorderCategories',
					{ ids: JSON.stringify(reordered.map((x) => x.id)) },
					() => {
						reordered.forEach((c) => categoryStore.clear(c.id));
					}
				);
				void ok;
			}
		}
		editingCatOrderIdx = null;
	}

	// 카테고리 추가
	async function addCategory() {
		const cat = newCatInput.trim();
		if (!cat || !selectedClient) return;
		newCatInput = '';

		// 낙관적: 임시 ID로 먼저 추가
		const tmpId = `tmp-cat-${Date.now()}`;
		const maxSort = sortedCategories.reduce((m, c) => Math.max(m, c.sort_order ?? -1), -1) + 1;
		const tmpCat = { id: tmpId, name: cat, client_id: selectedClientId!, sort_order: maxSort };
		categoryStore.addPending(tmpCat);
		selectedCategoryId = tmpId;

		const form = new FormData();
		form.append('name', cat);
		form.append('client_id', selectedClientId!);
		try {
			const res = await fetch('/products?/upsertCategory', { method: 'POST', body: form });
			const text = await res.text();
			const result = deserialize(text);
			if (result.type !== 'success') {
				categoryStore.removePending(tmpId);
				selectedCategoryId = null;
				showToast('카테고리 추가 실패');
				return;
			}
			const realId = (result.data as Record<string, unknown>)?.id as string | undefined;
			if (realId) {
				categoryStore.replacePending(tmpId, { ...tmpCat, id: realId });
				await tick();
				selectedCategoryId = realId;
			} else {
				await invalidateAll();
			}
		} catch {
			categoryStore.removePending(tmpId);
			selectedCategoryId = null;
			showToast('네트워크 오류');
		}
	}

	// 카테고리 삭제 확인
	async function confirmRemoveCategory() {
		if (!deleteCatTarget) return;
		const id = deleteCatTarget;
		deleteCatTarget = null;
		await submitAndReload('deleteCategory', { id });
	}
	function cancelRemoveCategory() {
		deleteCatTarget = null;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && showDateModal) cancelDateModal();
	}}
	onpointerup={() => {
		if (dragSrcIdx !== null) {
			dragSrcIdx = null;
			dragOverIdx = null;
		}
		if (catDragSrcIdx !== null) {
			catDragSrcIdx = null;
			catDragOverIdx = null;
		}
	}}
/>

<!-- ── 거래처 선택 모달 ──────────────────────────────────────────── -->
{#if showClientModal}
	<dialog
		open
		aria-modal="true"
		class="modal modal-open"
		onkeydown={(e) => e.key === 'Escape' && (showClientModal = false)}
	>
		<div
			class="modal-box flex w-full max-w-lg flex-col overflow-hidden p-0"
			style="height: min(520px, 90vh);"
		>
			<div class="border-base-200 flex shrink-0 items-center justify-between border-b px-5 py-4">
				<h3 class="text-base font-bold">거래처 선택</h3>
				<button
					onclick={() => (showClientModal = false)}
					aria-label="닫기"
					class="btn btn-ghost btn-sm btn-circle"
				>
					<Icon icon="lucide:x" class="h-4 w-4" />
				</button>
			</div>
			<div class="border-base-200 shrink-0 border-b px-4 py-3">
				<SearchBar
					placeholder="거래처 검색..."
					items={clientSearchItems}
					onselect={(id) => selectClient(id)}
					class="w-full"
				/>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto">
				{#each data.clients as client (client.id)}
					<button
						onclick={() => selectClient(client.id)}
						class="hover:bg-base-200 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors {selectedClientId ===
						client.id
							? 'bg-primary/10 text-primary font-semibold'
							: ''}"
					>
						<span class="min-w-0 flex-1 truncate text-sm">{client.name}</span>
						{#if selectedClientId === client.id}
							<Icon icon="lucide:check" class="text-primary h-4 w-4 shrink-0" />
						{/if}
					</button>
				{/each}
				{#if data.clients.length === 0}
					<p class="py-10 text-center text-sm opacity-50">거래처 없음</p>
				{/if}
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			tabindex="-1"
			onclick={() => (showClientModal = false)}
			onkeydown={(e) => e.key === 'Escape' && (showClientModal = false)}
		></div>
	</dialog>
{/if}

<!-- ── 카테고리 삭제 확인 모달 ──────────────────────────────────── -->
{#if deleteCatTarget}
	{@const targetCat = categoryStore.items.find((c) => c.id === deleteCatTarget)}
	{@const catItemCount = itemStore.items.filter((i) => i.category_id === deleteCatTarget).length}
	<dialog
		open
		aria-modal="true"
		class="modal modal-open"
		onkeydown={(e) => e.key === 'Escape' && cancelRemoveCategory()}
	>
		<div class="modal-box w-full max-w-sm rounded-2xl p-6">
			<h3 class="mb-2 text-base font-extrabold">카테고리 삭제</h3>
			<p class="text-base-content/70 mb-1 text-sm">
				<span class="text-error font-bold">"{targetCat?.name}"</span> 카테고리를 삭제하시겠습니까?
			</p>
			{#if catItemCount > 0}
				<p class="text-base-content/60 mb-6 text-sm">
					해당 카테고리의 품목 <strong>{catItemCount}개</strong>도 함께 삭제됩니다.
				</p>
			{:else}
				<p class="text-base-content/60 mb-6 text-sm">해당 카테고리에 등록된 품목이 없습니다.</p>
			{/if}
			<div class="modal-action">
				<button onclick={cancelRemoveCategory} class="btn btn-ghost font-bold">취소</button>
				<button onclick={confirmRemoveCategory} class="btn btn-error font-bold">삭제</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			tabindex="-1"
			onclick={cancelRemoveCategory}
			onkeydown={(e) => e.key === 'Escape' && cancelRemoveCategory()}
		></div>
	</dialog>
{/if}

<!-- ── 메인 레이아웃 ─────────────────────────────────────────────── -->
<div class="bg-base-200 flex h-full flex-col overflow-hidden">
	<!-- 헤더 -->
	<header class="border-base-300 bg-base-100 shrink-0 border-b-2 px-8 py-5">
		<div class="flex items-center gap-4">
			<h2 class="text-2xl font-extrabold tracking-tight">상품 관리</h2>
			<div class="ml-auto flex items-center gap-2">
				<button
					onclick={() => (showClientModal = true)}
					class="btn btn-sm btn-ghost border-base-300 min-w-48 justify-between border"
				>
					<Icon icon="lucide:building-2" class="h-4 w-4 opacity-50" />
					{#if selectedClient}
						<span class="font-semibold">{selectedClient.name}</span>
					{:else}
						<span class="opacity-40">거래처 선택</span>
					{/if}
					<Icon icon="lucide:chevron-down" class="h-3.5 w-3.5 opacity-50" />
				</button>
			</div>
		</div>
	</header>

	<div class="flex min-h-0 flex-1 gap-5 overflow-hidden px-6 py-5">
		<!-- 카테고리 사이드바 -->
		<aside
			class="border-base-300 bg-base-100 flex min-h-0 w-56 shrink-0 flex-col overflow-hidden rounded-lg border shadow"
		>
			<!-- 카테고리 추가 -->
			<div class="border-base-200 bg-base-200 shrink-0 border-b-2 px-4 py-3">
				<p class="mb-2 text-xs font-bold tracking-wide uppercase opacity-50">카테고리</p>
				<div class="flex gap-1.5">
					<input
						type="text"
						placeholder="새 카테고리"
						bind:value={newCatInput}
						onkeydown={(e) => e.key === 'Enter' && addCategory()}
						disabled={!selectedClientId}
						class="input input-xs input-bordered min-w-0 flex-1"
					/>
					<button
						onclick={addCategory}
						disabled={!selectedClientId || !newCatInput.trim()}
						class="btn btn-xs btn-primary"
					>
						<Icon icon="lucide:plus" class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			<!-- 카테고리 목록 -->
			<ul class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 py-1">
				{#if !selectedClientId}
					<li class="pointer-events-none px-4 py-8 text-center text-xs opacity-40">
						<span>거래처를<br />선택해주세요</span>
					</li>
				{:else if categoryStore.items.length === 0}
					<li class="pointer-events-none px-4 py-8 text-center text-xs opacity-40">
						<span>카테고리 없음</span>
					</li>
				{:else}
					{#each sortedCategories as cat, ci (cat.id)}
						{@const isActive = effectiveCategoryId === cat.id}
						{@const isDragOver = catDragOverIdx === ci}
						{@const isDragSrc = catDragSrcIdx === ci}
						<li
							draggable="true"
							ondragstart={(e) => onCatDragStart(e, ci)}
							ondragover={(e) => onCatDragOver(e, ci)}
							ondragleave={(e) => onCatDragLeave(e, ci)}
							ondrop={(e) => onCatDrop(e, ci)}
							ondragend={onCatDragEnd}
							animate:flip={{ duration: 180 }}
							class="rounded-lg transition-colors
                {isActive ? 'bg-primary text-primary-content shadow' : 'hover:bg-base-200'}
                {isDragOver ? 'ring-primary ring-2' : ''}
                {isDragSrc ? 'opacity-40' : ''}"
						>
							<div class="flex items-center gap-1">
								<!-- 순번 -->
								<div class="flex w-8 shrink-0 items-center justify-center">
									{#if editingCatOrderIdx === ci}
										<input
											id="cat-order-input-{ci}"
											type="text"
											inputmode="numeric"
											bind:value={catOrderInputValue}
											onblur={() => commitCatOrderEdit(ci)}
											onkeydown={(e) => {
												if (e.key === 'Enter') commitCatOrderEdit(ci);
												if (e.key === 'Escape') cancelCatOrderEdit();
											}}
											class="border-primary bg-base-100 text-base-content w-7 rounded border py-0.5 text-center text-xs outline-none"
										/>
									{:else}
										<button
											type="button"
											class="w-7 cursor-pointer border-none bg-transparent p-0 text-center text-[10px] font-bold opacity-40 select-none hover:opacity-80"
											onclick={() => startCatOrderEdit(ci)}>{ci + 1}</button
										>
									{/if}
								</div>
								<!-- 이름 버튼 -->
								<button
									onclick={() => (selectedCategoryId = cat.id)}
									draggable="false"
									class="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-2 text-left text-sm font-medium"
								>
									<Icon
										icon="lucide:grip-vertical"
										class="h-3.5 w-3.5 shrink-0 cursor-grab opacity-30 active:cursor-grabbing"
									/>
									<span class="min-w-0 flex-1 truncate">{cat.name}</span>
								</button>
								<!-- 삭제 -->
								<button
									onclick={() => (deleteCatTarget = cat.id)}
									title="카테고리 삭제"
									class="btn btn-ghost btn-xs btn-circle mr-1 shrink-0 opacity-0 hover:opacity-100
                    {isActive
										? 'text-primary-content/70 hover:text-primary-content'
										: 'text-base-content/50'}"
								>
									<Icon icon="lucide:x" class="h-3 w-3" />
								</button>
							</div>
						</li>
					{/each}
				{/if}
			</ul>
		</aside>

		<!-- 품목 그리드 -->
		<section
			class="border-base-300 bg-base-100 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border shadow"
		>
			<!-- 그리드 헤더 -->
			<div
				class="border-base-200 bg-base-200 flex shrink-0 items-center justify-between border-b-2 px-6 py-3.5"
			>
				<div class="flex items-center gap-2">
					<span class="text-sm font-bold">
						{#if effectiveCategoryId}
							{data.categories.find((c) => c.id === effectiveCategoryId)?.name ?? ''}
						{:else}
							품목
						{/if}
					</span>
					<span class="badge badge-sm badge-neutral font-semibold">{currentItems.length}</span>
				</div>
				<p class="flex items-center gap-1.5 text-[11px] opacity-60">
					<kbd class="kbd kbd-sm">Tab</kbd> 이동
					<kbd class="kbd kbd-sm">Enter</kbd> 저장
					<kbd class="kbd kbd-sm">Esc</kbd> 취소
				</p>
			</div>

			<!-- 그리드 본문 -->
			<div class="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
				{#if !selectedClientId}
					<div class="flex h-full items-center justify-center">
						<p class="text-sm opacity-40">거래처를 선택해주세요</p>
					</div>
				{:else if !effectiveCategoryId}
					<div class="flex h-full items-center justify-center">
						<p class="text-sm opacity-40">카테고리를 선택하거나 추가해주세요</p>
					</div>
				{:else}
					<table class="border-collapse" style="table-layout:fixed; width:100%;">
						<colgroup>
							<col style="width:4%" />
							<col style="width:20%" />
							<col style="width:13%" />
							<col style="width:13%" />
							<col style="width:13%" />
							<col style="width:18%" />
							<col style="width:15%" />
							<col style="width:4%" />
						</colgroup>
						<thead class="sticky top-0 z-10">
							<tr class="bg-base-200">
								<th
									class="border-base-300 h-9 border-r border-b-2 px-2 text-center text-[11px] font-bold tracking-wide uppercase opacity-60 select-none"
									>#</th
								>
								<th
									class="border-base-300 h-9 border-r border-b-2 px-3 text-left text-[11px] font-bold tracking-wide uppercase opacity-60"
									>품목명</th
								>
								<th
									class="border-base-300 h-9 border-r border-b-2 px-3 text-right text-[11px] font-bold tracking-wide uppercase opacity-60"
									>단가</th
								>
								<th
									class="border-base-300 h-9 border-r border-b-2 px-3 text-center text-[11px] font-bold tracking-wide uppercase opacity-60"
									>적용일</th
								>
								<th
									class="border-base-300 h-9 border-r border-b-2 px-3 text-left text-[11px] font-bold tracking-wide uppercase opacity-60"
									>별칭</th
								>
								<th
									class="border-base-300 h-9 border-r border-b-2 px-3 text-left text-[11px] font-bold tracking-wide uppercase opacity-60"
									>중국어</th
								>
								<th
									class="border-base-300 h-9 border-r border-b-2 px-3 text-left text-[11px] font-bold tracking-wide uppercase opacity-60"
									>영어</th
								>
								<th class="border-base-300 h-9 border-b-2"></th>
							</tr>
						</thead>
						<tbody>
							{#each currentItems as item, i (item.id)}
								{@const isActiveRow = activeRow === i}
								{@const isDragOver = dragOverIdx === i}
								{@const isDragSrc = dragSrcIdx === i}
								<tr
									draggable="true"
									ondragstart={(e) => onDragStart(e, i)}
									ondragover={(e) => onDragOver(e, i)}
									ondragleave={(e) => onDragLeave(e, i)}
									ondrop={(e) => onDrop(e, i)}
									ondragend={onDragEnd}
									animate:flip={{ duration: 150 }}
									class="group transition-colors
                    {isActiveRow ? 'bg-primary/5' : 'hover:bg-base-200/50'}
                    {isDragOver ? 'ring-primary ring-2 ring-inset' : ''}
                    {isDragSrc ? 'opacity-40' : ''}"
								>
									<!-- 순번 -->
									<td class="border-base-200 h-9 border-r border-b px-2 text-center select-none">
										{#if editingOrderRow === i}
											<input
												id="order-input-{i}"
												type="text"
												inputmode="numeric"
												bind:value={orderInputValue}
												onblur={() => commitOrderEdit(i)}
												onkeydown={(e) => {
													if (e.key === 'Enter') commitOrderEdit(i);
													if (e.key === 'Escape') cancelOrderEdit();
												}}
												class="border-primary bg-base-100 w-8 rounded border py-0.5 text-center text-xs outline-none"
											/>
										{:else}
											<button
												type="button"
												class="cursor-pointer border-none bg-transparent p-0 text-[11px] opacity-40 select-none hover:opacity-80"
												onclick={() => startOrderEdit(i)}>{i + 1}</button
											>
										{/if}
									</td>

									<!-- 품목명 -->
									<td class="border-base-200 h-9 border-r border-b p-0">
										<input
											id="cell-{i}-0"
											type="text"
											value={getDisplayName(item)}
											oninput={(e) => (nameDrafts[item.id] = (e.target as HTMLInputElement).value)}
											onfocus={() => onCellFocus(i, 0)}
											onblur={() => commitName(item)}
											onkeydown={(e) => handleCellKeydown(e, i, 0)}
											class="focus:bg-primary/5 h-full w-full bg-transparent px-3 text-sm outline-none"
										/>
									</td>

									<!-- 단가 -->
									<td class="border-base-200 h-9 border-r border-b p-0">
										<input
											id="cell-{i}-1"
											type="text"
											inputmode="numeric"
											value={getDisplayPrice(item)}
											oninput={(e) => {
												const el = e.target as HTMLInputElement;
												const numeric = el.value.replace(/[^0-9]/g, '');
												el.value = numeric;
												priceDrafts[item.id] = numeric;
											}}
											onfocus={() => onCellFocus(i, 1)}
											onblur={(e) => {
												const el = e.target as HTMLInputElement;
												if (!el.value.trim()) {
													el.value = '0';
													priceDrafts[item.id] = '0';
												}
												commitPrice(item);
											}}
											onkeydown={(e) => handleCellKeydown(e, i, 1)}
											placeholder="0"
											class="focus:bg-primary/5 h-full w-full bg-transparent px-3 text-right text-sm outline-none"
										/>
									</td>

									<!-- 적용일 -->
									<td class="border-base-200 h-9 border-r border-b p-0">
										<input
											id="cell-{i}-2"
											type="text"
											value={getDisplayDate(item)}
											oninput={(e) => {
												const el = e.target as HTMLInputElement;
												const formatted = formatDateInput(el.value);
												el.value = formatted;
												el.setSelectionRange(formatted.length, formatted.length);
												dateDrafts[item.id] = formatted;
											}}
											onfocus={() => onCellFocus(i, 2)}
											onblur={() => commitDate(item)}
											onkeydown={(e) => handleCellKeydown(e, i, 2)}
											placeholder="YYYY-MM-DD"
											class="focus:bg-primary/5 h-full w-full bg-transparent px-3 text-center text-sm outline-none"
										/>
									</td>

									<!-- 별칭 -->
									<td class="border-base-200 h-9 border-r border-b p-0">
										<input
											id="cell-{i}-3"
											type="text"
											value={getDisplayAlias(item)}
											oninput={(e) => (aliasDrafts[item.id] = (e.target as HTMLInputElement).value)}
											onfocus={() => onCellFocus(i, 3)}
											onblur={() => commitAlias(item)}
											onkeydown={(e) => handleCellKeydown(e, i, 3)}
											class="focus:bg-primary/5 h-full w-full bg-transparent px-3 text-sm outline-none"
										/>
									</td>

									<!-- 중국어 -->
									<td class="border-base-200 h-9 border-r border-b p-0">
										<input
											id="cell-{i}-4"
											type="text"
											value={getDisplayCn(item)}
											oninput={(e) => (cnDrafts[item.id] = (e.target as HTMLInputElement).value)}
											onfocus={() => onCellFocus(i, 4)}
											onblur={() => commitCn(item)}
											onkeydown={(e) => handleCellKeydown(e, i, 4)}
											class="focus:bg-primary/5 h-full w-full bg-transparent px-3 text-sm outline-none"
										/>
									</td>

									<!-- 영어 -->
									<td class="border-base-200 h-9 border-r border-b p-0">
										<input
											id="cell-{i}-5"
											type="text"
											value={getDisplayEn(item)}
											oninput={(e) => (enDrafts[item.id] = (e.target as HTMLInputElement).value)}
											onfocus={() => onCellFocus(i, 5)}
											onblur={() => commitEn(item)}
											onkeydown={(e) => handleCellKeydown(e, i, 5)}
											class="focus:bg-primary/5 h-full w-full bg-transparent px-3 text-sm outline-none"
										/>
									</td>

									<!-- 삭제 -->
									<td class="border-base-200 h-9 border-b px-1 text-center">
										<button
											onclick={() => removeItem(item.id)}
											title="품목 삭제"
											class="btn btn-ghost btn-xs btn-circle text-error/50 hover:text-error opacity-0 group-hover:opacity-100"
										>
											<Icon icon="lucide:trash-2" class="h-4 w-4" />
										</button>
									</td>
								</tr>
							{/each}

							<!-- 새 행 -->
							{#if true}
								{@const newRowIdx = currentItems.length}
								{@const isNewRowActive = activeRow === newRowIdx}
								<tr
									class="transition-colors {isNewRowActive
										? 'bg-success/5'
										: 'hover:bg-base-200/30'}"
								>
									<td
										class="border-base-300 h-9 border-r border-b border-dashed px-2 text-center text-[11px] opacity-30 select-none"
									>
										{newRowIdx + 1}
									</td>
									<td class="border-base-300 h-9 border-r border-b border-dashed p-0">
										<input
											id="cell-{newRowIdx}-0"
											type="text"
											placeholder="품목명 입력 후 Enter"
											bind:value={newName}
											onfocus={() => (activeRow = newRowIdx)}
											onkeydown={(e) => handleCellKeydown(e, newRowIdx, 0)}
											style={newRowSubmitTried && !newRowNameOk
												? 'box-shadow: inset 0 0 0 2px #f87272'
												: ''}
											class="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:opacity-30"
										/>
									</td>
									<td class="border-base-300 h-9 border-r border-b border-dashed p-0">
										<input
											id="cell-{newRowIdx}-1"
											type="text"
											inputmode="numeric"
											placeholder="필수"
											value={newPrice}
											style={newRowSubmitTried && !newRowPriceOk
												? 'box-shadow: inset 0 0 0 2px #f87272'
												: ''}
											oninput={(e) => {
												const el = e.target as HTMLInputElement;
												const numeric = el.value.replace(/[^0-9]/g, '');
												el.value = numeric;
												newPrice = numeric;
											}}
											onfocus={() => (activeRow = newRowIdx)}
											onblur={(e) => {
												const el = e.target as HTMLInputElement;
												if (!el.value.trim()) {
													el.value = '0';
													newPrice = '0';
												}
											}}
											onkeydown={(e) => handleCellKeydown(e, newRowIdx, 1)}
											class="h-full w-full bg-transparent px-3 text-right text-sm outline-none placeholder:opacity-30"
										/>
									</td>
									<td class="border-base-300 h-9 border-r border-b border-dashed p-0">
										<input
											id="cell-{newRowIdx}-2"
											type="text"
											inputmode="numeric"
											placeholder="YYYY-MM-DD"
											value={newPriceDate}
											style={newRowSubmitTried && !newRowDateOk
												? 'box-shadow: inset 0 0 0 2px #f87272'
												: ''}
											oninput={(e) => {
												const el = e.target as HTMLInputElement;
												const formatted = formatDateInput(el.value);
												el.value = formatted;
												el.setSelectionRange(formatted.length, formatted.length);
												newPriceDate = formatted;
											}}
											onfocus={() => (activeRow = newRowIdx)}
											onkeydown={(e) => handleCellKeydown(e, newRowIdx, 2)}
											class="h-full w-full bg-transparent px-3 text-center text-sm outline-none placeholder:opacity-30"
										/>
									</td>
									<td class="border-base-300 h-9 border-r border-b border-dashed p-0">
										<input
											id="cell-{newRowIdx}-3"
											type="text"
											placeholder="별칭"
											bind:value={newAlias}
											onfocus={() => (activeRow = newRowIdx)}
											onkeydown={(e) => handleCellKeydown(e, newRowIdx, 3)}
											class="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:opacity-30"
										/>
									</td>
									<td class="border-base-300 h-9 border-r border-b border-dashed p-0">
										<input
											id="cell-{newRowIdx}-4"
											type="text"
											placeholder="중국어명"
											bind:value={newCn}
											onfocus={() => (activeRow = newRowIdx)}
											onkeydown={(e) => handleCellKeydown(e, newRowIdx, 4)}
											class="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:opacity-30"
										/>
									</td>
									<td class="border-base-300 h-9 border-r border-b border-dashed p-0">
										<input
											id="cell-{newRowIdx}-5"
											type="text"
											placeholder="영어명"
											bind:value={newEn}
											onfocus={() => (activeRow = newRowIdx)}
											onkeydown={(e) => handleCellKeydown(e, newRowIdx, 5)}
											class="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:opacity-30"
										/>
									</td>
									<td class="border-base-300 h-9 border-b border-dashed px-1 text-center">
										{#if newName.trim() && newRowPriceOk}
											<button
												onclick={addItemAndContinue}
												class="btn btn-ghost btn-xs btn-circle text-success"
											>
												<Icon icon="lucide:check" class="h-3.5 w-3.5" />
											</button>
										{/if}
									</td>
								</tr>
								<tr><td colspan="8" class="h-16"></td></tr>
							{/if}
						</tbody>
					</table>
				{/if}
			</div>
		</section>
	</div>
</div>

<!-- ── 날짜 모달 ──────────────────────────────────────────────────── -->
{#if showDateModal && dateModalRow !== null}
	<dialog open aria-modal="true" class="modal modal-open">
		<div class="modal-box flex w-full max-w-sm flex-col gap-4">
			<div>
				<h3 class="mb-1 text-base font-bold">단가 적용일 변경</h3>
				<p class="text-xs opacity-50">YYYY-MM-DD 형식으로 입력하세요</p>
			</div>
			<div>
				<label for="dateInput" class="label label-text mb-1 text-xs font-semibold"
					>적용 시작일</label
				>
				<input
					id="dateInput"
					type="date"
					bind:value={dateModalValue}
					class="input input-bordered input-sm w-full"
				/>
			</div>
			<div class="modal-action border-base-200 mt-0 border-t pt-4">
				<button type="button" onclick={cancelDateModal} class="btn btn-ghost btn-sm">취소</button>
				<button type="button" onclick={confirmDateModal} class="btn btn-primary btn-sm">확인</button
				>
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			tabindex="-1"
			onclick={cancelDateModal}
			onkeydown={(e) => e.key === 'Escape' && cancelDateModal()}
		></div>
	</dialog>
{/if}

<!-- ── 토스트 알림 ─────────────────────────────────────────────── -->
{#each toasts as t (t.id)}
	<div
		class="fixed bottom-6 left-1/2 z-9999 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl transition-all
      {t.type === 'error' ? 'bg-error text-error-content' : 'bg-success text-success-content'}"
		role="alert"
	>
		{t.msg}
	</div>
{/each}

<!-- ── 단가 리셋 확인 모달 ───────────────────────────────────────── -->
{#if priceResetPending}
	<dialog class="modal modal-open">
		<div class="modal-box max-w-sm">
			<div class="flex items-start gap-3">
				<Icon icon="lucide:alert-triangle" class="text-warning mt-0.5 h-5 w-5 shrink-0" />
				<div class="min-w-0 flex-1">
					<h3 class="text-base-content font-semibold">단가 이력이 전체 삭제됩니다</h3>
					<p class="text-base-content/70 mt-1 text-sm">
						<span class="text-base-content font-medium">{priceResetPending.item.name_ko}</span>의
						적용일을 <span class="text-warning font-medium">{priceResetPending.newDate}</span>로
						변경하면 아래 단가 이력 {priceResetPending.existingPrices.length}개가 모두 삭제됩니다.
					</p>
					<!-- 삭제될 이력 목록 -->
					<ul
						class="text-base-content/60 bg-base-200 mt-2 space-y-0.5 rounded-lg px-3 py-2 text-xs"
					>
						{#each priceResetPending.existingPrices as p (p.effective_from)}
							<li class="flex justify-between">
								<span>{p.effective_from}</span>
								<span>{p.unit_price.toLocaleString()}원</span>
							</li>
						{/each}
					</ul>
					<p class="text-base-content/50 mt-2 text-xs">이 작업은 되돌릴 수 없습니다.</p>
				</div>
			</div>
			<div class="modal-action mt-4 gap-2">
				<button
					class="btn btn-sm btn-ghost"
					onclick={cancelPriceReset}
					disabled={priceResetLoading}
				>
					취소
				</button>
				<button
					class="btn btn-sm btn-warning {priceResetLoading ? 'loading' : ''}"
					onclick={confirmPriceReset}
					disabled={priceResetLoading}
				>
					{#if !priceResetLoading}이력 삭제 후 변경{/if}
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			tabindex="-1"
			onclick={cancelPriceReset}
			onkeydown={() => {}}
		></div>
	</dialog>
{/if}

<style>
	tr:hover button[title='품목 삭제'] {
		opacity: 1;
	}
	td:has(> input:focus) {
		background-color: hsl(var(--p) / 0.05);
	}
</style>
