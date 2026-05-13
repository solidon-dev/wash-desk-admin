<script lang="ts">
  import Icon from '@iconify/svelte';
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { invalidateAll } from '$app/navigation';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import type { PageProps, PageData } from './$types';

  // ── 서버 데이터 ───────────────────────────────────────────────
  let { data }: PageProps = $props();

  type Item = PageData['items'][number];
  type Price = { id: string; item_id: string; client_id: string; unit_price: number; effective_from: string };

  // ── 낙관적 로컬 상태 ──────────────────────────────────────────
  // 서버 data가 바뀌면 로컬 상태도 동기화
  // (svelte lint 업데이트: $state + $effect로 쓰기 가능한 로컬 상태 유지)
  // eslint-disable-next-line svelte/prefer-writable-derived
  let localItems      = $state<Item[]>(data.items.map(i => ({ ...i })));
  // eslint-disable-next-line svelte/prefer-writable-derived
  let localPrices     = $state<Price[]>((data.itemPrices as Price[]).map(p => ({ ...p })));
  // eslint-disable-next-line svelte/prefer-writable-derived
  let localCategories = $state<typeof data.categories>(data.categories.map(c => ({ ...c })));

  $effect(() => { localItems      = [...data.items]; });
  $effect(() => { localPrices     = (data.itemPrices as Price[]).map(p => ({ ...p })); });
  $effect(() => { localCategories = [...data.categories]; });

  // ── 토스트 ────────────────────────────────────────────────────
  type Toast = { id: number; msg: string; type: 'error' | 'success' };
  let toasts = $state<Toast[]>([]);
  let _toastId = 0;
  function showToast(msg: string, type: Toast['type'] = 'error') {
    const id = ++_toastId;
    toasts = [...toasts, { id, msg, type }];
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id); }, 3500);
  }

  // ── 거래처 선택 ────────────────────────────────────────────────
  const selectedClientId = $derived(data.selectedClientId ?? null);

  const selectedClient = $derived(
    data.clients.find(c => c.id === selectedClientId) ?? null
  );

  function selectClient(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('clientId', id);
    history.replaceState(history.state, '', url.toString());
    invalidateAll();
  }

  // 거래처 선택 모달
  let showClientModal = $state(false);
  const clientSearchItems = $derived(
    data.clients.map(c => ({ id: c.id, label: c.name, sub: '' }))
  );

  // ── 카테고리 ───────────────────────────────────────────────────
  let selectedCategoryId = $state<string | null>(null);

  const effectiveCategoryId = $derived(
    selectedCategoryId && data.categories.find(c => c.id === selectedCategoryId)
      ? selectedCategoryId
      : (data.categories[0]?.id ?? null)
  );

  // 거래처/카테고리 변경 시 초기화
  $effect(() => {
    void selectedClientId;
    selectedCategoryId = null;
    resetGrid();
  });

  $effect(() => {
    void effectiveCategoryId;
    resetGrid();
  });

  // 카테고리 드래그
  let catDragSrcIdx  = $state<number | null>(null);
  let catDragOverIdx = $state<number | null>(null);

  // 카테고리 순번 편집
  let editingCatOrderIdx = $state<number | null>(null);
  let catOrderInputValue = $state('');

  function startCatOrderEdit(i: number) {
    editingCatOrderIdx = i;
    catOrderInputValue = String(i + 1);
    tick().then(() => {
      const el = document.getElementById(`cat-order-input-${i}`) as HTMLInputElement | null;
      if (el) { el.focus(); el.select(); }
    });
  }

  function cancelCatOrderEdit() { editingCatOrderIdx = null; }

  // 카테고리 이름 추가 인풋
  let newCatInput = $state('');

  // ── 카테고리 삭제 확인 모달
  let deleteCatTarget = $state<string | null>(null);

  // ── 품목 그리드 ────────────────────────────────────────────────
  const currentItems = $derived(
    effectiveCategoryId
      ? localItems.filter(i => i.category_id === effectiveCategoryId)
      : []
  );

  type GridCol = 0 | 1 | 2 | 3 | 4 | 5;
  // col: 0=품목명, 1=단가, 2=가격적용일, 3=별칭, 4=중국어, 5=영어

  function todayYMD() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }

  let activeRow       = $state<number | null>(null);
  let nameDrafts      = $state<Record<string, string>>({});
  let aliasDrafts     = $state<Record<string, string>>({});
  let cnDrafts        = $state<Record<string, string>>({});
  let enDrafts        = $state<Record<string, string>>({});
  let priceDrafts     = $state<Record<string, string>>({});
  let dateDrafts      = $state<Record<string, string>>({});

  let newName      = $state('');
  let newAlias     = $state('');
  let newCn        = $state('');
  let newEn        = $state('');
  let newPrice     = $state('0');
  let newPriceDate = $state(todayYMD());

  let newRowSubmitTried = $state(false);
  const newRowNameOk  = $derived(newName.trim().length > 0);
  const newRowPriceOk = $derived(/^\d+$/.test(newPrice.trim()));
  const newRowDateOk  = $derived(isValidDate(newPriceDate));

  let editingOrderRow  = $state<number | null>(null);
  let orderInputValue  = $state('');

  let dragSrcIdx  = $state<number | null>(null);
  let dragOverIdx = $state<number | null>(null);

  // 날짜 모달
  let showDateModal  = $state(false);
  let dateModalRow   = $state<number | null>(null);
  let dateModalValue = $state('');

  function resetGrid() {
    activeRow = null;
    nameDrafts = {}; aliasDrafts = {}; cnDrafts = {}; enDrafts = {};
    priceDrafts = {}; dateDrafts = {};
    newName = ''; newAlias = ''; newCn = ''; newEn = '';
    newPrice = '0'; newPriceDate = todayYMD();
    newRowSubmitTried = false;
    showDateModal = false; dateModalRow = null; dateModalValue = '';
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
    return localPrices.find(p => p.item_id === itemId)?.unit_price ?? 0;
  }
  function getPriceDate(itemId: string): string {
    return localPrices.find(p => p.item_id === itemId)?.effective_from ?? '';
  }

  function getDisplayName(item: Item)  { return nameDrafts[item.id]  ?? item.name_ko; }
  function getDisplayAlias(item: Item) { return aliasDrafts[item.id] ?? item.nickname ?? ''; }
  function getDisplayCn(item: Item)    { return cnDrafts[item.id]    ?? item.name_zh ?? ''; }
  function getDisplayEn(item: Item)    { return enDrafts[item.id]    ?? item.name_en ?? ''; }
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
    if (col === 0 && nameDrafts[item.id]  === undefined) nameDrafts[item.id]  = item.name_ko;
    if (col === 1 && priceDrafts[item.id] === undefined) priceDrafts[item.id] = getPrice(item.id) > 0 ? String(getPrice(item.id)) : '';
    if (col === 2 && dateDrafts[item.id]  === undefined) dateDrafts[item.id]  = getPriceDate(item.id);
    if (col === 3 && aliasDrafts[item.id] === undefined) aliasDrafts[item.id] = item.nickname ?? '';
    if (col === 4 && cnDrafts[item.id]    === undefined) cnDrafts[item.id]    = item.name_zh ?? '';
    if (col === 5 && enDrafts[item.id]    === undefined) enDrafts[item.id]    = item.name_en ?? '';
  }

  async function moveFocus(row: number, col: GridCol) {
    const maxRow = currentItems.length;
    const clampedRow = Math.max(0, Math.min(row, maxRow));
    activeRow = clampedRow;
    await tick();
    const el = document.getElementById(`cell-${clampedRow}-${col}`) as HTMLElement | null;
    if (el) { el.focus(); if ('select' in el) (el as HTMLInputElement).select(); }
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
      const res = await fetch(`?/${action}`, { method: 'POST', body: form });
      if (!res.ok) {
        onRollback?.();
        showToast('저장 실패 — 변경사항이 취소됐습니다.');
        return false;
      }
      return true;
    } catch {
      onRollback?.();
      showToast('네트워크 오류 — 변경사항이 취소됐습니다.');
      return false;
    }
  }

  // 구조 변경(카테고리/품목 추가·삭제·순서)은 서버 상태 재로드 필요
  async function submitAndReload(action: string, payload: Record<string, string>): Promise<boolean> {
    const form = new FormData();
    for (const [k, v] of Object.entries(payload)) form.append(k, v);
    try {
      const res = await fetch(`?/${action}`, { method: 'POST', body: form });
      if (!res.ok) { showToast('저장 실패'); return false; }
      await invalidateAll();
      return true;
    } catch {
      showToast('네트워크 오류');
      return false;
    }
  }

  // ── 품목 셀 commit (낙관적 업데이트) ────────────────────────
  function patchLocalItem(id: string, patch: Partial<Item>) {
    localItems = localItems.map(it => it.id === id ? { ...it, ...patch } : it);
  }
  function patchLocalPrice(itemId: string, patch: Partial<Price>, clientId: string) {
    const existing = localPrices.find(p => p.item_id === itemId);
    if (existing) {
      localPrices = localPrices.map(p => p.item_id === itemId ? { ...p, ...patch } : p);
    } else {
      localPrices = [...localPrices, {
        id: `tmp-${itemId}`,
        item_id: itemId,
        client_id: clientId,
        unit_price: 0,
        effective_from: todayYMD(),
        ...patch,
      }];
    }
  }

  function commitName(item: Item) {
    const draft = nameDrafts[item.id];
    if (draft === undefined) return;
    const newN = draft.trim();
    delete nameDrafts[item.id];
    if (!newN || newN === item.name_ko) return;
    const prev = item.name_ko;
    patchLocalItem(item.id, { name_ko: newN });
    submitBg('upsertItem', {
      id: item.id, category_id: item.category_id,
      name_ko: newN, name_en: item.name_en ?? '',
      name_zh: item.name_zh ?? '', nickname: item.nickname ?? '',
    }, () => patchLocalItem(item.id, { name_ko: prev }));
  }

  function commitAlias(item: Item) {
    const draft = aliasDrafts[item.id];
    if (draft === undefined) return;
    delete aliasDrafts[item.id];
    const val = draft.trim();
    if (val === (item.nickname ?? '')) return;
    const prev = item.nickname;
    patchLocalItem(item.id, { nickname: val || null });
    submitBg('upsertItem', {
      id: item.id, category_id: item.category_id,
      name_ko: item.name_ko, name_en: item.name_en ?? '',
      name_zh: item.name_zh ?? '', nickname: val,
    }, () => patchLocalItem(item.id, { nickname: prev }));
  }

  function commitCn(item: Item) {
    const draft = cnDrafts[item.id];
    if (draft === undefined) return;
    delete cnDrafts[item.id];
    const val = draft.trim();
    if (val === (item.name_zh ?? '')) return;
    const prev = item.name_zh;
    patchLocalItem(item.id, { name_zh: val || null });
    submitBg('upsertItem', {
      id: item.id, category_id: item.category_id,
      name_ko: item.name_ko, name_en: item.name_en ?? '',
      name_zh: val, nickname: item.nickname ?? '',
    }, () => patchLocalItem(item.id, { name_zh: prev }));
  }

  function commitEn(item: Item) {
    const draft = enDrafts[item.id];
    if (draft === undefined) return;
    delete enDrafts[item.id];
    const val = draft.trim();
    if (val === (item.name_en ?? '')) return;
    const prev = item.name_en;
    patchLocalItem(item.id, { name_en: val || null });
    submitBg('upsertItem', {
      id: item.id, category_id: item.category_id,
      name_ko: item.name_ko, name_en: val,
      name_zh: item.name_zh ?? '', nickname: item.nickname ?? '',
    }, () => patchLocalItem(item.id, { name_en: prev }));
  }

  function commitPrice(item: Item) {
    const draft = priceDrafts[item.id];
    if (draft === undefined) return;
    delete priceDrafts[item.id];
    if (!selectedClientId) return;
    const price = parseInt(draft.replace(/[^0-9]/g, '') || '0', 10);
    const date  = getPriceDate(item.id) || todayYMD();
    const prevPrice = getPrice(item.id);
    patchLocalPrice(item.id, { unit_price: price }, selectedClientId);
    submitBg('upsertPrice', {
      item_id: item.id, client_id: selectedClientId,
      unit_price: String(price), effective_from: date,
    }, () => patchLocalPrice(item.id, { unit_price: prevPrice }, selectedClientId!));
  }

  function commitDate(item: Item) {
    const draft = dateDrafts[item.id];
    if (draft === undefined) return;
    delete dateDrafts[item.id];
    if (!selectedClientId) return;
    const val = draft.trim();
    if (!val || !isValidDate(val)) return;
    const price = getPrice(item.id);
    const prevDate = getPriceDate(item.id);
    patchLocalPrice(item.id, { effective_from: val }, selectedClientId);
    submitBg('upsertPrice', {
      item_id: item.id, client_id: selectedClientId,
      unit_price: String(price), effective_from: val,
    }, () => patchLocalPrice(item.id, { effective_from: prevDate }, selectedClientId!));
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
    const isNewRow  = row === newRowIdx;

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
        else { commitCell(row, col); moveFocus(row + 1, col); }
        break;
      case 'ArrowLeft':
        if (col > 0) { e.preventDefault(); commitCell(row, col); moveFocus(row, (col-1) as GridCol); }
        break;
      case 'ArrowRight':
        if (col < 5) { e.preventDefault(); commitCell(row, col); moveFocus(row, (col+1) as GridCol); }
        break;
      case 'Tab':
        e.preventDefault();
        if (!e.shiftKey) {
          commitCell(row, col);
          if (col < 5) moveFocus(row, (col+1) as GridCol);
          else moveFocus(row+1, 0);
        } else {
          commitCell(row, col);
          if (col > 0) moveFocus(row, (col-1) as GridCol);
          else if (row > 0) moveFocus(row-1, 5);
        }
        break;
      case 'Escape':
        if (!isNewRow) {
          const item = currentItems[row];
          delete nameDrafts[item.id]; delete aliasDrafts[item.id];
          delete cnDrafts[item.id];   delete enDrafts[item.id];
          delete priceDrafts[item.id]; delete dateDrafts[item.id];
        } else {
          newName = ''; newAlias = ''; newCn = ''; newEn = '';
          newPriceDate = todayYMD(); newPrice = '';
        }
        (e.target as HTMLElement).blur();
        activeRow = null;
        break;
    }
  }

  // 새 행 추가
  async function addItemAndContinue() {
    newRowSubmitTried = true;
    const name = newName.trim();
    if (!name || !selectedClientId || !effectiveCategoryId) return;
    if (!newRowPriceOk || !newRowDateOk) return;

    const price    = parseInt(newPrice.trim(), 10);
    const priceDate = newPriceDate;
    const catId    = effectiveCategoryId;
    const cliId    = selectedClientId;
    const alias    = newAlias.trim();
    const cn       = newCn.trim();
    const en       = newEn.trim();

    // 입력칬 즉시 쒈기
    newName = ''; newAlias = ''; newCn = ''; newEn = '';
    newPrice = '0'; newPriceDate = todayYMD();
    newRowSubmitTried = false;

    // 임시 ID로 로컬에 리스트 먼저 추가
    const tmpId = `tmp-${Date.now()}`;
    const maxSort = localItems.filter(i => i.category_id === catId)
      .reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
    const tmpItem: Item = {
      id: tmpId,
      category_id: catId,
      factory_id: selectedClient!.factory_id,
      name_ko: name,
      name_en: en || null,
      name_zh: cn || null,
      nickname: alias || null,
      sort_order: maxSort,
    };
    localItems = [...localItems, tmpItem];
    if (price > 0) patchLocalPrice(tmpId, { unit_price: price, effective_from: priceDate }, cliId);

    await tick();
    moveFocus(currentItems.length - 1, 0); // 방금 추가된 행으로

    // 백그라운드로 서버에 저장
    const form = new FormData();
    form.append('category_id', catId);
    form.append('name_ko', name);
    form.append('name_en', en);
    form.append('name_zh', cn);
    form.append('nickname', alias);

    try {
      const res = await fetch('?/upsertItem', { method: 'POST', body: form });
      if (!res.ok) throw new Error('server error');

      // 서버에서 실제 ID 받아서 임시 ID 교체
      // invalidateAll로 서버 data 동기화 (실제 id 필요)
      await invalidateAll();
      await tick();

      // 임시 id 제거하고 실제 id로 단가 다시 패치
      const realItem = data.items.find(i => i.name_ko === name && i.category_id === catId);
      if (realItem && price > 0) {
        // 임시 id 단가 제거, 실제 id로 추가
        localPrices = localPrices.filter(p => p.item_id !== tmpId);
        patchLocalPrice(realItem.id, { unit_price: price, effective_from: priceDate }, cliId);
        submitBg('upsertPrice', {
          item_id: realItem.id, client_id: cliId,
          unit_price: String(price), effective_from: priceDate,
        }, () => { localPrices = localPrices.filter(p => p.item_id !== realItem.id); });
      }
    } catch {
      // 실패 → 로캘 롤백
      localItems = localItems.filter(i => i.id !== tmpId);
      localPrices = localPrices.filter(p => p.item_id !== tmpId);
      showToast('품목 추가 실패 — 다시 시도해주세요.');
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
    const prevDate = getPriceDate(item.id);
    const cliId = selectedClientId;
    patchLocalPrice(item.id, { effective_from: date }, cliId);
    submitBg('upsertPrice', {
      item_id: item.id, client_id: cliId,
      unit_price: String(price), effective_from: date,
    }, () => patchLocalPrice(item.id, { effective_from: prevDate }, cliId));
    showDateModal = false; dateModalRow = null; dateModalValue = '';
  }

  function cancelDateModal() {
    showDateModal = false; dateModalRow = null; dateModalValue = '';
  }

  // 품목 삭제
  async function removeItem(id: string) {
    const removed = localItems.find(i => i.id === id);
    localItems = localItems.filter(i => i.id !== id);
    const ok = await submitBg('deleteItem', { id }, () => {
      if (removed) localItems = [...localItems, removed].sort((a, b) => a.sort_order - b.sort_order);
    });
    void ok;
  }

  // 순서 편집
  function startOrderEdit(i: number) {
    editingOrderRow = i;
    orderInputValue = String(i + 1);
    tick().then(() => {
      const el = document.getElementById(`order-input-${i}`) as HTMLInputElement | null;
      if (el) { el.focus(); el.select(); }
    });
  }

  async function commitOrderEdit(i: number) {
    if (!effectiveCategoryId) { editingOrderRow = null; return; }
    const max = currentItems.length;
    const raw = parseInt(orderInputValue, 10);
    if (!isNaN(raw)) {
      const to = Math.max(1, Math.min(raw, max)) - 1;
      if (to !== i) {
        const reordered = [...currentItems];
        const [moved] = reordered.splice(i, 1);
        reordered.splice(to, 0, moved);
        // 낙관적으로 localItems 순서 변경
        const prevOrder = [...localItems];
        localItems = [
          ...localItems.filter(x => !reordered.find(r => r.id === x.id)),
          ...reordered.map((r, idx) => ({ ...r, sort_order: idx })),
        ].sort((a, b) => a.sort_order - b.sort_order);
        submitBg('reorderItems', { ids: JSON.stringify(reordered.map(x => x.id)) },
          () => { localItems = prevOrder; });
      }
    }
    editingOrderRow = null;
  }

  function cancelOrderEdit() { editingOrderRow = null; }

  // 품목 드래그
  function onDragStart(e: DragEvent, i: number) {
    dragSrcIdx = i;
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }
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
      const prevOrder = [...localItems];
      localItems = [
        ...localItems.filter(x => !reordered.find(r => r.id === x.id)),
        ...reordered.map((r, idx) => ({ ...r, sort_order: idx })),
      ].sort((a, b) => a.sort_order - b.sort_order);
      submitBg('reorderItems', { ids: JSON.stringify(reordered.map(x => x.id)) },
        () => { localItems = prevOrder; });
    }
    dragSrcIdx = null; dragOverIdx = null;
  }
  function onDragEnd() { dragSrcIdx = null; dragOverIdx = null; }

  // 카테고리 드래그
  function onCatDragStart(e: DragEvent, i: number) {
    catDragSrcIdx = i;
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }
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
      const reordered = [...localCategories];
      const [moved] = reordered.splice(catDragSrcIdx, 1);
      reordered.splice(i, 0, moved);
      const prev = [...localCategories];
      localCategories = reordered.map((c, idx) => ({ ...c, sort_order: idx }));
      submitBg('reorderCategories', { ids: JSON.stringify(reordered.map(x => x.id)) },
        () => { localCategories = prev; });
    }
    catDragSrcIdx = null; catDragOverIdx = null;
  }
  function onCatDragEnd() { catDragSrcIdx = null; catDragOverIdx = null; }

  async function commitCatOrderEdit(i: number) {
    const max = localCategories.length;
    const raw = parseInt(catOrderInputValue, 10);
    if (!isNaN(raw)) {
      const to = Math.max(1, Math.min(raw, max)) - 1;
      if (to !== i) {
        const reordered = [...localCategories];
        const [moved] = reordered.splice(i, 1);
        reordered.splice(to, 0, moved);
        const prev = [...localCategories];
        localCategories = reordered.map((c, idx) => ({ ...c, sort_order: idx }));
        submitBg('reorderCategories', { ids: JSON.stringify(reordered.map(x => x.id)) },
          () => { localCategories = prev; });
      }
    }
    editingCatOrderIdx = null;
  }

  // 카테고리 추가
  async function addCategory() {
    const cat = newCatInput.trim();
    if (!cat || !selectedClient) return;
    newCatInput = '';
    await submitAndReload('upsertCategory', {
      name: cat,
      factory_id: selectedClient.factory_id,
    });
  }

  // 카테고리 삭제 확인
  async function confirmRemoveCategory() {
    if (!deleteCatTarget) return;
    const id = deleteCatTarget;
    deleteCatTarget = null;
    await submitAndReload('deleteCategory', { id });
  }
  function cancelRemoveCategory() { deleteCatTarget = null; }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && showDateModal) cancelDateModal(); }} />

<!-- ── 거래처 선택 모달 ──────────────────────────────────────────── -->
{#if showClientModal}
  <dialog open aria-modal="true" class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && (showClientModal = false)}
  >
    <div class="modal-box flex w-full max-w-lg flex-col overflow-hidden p-0" style="height: min(520px, 90vh);">
      <div class="flex shrink-0 items-center justify-between border-b border-base-200 px-5 py-4">
        <h3 class="text-base font-bold">거래처 선택</h3>
        <button onclick={() => (showClientModal = false)} aria-label="닫기" class="btn btn-ghost btn-sm btn-circle">
          <Icon icon="lucide:x" class="h-4 w-4" />
        </button>
      </div>
      <div class="shrink-0 px-4 py-3 border-b border-base-200">
        <SearchBar
          placeholder="거래처 검색..."
          items={clientSearchItems}
          onselect={(id) => { selectClient(id); showClientModal = false; }}
          class="w-full"
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        {#each data.clients as client (client.id)}
          <button
            onclick={() => { selectClient(client.id); showClientModal = false; }}
            class="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-base-200 {selectedClientId === client.id ? 'bg-primary/10 font-semibold text-primary' : ''}"
          >
            <span class="min-w-0 flex-1 truncate text-sm">{client.name}</span>
            {#if selectedClientId === client.id}
              <Icon icon="lucide:check" class="h-4 w-4 shrink-0 text-primary" />
            {/if}
          </button>
        {/each}
        {#if data.clients.length === 0}
          <p class="py-10 text-center text-sm opacity-50">거래처 없음</p>
        {/if}
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1"
      onclick={() => (showClientModal = false)}
      onkeydown={(e) => e.key === 'Escape' && (showClientModal = false)}
    ></div>
  </dialog>
{/if}

<!-- ── 카테고리 삭제 확인 모달 ──────────────────────────────────── -->
{#if deleteCatTarget}
  {@const targetCat = localCategories.find(c => c.id === deleteCatTarget)}
  {@const catItemCount = localItems.filter(i => i.category_id === deleteCatTarget).length}
  <dialog open aria-modal="true" class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && cancelRemoveCategory()}
  >
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="mb-2 text-base font-extrabold">카테고리 삭제</h3>
      <p class="mb-1 text-sm text-base-content/70">
        <span class="font-bold text-error">"{targetCat?.name}"</span> 카테고리를 삭제하시겠습니까?
      </p>
      {#if catItemCount > 0}
        <p class="mb-6 text-sm text-base-content/60">
          해당 카테고리의 품목 <strong>{catItemCount}개</strong>도 함께 삭제됩니다.
        </p>
      {:else}
        <p class="mb-6 text-sm text-base-content/60">해당 카테고리에 등록된 품목이 없습니다.</p>
      {/if}
      <div class="modal-action">
        <button onclick={cancelRemoveCategory} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmRemoveCategory} class="btn btn-error font-bold">삭제</button>
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1"
      onclick={cancelRemoveCategory}
      onkeydown={(e) => e.key === 'Escape' && cancelRemoveCategory()}
    ></div>
  </dialog>
{/if}

<!-- ── 메인 레이아웃 ─────────────────────────────────────────────── -->
<div class="h-full flex flex-col overflow-hidden bg-base-200">

  <!-- 헤더 -->
  <header class="shrink-0 border-b-2 border-base-300 bg-base-100 px-8 py-5">
    <div class="flex items-center gap-4">
      <h2 class="text-2xl font-extrabold tracking-tight">상품 관리</h2>
      <div class="ml-auto flex items-center gap-2">
        <button
          onclick={() => (showClientModal = true)}
          class="btn btn-sm btn-ghost border border-base-300 min-w-48 justify-between"
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

  <div class="flex flex-1 min-h-0 gap-5 overflow-hidden px-6 py-5">

    <!-- 카테고리 사이드바 -->
    <aside class="w-56 shrink-0 flex flex-col min-h-0 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow">
      <!-- 카테고리 추가 -->
      <div class="shrink-0 border-b-2 border-base-200 bg-base-200 px-4 py-3">
        <p class="mb-2 text-xs font-bold uppercase tracking-wide opacity-50">카테고리</p>
        <div class="flex gap-1.5">
          <input
            type="text"
            placeholder="새 카테고리"
            bind:value={newCatInput}
            onkeydown={(e) => e.key === 'Enter' && addCategory()}
            disabled={!selectedClientId}
            class="input input-xs input-bordered flex-1 min-w-0"
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
      <ul class="flex-1 min-h-0 overflow-y-auto py-1 flex flex-col gap-0.5 px-1">
        {#if !selectedClientId}
          <li class="px-4 py-8 text-center text-xs opacity-40 pointer-events-none">
            <span>거래처를<br/>선택해주세요</span>
          </li>
        {:else if localCategories.length === 0}
          <li class="px-4 py-8 text-center text-xs opacity-40 pointer-events-none">
            <span>카테고리 없음</span>
          </li>
        {:else}
          {#each localCategories as cat, ci (cat.id)}
            {@const isActive   = effectiveCategoryId === cat.id}
            {@const isDragOver = catDragOverIdx === ci}
            {@const isDragSrc  = catDragSrcIdx  === ci}
            <li
              draggable="true"
              ondragstart={(e) => onCatDragStart(e, ci)}
              ondragover={(e)  => onCatDragOver(e, ci)}
              ondragleave={(e) => onCatDragLeave(e, ci)}
              ondrop={(e)      => onCatDrop(e, ci)}
              ondragend={onCatDragEnd}
              animate:flip={{ duration: 180 }}
              class="rounded-lg transition-colors
                {isActive   ? 'bg-primary text-primary-content shadow' : 'hover:bg-base-200'}
                {isDragOver ? 'ring-2 ring-primary' : ''}
                {isDragSrc  ? 'opacity-40' : ''}"
            >
              <div class="flex items-center gap-1">
                <!-- 순번 -->
                <div class="w-8 shrink-0 flex items-center justify-center">
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
                      class="w-7 text-center text-xs rounded border border-primary bg-base-100 text-base-content outline-none py-0.5"
                    />
                  {:else}
                    <button
                      type="button"
                      class="text-[10px] font-bold opacity-40 cursor-pointer select-none w-7 text-center hover:opacity-80 bg-transparent border-none p-0"
                      onclick={() => startCatOrderEdit(ci)}
                    >{ci + 1}</button>
                  {/if}
                </div>
                <!-- 이름 버튼 -->
                <button
                  onclick={() => (selectedCategoryId = cat.id)}
                  draggable="false"
                  class="flex flex-1 items-center gap-1.5 px-1 py-2 text-left text-sm font-medium min-w-0"
                >
                  <Icon icon="lucide:grip-vertical" class="h-3.5 w-3.5 shrink-0 opacity-30 cursor-grab active:cursor-grabbing" />
                  <span class="min-w-0 flex-1 truncate">{cat.name}</span>
                </button>
                <!-- 삭제 -->
                <button
                  onclick={() => (deleteCatTarget = cat.id)}
                  title="카테고리 삭제"
                  class="btn btn-ghost btn-xs btn-circle opacity-0 hover:opacity-100 shrink-0 mr-1
                    {isActive ? 'text-primary-content/70 hover:text-primary-content' : 'text-base-content/50'}"
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
    <section class="flex flex-1 min-w-0 flex-col min-h-0 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow">
      <!-- 그리드 헤더 -->
      <div class="shrink-0 border-b-2 border-base-200 bg-base-200 px-6 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold">
            {#if effectiveCategoryId}
              {data.categories.find(c => c.id === effectiveCategoryId)?.name ?? ''}
            {:else}
              품목
            {/if}
          </span>
          <span class="badge badge-sm badge-neutral font-semibold">{currentItems.length}</span>
        </div>
        <p class="text-[11px] opacity-60 flex items-center gap-1.5">
          <kbd class="kbd kbd-sm">Tab</kbd> 이동
          <kbd class="kbd kbd-sm">Enter</kbd> 저장
          <kbd class="kbd kbd-sm">Esc</kbd> 취소
        </p>
      </div>

      <!-- 그리드 본문 -->
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
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
              <col style="width:4%"  />
              <col style="width:20%" />
              <col style="width:13%" />
              <col style="width:13%" />
              <col style="width:13%" />
              <col style="width:18%" />
              <col style="width:15%" />
              <col style="width:4%"  />
            </colgroup>
            <thead class="sticky top-0 z-10">
              <tr class="bg-base-200">
                <th class="h-9 px-2 text-center text-[11px] font-bold uppercase tracking-wide opacity-60 select-none border-b-2 border-r border-base-300">#</th>
                <th class="h-9 px-3 text-left   text-[11px] font-bold uppercase tracking-wide opacity-60 border-b-2 border-r border-base-300">품목명</th>
                <th class="h-9 px-3 text-right   text-[11px] font-bold uppercase tracking-wide opacity-60 border-b-2 border-r border-base-300">단가</th>
                <th class="h-9 px-3 text-center  text-[11px] font-bold uppercase tracking-wide opacity-60 border-b-2 border-r border-base-300">적용일</th>
                <th class="h-9 px-3 text-left   text-[11px] font-bold uppercase tracking-wide opacity-60 border-b-2 border-r border-base-300">별칭</th>
                <th class="h-9 px-3 text-left   text-[11px] font-bold uppercase tracking-wide opacity-60 border-b-2 border-r border-base-300">중국어</th>
                <th class="h-9 px-3 text-left   text-[11px] font-bold uppercase tracking-wide opacity-60 border-b-2 border-r border-base-300">영어</th>
                <th class="h-9 border-b-2 border-base-300"></th>
              </tr>
            </thead>
            <tbody>
              {#each currentItems as item, i (item.id)}
                {@const isActiveRow = activeRow === i}
                {@const isDragOver  = dragOverIdx === i}
                {@const isDragSrc   = dragSrcIdx  === i}
                <tr
                  draggable="true"
                  ondragstart={(e) => onDragStart(e, i)}
                  ondragover={(e)  => onDragOver(e, i)}
                  ondragleave={(e) => onDragLeave(e, i)}
                  ondrop={(e)      => onDrop(e, i)}
                  ondragend={onDragEnd}
                  animate:flip={{ duration: 150 }}
                  class="transition-colors group
                    {isActiveRow ? 'bg-primary/5' : 'hover:bg-base-200/50'}
                    {isDragOver  ? 'ring-2 ring-inset ring-primary' : ''}
                    {isDragSrc   ? 'opacity-40' : ''}"
                >
                  <!-- 순번 -->
                  <td class="h-9 border-b border-r border-base-200 px-2 text-center select-none">
                    {#if editingOrderRow === i}
                      <input
                        id="order-input-{i}"
                        type="text"
                        inputmode="numeric"
                        bind:value={orderInputValue}
                        onblur={() => commitOrderEdit(i)}
                        onkeydown={(e) => {
                          if (e.key === 'Enter')  commitOrderEdit(i);
                          if (e.key === 'Escape') cancelOrderEdit();
                        }}
                        class="w-8 text-center text-xs rounded border border-primary bg-base-100 outline-none py-0.5"
                      />
                    {:else}
                      <button
                        type="button"
                        class="text-[11px] opacity-40 cursor-pointer hover:opacity-80 select-none bg-transparent border-none p-0"
                        onclick={() => startOrderEdit(i)}
                      >{i + 1}</button>
                    {/if}
                  </td>

                  <!-- 품목명 -->
                  <td class="h-9 p-0 border-b border-r border-base-200">
                    <input
                      id="cell-{i}-0"
                      type="text"
                      value={getDisplayName(item)}
                      oninput={(e) => (nameDrafts[item.id] = (e.target as HTMLInputElement).value)}
                      onfocus={() => onCellFocus(i, 0)}
                      onblur={() => commitName(item)}
                      onkeydown={(e) => handleCellKeydown(e, i, 0)}
                      class="h-full w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/5"
                    />
                  </td>

                  <!-- 단가 -->
                  <td class="h-9 p-0 border-b border-r border-base-200">
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
                      onblur={() => commitPrice(item)}
                      onkeydown={(e) => handleCellKeydown(e, i, 1)}
                      placeholder="0"
                      class="h-full w-full bg-transparent px-3 text-right text-sm outline-none focus:bg-primary/5"
                    />
                  </td>

                  <!-- 적용일 -->
                  <td class="h-9 p-0 border-b border-r border-base-200">
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
                      class="h-full w-full bg-transparent px-3 text-center text-sm outline-none focus:bg-primary/5"
                    />
                  </td>

                  <!-- 별칭 -->
                  <td class="h-9 p-0 border-b border-r border-base-200">
                    <input
                      id="cell-{i}-3"
                      type="text"
                      value={getDisplayAlias(item)}
                      oninput={(e) => (aliasDrafts[item.id] = (e.target as HTMLInputElement).value)}
                      onfocus={() => onCellFocus(i, 3)}
                      onblur={() => commitAlias(item)}
                      onkeydown={(e) => handleCellKeydown(e, i, 3)}
                      class="h-full w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/5"
                    />
                  </td>

                  <!-- 중국어 -->
                  <td class="h-9 p-0 border-b border-r border-base-200">
                    <input
                      id="cell-{i}-4"
                      type="text"
                      value={getDisplayCn(item)}
                      oninput={(e) => (cnDrafts[item.id] = (e.target as HTMLInputElement).value)}
                      onfocus={() => onCellFocus(i, 4)}
                      onblur={() => commitCn(item)}
                      onkeydown={(e) => handleCellKeydown(e, i, 4)}
                      class="h-full w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/5"
                    />
                  </td>

                  <!-- 영어 -->
                  <td class="h-9 p-0 border-b border-r border-base-200">
                    <input
                      id="cell-{i}-5"
                      type="text"
                      value={getDisplayEn(item)}
                      oninput={(e) => (enDrafts[item.id] = (e.target as HTMLInputElement).value)}
                      onfocus={() => onCellFocus(i, 5)}
                      onblur={() => commitEn(item)}
                      onkeydown={(e) => handleCellKeydown(e, i, 5)}
                      class="h-full w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/5"
                    />
                  </td>

                  <!-- 삭제 -->
                  <td class="h-9 border-b border-base-200 px-1 text-center">
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
                {@const newRowIdx    = currentItems.length}
                {@const isNewRowActive = activeRow === newRowIdx}
                <tr class="transition-colors {isNewRowActive ? 'bg-success/5' : 'hover:bg-base-200/30'}">
                  <td class="h-9 border-b border-dashed border-r border-base-300 px-2 text-center text-[11px] opacity-30 select-none">
                    {newRowIdx + 1}
                  </td>
                  <td class="h-9 p-0 border-b border-dashed border-r border-base-300">
                    <input
                      id="cell-{newRowIdx}-0"
                      type="text"
                      placeholder="품목명 입력 후 Enter"
                      bind:value={newName}
                      onfocus={() => (activeRow = newRowIdx)}
                      onkeydown={(e) => handleCellKeydown(e, newRowIdx, 0)}
                      class="h-full w-full bg-transparent px-3 text-sm outline-none placeholder:opacity-30
                        {newRowSubmitTried && !newRowNameOk ? 'ring-2 ring-inset ring-error' : ''}"
                    />
                  </td>
                  <td class="h-9 p-0 border-b border-dashed border-r border-base-300">
                    <input
                      id="cell-{newRowIdx}-1"
                      type="text"
                      inputmode="numeric"
                      placeholder="0"
                      value={newPrice}
                      oninput={(e) => {
                        const el = e.target as HTMLInputElement;
                        const numeric = el.value.replace(/[^0-9]/g, '');
                        el.value = numeric;
                        newPrice = numeric;
                      }}
                      onfocus={() => (activeRow = newRowIdx)}
                      onkeydown={(e) => handleCellKeydown(e, newRowIdx, 1)}
                      class="h-full w-full bg-transparent px-3 text-right text-sm outline-none placeholder:opacity-30
                        {newRowSubmitTried && !newRowPriceOk ? 'ring-2 ring-inset ring-error' : ''}"
                    />
                  </td>
                  <td class="h-9 p-0 border-b border-dashed border-r border-base-300">
                    <input
                      id="cell-{newRowIdx}-2"
                      type="text"
                      inputmode="numeric"
                      placeholder="YYYY-MM-DD"
                      value={newPriceDate}
                      oninput={(e) => {
                        const el = e.target as HTMLInputElement;
                        const formatted = formatDateInput(el.value);
                        el.value = formatted;
                        el.setSelectionRange(formatted.length, formatted.length);
                        newPriceDate = formatted;
                      }}
                      onfocus={() => (activeRow = newRowIdx)}
                      onkeydown={(e) => handleCellKeydown(e, newRowIdx, 2)}
                      class="h-full w-full bg-transparent px-3 text-center text-sm outline-none placeholder:opacity-30
                        {newRowSubmitTried && !newRowDateOk ? 'ring-2 ring-inset ring-error' : ''}"
                    />
                  </td>
                  <td class="h-9 p-0 border-b border-dashed border-r border-base-300">
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
                  <td class="h-9 p-0 border-b border-dashed border-r border-base-300">
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
                  <td class="h-9 p-0 border-b border-dashed border-r border-base-300">
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
                  <td class="h-9 border-b border-dashed border-base-300 px-1 text-center">
                    {#if newName.trim()}
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
    <div class="modal-box w-full max-w-sm flex flex-col gap-4">
      <div>
        <h3 class="text-base font-bold mb-1">단가 적용일 변경</h3>
        <p class="text-xs opacity-50">YYYY-MM-DD 형식으로 입력하세요</p>
      </div>
      <div>
        <label for="dateInput" class="label label-text text-xs font-semibold mb-1">적용 시작일</label>
        <input
          id="dateInput"
          type="date"
          bind:value={dateModalValue}
          class="input input-bordered input-sm w-full"
        />
      </div>
      <div class="modal-action border-t border-base-200 pt-4 mt-0">
        <button type="button" onclick={cancelDateModal} class="btn btn-ghost btn-sm">취소</button>
        <button type="button" onclick={confirmDateModal} class="btn btn-primary btn-sm">확인</button>
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1"
      onclick={cancelDateModal}
      onkeydown={(e) => e.key === 'Escape' && cancelDateModal()}
    ></div>
  </dialog>
{/if}

<style>
  tr:hover button[title="품목 삭제"] { opacity: 1; }
  td:has(> input:focus) { background-color: hsl(var(--p) / 0.05); }
</style>

<!-- ── 토스트 알림 ─────────────────────────────────────────────── -->
{#each toasts as t (t.id)}
  <div
    class="fixed bottom-6 left-1/2 z-9999 -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all
      {t.type === 'error' ? 'bg-error text-error-content' : 'bg-success text-success-content'}"
    role="alert"
  >
    {t.msg}
  </div>
{/each}
