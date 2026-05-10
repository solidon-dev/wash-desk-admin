<script lang="ts">

  import Icon from '@iconify/svelte';
  import { onMount, tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { SvelteSet } from 'svelte/reactivity';

  // ── 카테고리 레이블 ────────────────────────────────────────────
  const CATEGORY_LABELS: Record<string, string> = {
    towel: '타월',
    sheet: '시트',
    uniform: '유니폼',
  };
  function catLabel(cat: string): string {
    return CATEGORY_LABELS[cat] ?? cat;
  }

  // ── 타입 배지 ─────────────────────────────────────────────────
  const typeBadge: Record<string, string> = {
    hotel:   'badge-info',
    pension: 'badge-success',
    resort:  'badge-warning',
    etc:     'badge-ghost',
  };
  const typeLabel: Record<string, string> = {
    hotel: '호텔', pension: '펜션', resort: '리조트', etc: '기타',
  };

  // ── 거래처 (로컬) ──────────────────────────────────────────────
  const clients = [
    { id: 'client-001', name: '그랜드호텔',    type: 'hotel'   },
    { id: 'client-002', name: '오션뷰펜션',    type: 'pension' },
    { id: 'client-003', name: '제주리조트',    type: 'resort'  },
    { id: 'client-004', name: '힐사이드호텔',  type: 'hotel'   },
    { id: 'client-005', name: '선셋펜션',      type: 'pension' },
    { id: 'client-006', name: '블루라군리조트', type: 'resort' },
  ].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  // ── 세탁물 품목 (로컈) ────────────────────────────────────────
  let laundryItems = $state([
    // 그랜드호텔 (client-001) – 타월/시트/유니폼
    { id: 'item-001', clientId: 'client-001', category: 'towel',   name: '대형타월',      alias: 'BT' as string | undefined,   nameCn: '大浴巾' as string | undefined, nameEn: 'Bath Towel' as string | undefined,      counts: { received: 0, washing: 20, completed: 150, stock: 80,  shipped: 500 }, updatedAt: '2025-01-17' },
    { id: 'item-002', clientId: 'client-001', category: 'towel',   name: '중형타웘',      alias: 'HT' as string | undefined,   nameCn: '浴巾'   as string | undefined, nameEn: 'Hand Towel' as string | undefined,      counts: { received: 0, washing: 10, completed:  90, stock: 45,  shipped: 300 }, updatedAt: '2025-01-17' },
    { id: 'item-003', clientId: 'client-001', category: 'towel',   name: '소형타월',      alias: 'FT' as string | undefined,   nameCn: '小浴巾' as string | undefined, nameEn: 'Face Towel' as string | undefined,      counts: { received: 0, washing:  5, completed:  40, stock: 20,  shipped: 120 }, updatedAt: '2025-01-17' },
    { id: 'item-004', clientId: 'client-001', category: 'sheet',   name: '싱글시트',      alias: 'SS' as string | undefined,   nameCn: '单人床单' as string | undefined, nameEn: 'Single Sheet' as string | undefined,   counts: { received: 0, washing: 10, completed:  80, stock: 40,  shipped: 300 }, updatedAt: '2025-01-17' },
    { id: 'item-005', clientId: 'client-001', category: 'sheet',   name: '더블시트',      alias: 'DS' as string | undefined,   nameCn: '双人床单' as string | undefined, nameEn: 'Double Sheet' as string | undefined,   counts: { received: 0, washing:  8, completed:  60, stock: 30,  shipped: 200 }, updatedAt: '2025-01-17' },
    { id: 'item-006', clientId: 'client-001', category: 'sheet',   name: '필로케이스',    alias: 'PC' as string | undefined,   nameCn: '枕头套' as string | undefined,   nameEn: 'Pillow Case' as string | undefined,     counts: { received: 0, washing:  6, completed:  50, stock: 25,  shipped: 180 }, updatedAt: '2025-01-17' },
    { id: 'item-007', clientId: 'client-001', category: 'sheet',   name: '더블커버',      alias: undefined,                    nameCn: '被套'   as string | undefined, nameEn: 'Duvet Cover' as string | undefined,     counts: { received: 0, washing:  4, completed:  30, stock: 15,  shipped: 100 }, updatedAt: '2025-01-17' },
    { id: 'item-008', clientId: 'client-001', category: 'uniform', name: '스태프유니폼',  alias: undefined,                    nameCn: '员工制服' as string | undefined, nameEn: 'Staff Uniform' as string | undefined,  counts: { received: 0, washing:  5, completed:  30, stock: 20,  shipped: 100 }, updatedAt: '2025-01-17' },
    { id: 'item-009', clientId: 'client-001', category: 'uniform', name: '주방복',            alias: undefined,                    nameCn: '厨师服' as string | undefined, nameEn: 'Chef Uniform' as string | undefined,    counts: { received: 0, washing:  3, completed:  20, stock: 10,  shipped:  60 }, updatedAt: '2025-01-17' },
    { id: 'item-010', clientId: 'client-001', category: 'uniform', name: '컴비네이션',    alias: undefined,                    nameCn: undefined,                          nameEn: 'Combination' as string | undefined,     counts: { received: 0, washing:  2, completed:  10, stock:  5,  shipped:  30 }, updatedAt: '2025-01-17' },
    // 오션뷰펜션 (client-002)
    { id: 'item-011', clientId: 'client-002', category: 'towel',   name: '소형타월',      alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing: 15, completed:  90, stock: 50,  shipped: 200 }, updatedAt: '2025-01-16' },
    { id: 'item-012', clientId: 'client-002', category: 'towel',   name: '대형타월',      alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing:  8, completed:  60, stock: 30,  shipped: 150 }, updatedAt: '2025-01-16' },
    { id: 'item-013', clientId: 'client-002', category: 'sheet',   name: '더블시트',      alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing:  5, completed:  40, stock: 20,  shipped: 100 }, updatedAt: '2025-01-16' },
    // 제주리조트 (client-003)
    { id: 'item-014', clientId: 'client-003', category: 'towel',   name: '바스타월',      alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing: 25, completed: 200, stock: 100, shipped: 800 }, updatedAt: '2025-01-15' },
    { id: 'item-015', clientId: 'client-003', category: 'towel',   name: '핸드타월',      alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing: 12, completed:  80, stock: 40,  shipped: 300 }, updatedAt: '2025-01-15' },
    { id: 'item-016', clientId: 'client-003', category: 'sheet',   name: '킹사이즈시트',  alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing:  6, completed:  50, stock: 25,  shipped: 150 }, updatedAt: '2025-01-15' },
    { id: 'item-017', clientId: 'client-003', category: 'sheet',   name: '퀸사이즈시트',  alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: undefined as string | undefined, counts: { received: 0, washing:  4, completed:  30, stock: 15,  shipped: 100 }, updatedAt: '2025-01-15' },
    { id: 'item-018', clientId: 'client-003', category: 'uniform', name: '가운',              alias: undefined as string | undefined, nameCn: undefined as string | undefined, nameEn: 'Gown' as string | undefined, counts: { received: 0, washing:  8, completed:  60, stock: 30,  shipped: 200 }, updatedAt: '2025-01-15' },
  ]);

  // ── 가격 정보 (로컬) ──────────────────────────────────────────
  let clientItemPrices = $state<{ clientId: string; category: string; itemName: string; unitPrice: number; priceEffectiveDate?: string; }[]>([]);

  // ── 가격 헬퍼 함수 ────────────────────────────────────────────
  function getClientItemPrices(clientId: string) {
    return clientItemPrices.filter(p => p.clientId === clientId);
  }

  function getUnitPrice(clientId: string, category: string, itemName: string): number {
    return clientItemPrices.find(
      p => p.clientId === clientId && p.category === category && p.itemName === itemName
    )?.unitPrice ?? 0;
  }

  function setClientItemPrice(clientId: string, category: string, itemName: string, price: number) {
    const idx = clientItemPrices.findIndex(
      p => p.clientId === clientId && p.category === category && p.itemName === itemName
    );
    if (idx >= 0) {
      clientItemPrices[idx].unitPrice = price;
    } else {
      clientItemPrices.push({ clientId, category, itemName, unitPrice: price });
    }
  }

  function saveClientItemPrices(clientId: string, prices: { category: string; itemName: string; unitPrice: number; priceEffectiveDate?: string; }[]) {
    clientItemPrices = [
      ...clientItemPrices.filter(p => p.clientId !== clientId),
      ...prices.map(p => ({ ...p, clientId })),
    ];
  }

  function getPriceEffectiveDate(clientId: string, category: string, itemName: string): string | undefined {
    return clientItemPrices.find(
      p => p.clientId === clientId && p.category === category && p.itemName === itemName
    )?.priceEffectiveDate;
  }

  function setPriceEffectiveDate(clientId: string, category: string, itemName: string, date: string | null) {
    const idx = clientItemPrices.findIndex(
      p => p.clientId === clientId && p.category === category && p.itemName === itemName
    );
    if (idx >= 0) {
      if (date) clientItemPrices[idx].priceEffectiveDate = date;
      else delete clientItemPrices[idx].priceEffectiveDate;
    } else if (date) {
      clientItemPrices.push({ clientId, category, itemName, unitPrice: 0, priceEffectiveDate: date });
    }
  }

  // ── 품목 헬퍼 함수 ────────────────────────────────────────────
  function addLaundryItemType(clientId: string, category: string, name: string) {
    const exists = laundryItems.some(
      i => i.clientId === clientId && i.category === category && i.name === name
    );
    if (exists) return null;
    const newItem = {
      id: crypto.randomUUID(),
      clientId,
      category,
      name,
      alias: undefined as string | undefined,
      nameCn: undefined as string | undefined,
      nameEn: undefined as string | undefined,
      counts: { received: 0, washing: 0, completed: 0, stock: 0, shipped: 0 },
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    laundryItems.push(newItem);
    return newItem;
  }

  function removeLaundryItem(id: string) {
    laundryItems = laundryItems.filter(i => i.id !== id);
  }

  function removeLaundryItemsByCategory(clientId: string, category: string) {
    laundryItems = laundryItems.filter(
      i => !(i.clientId === clientId && i.category === category)
    );
  }

  function reorderLaundryItems(clientId: string, category: string, fromIdx: number, toIdx: number) {
    const indices = laundryItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.clientId === clientId && item.category === category)
      .map(({ idx }) => idx);
    if (fromIdx < 0 || fromIdx >= indices.length || toIdx < 0 || toIdx >= indices.length) return;
    const globalFrom = indices[fromIdx];
    const globalTo   = indices[toIdx];
    const copy = [...laundryItems];
    const [moved] = copy.splice(globalFrom, 1);
    copy.splice(globalTo, 0, moved);
    laundryItems = copy;
  }

  function updateLaundryItemMeta(
    id: string,
    meta: { alias?: string; nameCn?: string; nameEn?: string }
  ) {
    const idx = laundryItems.findIndex(i => i.id === id);
    if (idx < 0) return;
    if ('alias'  in meta) laundryItems[idx].alias  = meta.alias;
    if ('nameCn' in meta) laundryItems[idx].nameCn = meta.nameCn;
    if ('nameEn' in meta) laundryItems[idx].nameEn = meta.nameEn;
    laundryItems[idx].updatedAt = new Date().toISOString().slice(0, 10);
  }

  function renameLaundryItem(
    id: string,
    newName: string,
    clientId: string,
    category: string
  ): boolean {
    const duplicate = laundryItems.some(
      i => i.id !== id && i.clientId === clientId && i.category === category && i.name === newName
    );
    if (duplicate) return false;
    const idx = laundryItems.findIndex(i => i.id === id);
    if (idx < 0) return false;
    laundryItems[idx].name      = newName;
    laundryItems[idx].updatedAt = new Date().toISOString().slice(0, 10);
    return true;
  }

  // ── 거래처 선택 상태 ──────────────────────────────────────────
  let selectedClientId = $state<string | null>(null);

  onMount(() => {
    const saved = localStorage.getItem('products_selectedClientId');
    if (saved && clients.find(c => c.id === saved)) {
      selectedClientId = saved;
    } else {
      selectedClientId = clients[0]?.id ?? null;
    }
  });

  $effect(() => {
    if (selectedClientId) {
      localStorage.setItem('products_selectedClientId', selectedClientId);
    }
  });

  const selectedClient = $derived(
    clients.find(c => c.id === selectedClientId) ?? null
  );

  // ── 거래처 선택 모달 ───────────────────────────────────────────────
  let showClientModal = $state(false);
  let clientSearch    = $state('');

  const filteredClients = $derived(
    clientSearch.trim()
      ? clients.filter(c =>
          c.name.toLowerCase().includes(clientSearch.trim().toLowerCase())
        )
      : clients
  );

  function openClientModal() {
    clientSearch   = '';
    showClientModal = true;
  }

  function handleSelectClient(id: string) {
    selectedClientId = id;
    showClientModal  = false;
  }

  // ── 복사 모달 ──────────────────────────────────────────────────
  let showCopyModal = $state(false);
  let showCopyConfirmModal = $state(false);
  let copySourceClientId = $state<string | null>(null);
  let copySourceSearch = $state('');

  const filteredClientsForCopy = $derived(
    copySourceSearch.trim()
      ? clients
          .filter(c => c.id !== selectedClientId)
          .filter(c =>
            c.name.toLowerCase().includes(copySourceSearch.trim().toLowerCase())
          )
      : clients.filter(c => c.id !== selectedClientId)
  );

  function openCopyModal() {
    copySourceSearch = '';
    copySourceClientId = null;
    showCopyModal = true;
  }

  function selectSourceForCopy(id: string) {
    copySourceClientId = id;
    showCopyModal = false;
    showCopyConfirmModal = true;
  }

  function confirmCopy() {
    if (!selectedClientId || !copySourceClientId) return;

    const sourceItems = laundryItems.filter(i => i.clientId === copySourceClientId);
    const sourcePrices = getClientItemPrices(copySourceClientId);

    const currentItemsList = laundryItems.filter(i => i.clientId === selectedClientId);
    for (const item of currentItemsList) {
      removeLaundryItem(item.id);
    }

    for (const sourceItem of sourceItems) {
      addLaundryItemType(selectedClientId, sourceItem.category, sourceItem.name);
    }

    const newPrices = sourcePrices.map(p => ({
      category: p.category,
      itemName: p.itemName,
      unitPrice: p.unitPrice,
    }));
    saveClientItemPrices(selectedClientId, newPrices);

    showCopyConfirmModal = false;
    copySourceClientId = null;
  }

  function cancelCopy() {
    showCopyModal = false;
    showCopyConfirmModal = false;
    copySourceClientId = null;
  }

  // ── 카테고리 ──────────────────────────────────────────────────
  let selectedCategory = $state<string | null>(null);
  let localCats        = $state<string[]>([]);
  let newCatInput      = $state('');

  const storeCats = $derived.by(() => {
    if (!selectedClientId) return [] as string[];
    const seen   = new SvelteSet<string>();
    const result: string[] = [];
    for (const item of laundryItems) {
      if (item.clientId === selectedClientId && !seen.has(item.category)) {
        seen.add(item.category);
        result.push(item.category);
      }
    }
    return result;
  });

  const allCategories = $derived(
    [...storeCats, ...localCats.filter(c => !storeCats.includes(c))]
  );

  const effectiveCat = $derived(
    selectedCategory && allCategories.includes(selectedCategory)
      ? selectedCategory
      : (allCategories[0] ?? null)
  );

  // 거래처 바뀌면 카테고리/입력 초기화
  $effect(() => {
    void selectedClientId;
    selectedCategory = null;
    localCats        = [];
    newCatInput      = '';
    resetGrid();
  });

  // 카테고리 바뀌면 입력 초기화
  $effect(() => {
    void effectiveCat;
    resetGrid();
  });

  function addCategory() {
    const cat = newCatInput.trim();
    if (!cat) return;
    if (allCategories.includes(cat)) {
      newCatInput      = '';
      selectedCategory = cat;
      return;
    }
    localCats        = [...localCats, cat];
    selectedCategory = cat;
    newCatInput      = '';
  }

  // ── 카테고리 삭제 확인 모달 ───────────────────────────────────
  let deleteCatTarget = $state<string | null>(null);

  function requestRemoveCategory(cat: string) {
    deleteCatTarget = cat;
  }

  function confirmRemoveCategory() {
    if (!deleteCatTarget) return;
    removeCategory(deleteCatTarget);
    deleteCatTarget = null;
  }

  function cancelRemoveCategory() {
    deleteCatTarget = null;
  }

  function removeCategory(cat: string) {
    const wasSelected = effectiveCat === cat;
    if (selectedClientId) {
      removeLaundryItemsByCategory(selectedClientId, cat);
    }
    localCats = localCats.filter(c => c !== cat);
    if (wasSelected) {
      const remaining  = allCategories.filter(c => c !== cat);
      selectedCategory = remaining[0] ?? null;
    }
  }

  // ── 품목 ──────────────────────────────────────────────────────
  const currentItems = $derived(
    selectedClientId && effectiveCat
      ? laundryItems.filter(
          i => i.clientId === selectedClientId && i.category === effectiveCat
        )
      : []
  );

  // ── 엑셀 그리드 상태 ──────────────────────────────────────────
  // col: 0=품목명, 1=단가, 2=별칭, 3=중국어, 4=영어, 5=가격적용시기
  type GridCol = 0 | 1 | 2 | 3 | 4 | 5;

  function todayYMD(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  let activeRow = $state<number | null>(null);

  // ── 순번 직접 편집 상태 ───────────────────────────────────────
  let editingOrderRow   = $state<number | null>(null);
  let orderInputValue   = $state('');

  function startOrderEdit(i: number) {
    editingOrderRow = i;
    orderInputValue = String(i + 1);
    tick().then(() => {
      const el = document.getElementById(`order-input-${i}`) as HTMLInputElement | null;
      if (el) { el.focus(); el.select(); }
    });
  }

  function commitOrderEdit(i: number) {
    if (!selectedClientId || !effectiveCat) { editingOrderRow = null; return; }
    const max = currentItems.length;
    const raw = parseInt(orderInputValue, 10);
    if (!isNaN(raw)) {
      const to = Math.max(1, Math.min(raw, max)) - 1; // 0-based
      if (to !== i) {
        reorderLaundryItems(selectedClientId, effectiveCat, i, to);
      }
    }
    editingOrderRow = null;
  }

  function cancelOrderEdit() {
    editingOrderRow = null;
  }

  // ── DnD 상태 ─────────────────────────────────────────────────
  let dragSrcIdx   = $state<number | null>(null);
  let dragOverIdx  = $state<number | null>(null);

  function onDragStart(e: DragEvent, i: number) {
    dragSrcIdx  = i;
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
    // 자식 요소로 이동 시 leave 무시
    const related = e.relatedTarget as Node | null;
    const row = (e.currentTarget as HTMLElement);
    if (related && row.contains(related)) return;
    if (dragOverIdx === i) dragOverIdx = null;
  }

  function onDrop(e: DragEvent, i: number) {
    e.preventDefault();
    if (dragSrcIdx !== null && dragSrcIdx !== i && selectedClientId && effectiveCat) {
      reorderLaundryItems(selectedClientId, effectiveCat, dragSrcIdx, i);
    }
    dragSrcIdx  = null;
    dragOverIdx = null;
  }

  function onDragEnd() {
    dragSrcIdx  = null;
    dragOverIdx = null;
  }

  // 기존 행 드래프트 (item.id → value)
  let nameDrafts      = $state<Record<string, string>>({});
  let aliasDrafts     = $state<Record<string, string>>({});
  let cnDrafts        = $state<Record<string, string>>({});
  let enDrafts        = $state<Record<string, string>>({});
  let priceDrafts     = $state<Record<string, string>>({});

  // 날짜 모달 상태
  let showDateModal   = $state(false);
  let dateModalRow    = $state<number | null>(null);
  let dateModalValue  = $state('');

  // 새 행 (마지막 빈 행)
  let newName      = $state('');
  let newAlias     = $state('');
  let newCn        = $state('');
  let newEn        = $state('');
  let newPriceDate = $state(todayYMD());
  let newPrice     = $state('');

  function resetGrid() {
    activeRow      = null;
    nameDrafts     = {};
    aliasDrafts    = {};
    cnDrafts       = {};
    enDrafts       = {};
    priceDrafts    = {};
    dateDrafts     = {};
    showDateModal  = false;
    dateModalRow   = null;
    dateModalValue = '';
    newName        = '';
    newAlias       = '';
    newCn          = '';
    newEn          = '';
    newPriceDate   = todayYMD();
    newPrice       = '';
  }

  function getNewRowIndex() {
    return currentItems.length;
  }

  async function moveFocus(row: number, col: GridCol) {
    const maxRow = getNewRowIndex(); // new-row index
    const clampedRow = Math.max(0, Math.min(row, maxRow));
    activeRow = clampedRow;
    await tick();
    const el = document.getElementById(`cell-${clampedRow}-${col}`) as HTMLElement | null;
    if (el) {
      el.focus();
      if ('select' in el) (el as HTMLInputElement).select();
    }
  }

  // 가격적용시기 draft (item.id → 입력 문자열)
  let dateDrafts = $state<Record<string, string>>({});

  // YYYYMMDD → YYYY-MM-DD 변환 (자동 대시 삽입)
  function formatDateInput(raw: string): string {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0,4)}-${digits.slice(4)}`;
    return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6)}`;
  }

  // YYYY-MM-DD 형식 유효성 검증
  function isValidDate(str: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
  }

  function onCellFocus(row: number, col: GridCol) {
    activeRow = row;
    // 드래프트 초기화
    if (row < currentItems.length) {
      const item = currentItems[row];
      if (col === 0 && nameDrafts[item.id] === undefined) {
        nameDrafts[item.id] = item.name;
      }
      if (col === 1 && priceDrafts[item.id] === undefined) {
        const p = selectedClientId && effectiveCat
          ? getUnitPrice(selectedClientId, effectiveCat, item.name)
          : 0;
        priceDrafts[item.id] = p > 0 ? String(p) : '';
      }
      if (col === 2 && aliasDrafts[item.id] === undefined) {
        aliasDrafts[item.id] = item.alias ?? '';
      }
      if (col === 3 && cnDrafts[item.id] === undefined) {
        cnDrafts[item.id] = item.nameCn ?? '';
      }
      if (col === 4 && enDrafts[item.id] === undefined) {
        enDrafts[item.id] = item.nameEn ?? '';
      }
      if (col === 5 && dateDrafts[item.id] === undefined) {
        const d = selectedClientId && effectiveCat
          ? getPriceEffectiveDate(selectedClientId, effectiveCat, item.name)
          : undefined;
        dateDrafts[item.id] = d ?? '';
      }
    }
  }

  function commitName(itemId: string, itemName: string) {
    const draft = nameDrafts[itemId];
    if (draft === undefined) return;
    const newN = draft.trim();
    if (!newN || newN === itemName) {
      nameDrafts[itemId] = itemName;
      return;
    }
    if (!selectedClientId || !effectiveCat) return;
    // 이름 변경: 순서 유지를 위해 인플레이스로 rename
    const oldPrice = getUnitPrice(selectedClientId, effectiveCat, itemName);
    const oldPriceDate = getPriceEffectiveDate(selectedClientId, effectiveCat, itemName);
    const renamed = renameLaundryItem(itemId, newN, selectedClientId, effectiveCat);
    if (!renamed) {
      // 중복 이름 등으로 실패 시 원복
      nameDrafts[itemId] = itemName;
      return;
    }
    // 가격 레코드도 새 이름으로 이전
    const prices = getClientItemPrices(selectedClientId)
      .filter(p => !(p.category === effectiveCat && p.itemName === itemName))
      .map(p => ({ category: p.category, itemName: p.itemName, unitPrice: p.unitPrice, priceEffectiveDate: p.priceEffectiveDate }));
    saveClientItemPrices(selectedClientId, prices);
    if (oldPrice > 0) {
      setClientItemPrice(selectedClientId, effectiveCat, newN, oldPrice);
    }
    if (oldPriceDate) {
      setPriceEffectiveDate(selectedClientId, effectiveCat, newN, oldPriceDate);
    }
    delete nameDrafts[itemId];
  }

  function commitAlias(itemId: string) {
    const draft = aliasDrafts[itemId];
    if (draft === undefined) return;
    const val = draft.trim();
    updateLaundryItemMeta(itemId, { alias: val || undefined });
    delete aliasDrafts[itemId];
  }

  function commitCn(itemId: string) {
    const draft = cnDrafts[itemId];
    if (draft === undefined) return;
    const val = draft.trim();
    updateLaundryItemMeta(itemId, { nameCn: val || undefined });
    delete cnDrafts[itemId];
  }

  function commitEn(itemId: string) {
    const draft = enDrafts[itemId];
    if (draft === undefined) return;
    const val = draft.trim();
    updateLaundryItemMeta(itemId, { nameEn: val || undefined });
    delete enDrafts[itemId];
  }

  function commitPrice(itemId: string, itemName: string) {
    const draft = priceDrafts[itemId];
    if (draft === undefined) return;
    if (!selectedClientId || !effectiveCat) return;
    const price = parseInt(draft.replace(/[^0-9]/g, ''), 10) || 0;
    setClientItemPrice(selectedClientId, effectiveCat, itemName, price);
    delete priceDrafts[itemId];
  }

  function commitDate(itemId: string, itemName: string) {
    const draft = dateDrafts[itemId];
    if (draft === undefined) return;
    if (!selectedClientId || !effectiveCat) return;
    const val = draft.trim();
    if (!val || isValidDate(val)) {
      setPriceEffectiveDate(selectedClientId, effectiveCat, itemName, val || null);
    }
    // 유효하지 않으면 원복
    delete dateDrafts[itemId];
  }

  function commitCell(row: number, col: GridCol) {
    if (row >= currentItems.length) return;
    const item = currentItems[row];
    if (col === 0) commitName(item.id, item.name);
    else if (col === 1) commitPrice(item.id, item.name);
    else if (col === 2) commitAlias(item.id);
    else if (col === 3) commitCn(item.id);
    else if (col === 4) commitEn(item.id);
    else if (col === 5) commitDate(item.id, item.name);
  }

  function handleCellKeydown(e: KeyboardEvent, row: number, col: GridCol) {
    const newRowIdx = getNewRowIndex();
    const isNewRow  = row === newRowIdx;

    // Regular navigation for all cols
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
        if (isNewRow) {
          // new row: Enter anywhere commits and adds
          addItemAndContinue();
        } else {
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
          if (col < 5) {
            moveFocus(row, (col + 1) as GridCol);
          } else {
            moveFocus(row + 1, 0);
          }
        } else {
          commitCell(row, col);
          if (col > 0) {
            moveFocus(row, (col - 1) as GridCol);
          } else if (row > 0) {
            moveFocus(row - 1, 5);
          }
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
          newName      = '';
          newAlias     = '';
          newCn        = '';
          newEn        = '';
          newPriceDate = todayYMD();
          newPrice     = '';
        }
        (e.target as HTMLElement).blur();
        activeRow = null;
        break;
    }
  }

  async function addItemAndContinue() {
    const name  = newName.trim();
    if (!name || !selectedClientId || !effectiveCat) {
      return;
    }
    const price = parseInt(newPrice.replace(/[^0-9]/g, ''), 10) || 0;
    const added = addLaundryItemType(selectedClientId, effectiveCat, name);
    if (added) {
      if (price > 0) setClientItemPrice(selectedClientId, effectiveCat, name, price);
      const priceDate = newPriceDate.trim();
      if (priceDate) setPriceEffectiveDate(selectedClientId, effectiveCat, name, priceDate);
      const alias = newAlias.trim();
      const cn    = newCn.trim();
      const en    = newEn.trim();
      if (alias || cn || en) {
        updateLaundryItemMeta(added.id, {
          alias: alias || undefined,
          nameCn: cn || undefined,
          nameEn: en || undefined,
        });
      }
    }
    localCats = localCats.filter(c => c !== effectiveCat);
    newName      = '';
    newAlias     = '';
    newCn        = '';
    newEn        = '';
    newPriceDate = todayYMD();
    newPrice     = '';
    await tick();
    // 추가 후 새 빈 행으로 포커스
    moveFocus(getNewRowIndex(), 0);
  }

  function confirmDateModal() {
    if (dateModalRow === null || !selectedClientId || !effectiveCat) return;
    const row = dateModalRow;
    if (row >= currentItems.length) return;
    const item = currentItems[row];
    const date = dateModalValue.trim();
    setPriceEffectiveDate(selectedClientId, effectiveCat, item.name, date || null);
    showDateModal = false;
    dateModalRow = null;
    dateModalValue = '';
  }

  function cancelDateModal() {
    showDateModal = false;
    dateModalRow = null;
    dateModalValue = '';
  }

  function removeItem(id: string, itemName: string) {
    if (!selectedClientId || !effectiveCat) return;
    removeLaundryItem(id);
    const prices = getClientItemPrices(selectedClientId)
      .filter(p => !(p.category === effectiveCat && p.itemName === itemName))
      .map(p => ({ category: p.category, itemName: p.itemName, unitPrice: p.unitPrice }));
    saveClientItemPrices(selectedClientId, prices);
    // 드래프트 정리
    delete nameDrafts[id];
    delete priceDrafts[id];
  }

  function getDisplayName(item: { id: string; name: string }) {
    return nameDrafts[item.id] ?? item.name;
  }

  function getDisplayAlias(item: { id: string; alias?: string }) {
    return aliasDrafts[item.id] ?? item.alias ?? '';
  }

  function getDisplayCn(item: { id: string; nameCn?: string }) {
    return cnDrafts[item.id] ?? item.nameCn ?? '';
  }

  function getDisplayEn(item: { id: string; nameEn?: string }) {
    return enDrafts[item.id] ?? item.nameEn ?? '';
  }

  function getDisplayPrice(item: { id: string; name: string }) {
    if (priceDrafts[item.id] !== undefined) return priceDrafts[item.id];
    if (!selectedClientId || !effectiveCat) return '';
    const p = getUnitPrice(selectedClientId, effectiveCat, item.name);
    return p > 0 ? String(p) : '';
  }

  function getDisplayPriceDate(item: { id: string; name: string }) {
    if (!selectedClientId || !effectiveCat) return '';
    return getPriceEffectiveDate(selectedClientId, effectiveCat, item.name) ?? '';
  }




</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && showDateModal) cancelDateModal(); }} />

<!-- ── 거래처 선택 모달 ───────────────────────────────────────── -->
{#if showClientModal}
  <dialog
    open
    aria-modal="true"
    class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && (showClientModal = false)}
  >
    <div class="modal-box flex w-full max-w-sm flex-col overflow-hidden p-0" style="max-height: min(560px, 90vh);">
      <!-- header -->
      <div class="flex shrink-0 items-center justify-between border-b border-base-200 px-5 py-4">
        <h3 class="text-base font-bold">거래처 선택</h3>
        <button
          onclick={() => (showClientModal = false)}
          aria-label="닫기"
          class="btn btn-ghost btn-sm btn-circle"
        >
          <Icon icon="lucide:x" class="h-4 w-4" />
        </button>
      </div>
      <!-- search -->
      <div class="shrink-0 px-4 py-3">
        <label class="input input-sm w-full flex items-center gap-2">
          <Icon icon="lucide:search" class="h-4 w-4 opacity-50" />
          <input
            type="text"
            placeholder="거래처 검색..."
            bind:value={clientSearch}
            class="grow"
          />
        </label>
      </div>
      <!-- list -->
      <ul class="menu min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {#if filteredClients.length === 0}
          <li class="py-10 text-center text-sm opacity-50"><span class="pointer-events-none">검색 결과 없음</span></li>
        {:else}
          {#each filteredClients as client (client.id)}
            <li>
              <button
                onclick={() => handleSelectClient(client.id)}
                class="flex w-full items-center gap-3 {selectedClientId === client.id ? 'active' : ''}"
              >
                <span
                  class="badge badge-sm font-bold {typeBadge[client.type] ?? 'bg-base-200 text-base-content'}"
                >
                  {typeLabel[client.type] ?? client.type}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{client.name}</span>
                {#if selectedClientId === client.id}
                  <Icon icon="lucide:check" class="h-4 w-4 shrink-0 text-primary" />
                {/if}
              </button>
            </li>
          {/each}
        {/if}
      </ul>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={() => (showClientModal = false)} onkeydown={(e) => e.key === 'Escape' && (showClientModal = false)}></div>
  </dialog>
{/if}

<!-- ── 복사 소스 선택 모달 ────────────────────────────────────── -->
{#if showCopyModal}
  <dialog
    open
    aria-modal="true"
    class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && cancelCopy()}
  >
    <div class="modal-box flex w-full max-w-sm flex-col overflow-hidden p-0" style="max-height: min(560px, 90vh);">
      <div class="flex shrink-0 items-center justify-between border-b border-base-200 px-5 py-4">
        <h3 class="text-base font-bold">복사할 거래처 선택</h3>
        <button
          onclick={cancelCopy}
          aria-label="닫기"
          class="btn btn-ghost btn-sm btn-circle"
        >
          <Icon icon="lucide:x" class="h-4 w-4" />
        </button>
      </div>
      <div class="shrink-0 px-4 py-3">
        <label class="input input-sm w-full flex items-center gap-2">
          <Icon icon="lucide:search" class="h-4 w-4 opacity-50" />
          <input
            type="text"
            placeholder="거래처 검색..."
            bind:value={copySourceSearch}
            class="grow"
          />
        </label>
      </div>
      <ul class="menu min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {#if filteredClientsForCopy.length === 0}
          <li class="py-10 text-center text-sm opacity-50"><span class="pointer-events-none">검색 결과 없음</span></li>
        {:else}
          {#each filteredClientsForCopy as client (client.id)}
            <li>
              <button
                onclick={() => selectSourceForCopy(client.id)}
                class="flex w-full items-center gap-3"
              >
                <span
                  class="badge badge-sm font-bold {typeBadge[client.type] ?? 'bg-base-200 text-base-content'}"
                >
                  {typeLabel[client.type] ?? client.type}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{client.name}</span>
              </button>
            </li>
          {/each}
        {/if}
      </ul>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={cancelCopy} onkeydown={(e) => e.key === 'Escape' && cancelCopy()}></div>
  </dialog>
{/if}

<!-- ── 복사 확인 모달 ─────────────────────────────────────────── -->
{#if showCopyConfirmModal && copySourceClientId && selectedClientId}
  {@const sourceClient  = clients.find(c => c.id === copySourceClientId)}
  {@const currentClient = clients.find(c => c.id === selectedClientId)}
  <dialog
    open
    aria-modal="true"
    class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && cancelCopy()}
  >
    <div class="modal-box w-full max-w-md p-0 overflow-hidden">
      <div class="flex shrink-0 items-center gap-3 border-b border-base-200 px-6 py-4">
        <Icon icon="lucide:triangle-alert" class="h-6 w-6 shrink-0 text-warning" />
        <h3 class="text-base font-bold">품목 복사 확인</h3>
      </div>
      <div class="px-6 py-4">
        <p class="mb-3 text-sm">
          <strong>{sourceClient?.name}</strong>의 품목과 단가를
          <strong>{currentClient?.name}</strong>에 복사합니다.
        </p>
        <p class="text-sm opacity-70">기존 품목은 모두 삭제되고 복사된 품목으로 교체됩니다.</p>
      </div>
      <div class="modal-action shrink-0 border-t border-base-200 bg-base-200 px-6 py-4 flex gap-2 justify-end">
        <button onclick={cancelCopy} class="btn btn-ghost btn-sm">취소</button>
        <button onclick={confirmCopy} class="btn btn-warning btn-sm">복사 실행</button>
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={cancelCopy} onkeydown={(e) => e.key === 'Escape' && cancelCopy()}></div>
  </dialog>
{/if}

<!-- ── 카테고리 삭제 확인 모달 ─────────────────────────────── -->
{#if deleteCatTarget}
  {@const catItemCount = selectedClientId ? laundryItems.filter(i => i.clientId === selectedClientId && i.category === deleteCatTarget).length : 0}
  <dialog open aria-modal="true" class="modal modal-open" onkeydown={(e) => e.key === 'Escape' && cancelRemoveCategory()}>
    <div class="modal-box w-full max-w-sm rounded-2xl p-6">
      <h3 class="text-base font-extrabold mb-2">카테고리 삭제</h3>
      <p class="text-sm text-base-content/70 mb-1">
        <span class="font-bold text-error">{catLabel(deleteCatTarget)}</span> 카테고리를 삭제합니다.
      </p>
      {#if catItemCount > 0}
        <p class="text-sm text-base-content/60 mb-6">해당 카테고리에 등록된 품목 <strong>{catItemCount}개</strong>도 함께 삭제됩니다.</p>
      {:else}
        <p class="text-sm text-base-content/60 mb-6">등록된 품목이 없습니다.</p>
      {/if}
      <div class="modal-action">
        <button onclick={cancelRemoveCategory} class="btn btn-ghost font-bold">취소</button>
        <button onclick={confirmRemoveCategory} class="btn btn-error font-bold">삭제</button>
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={cancelRemoveCategory} onkeydown={(e) => e.key === 'Escape' && cancelRemoveCategory()}></div>
  </dialog>
{/if}

<!-- ── 메인 레이아웃 ────────────────────────────────── -->
<div class="h-full flex flex-col overflow-hidden bg-base-200">

  <!-- 헤더 -->
  <header class="shrink-0 border-b-2 border-base-300 bg-base-100 px-8 py-5">
    <div class="flex items-center gap-4">
      <h2 class="text-2xl font-extrabold tracking-tight">상품 관리</h2>
      <div class="ml-auto flex items-center gap-2">
        <!-- 거래처 선택 버튼 -->
        <button
          onclick={openClientModal}
          class="btn btn-ghost btn-sm flex items-center gap-1.5"
        >
          <Icon icon="lucide:building-2" class="h-4 w-4 opacity-50" />
          {#if selectedClient}
            <span class="font-semibold">{selectedClient.name}</span>
          {:else}
            <span class="opacity-40">거래처 선택</span>
          {/if}
          <Icon icon="lucide:chevron-down" class="h-3.5 w-3.5 opacity-50" />
        </button>
        <!-- 복사 버튼 -->
        <button
          onclick={openCopyModal}
          disabled={!selectedClientId}
          class="btn btn-outline btn-sm flex items-center gap-1.5"
          title="다른 거래처 품목 복사"
        >
          <Icon icon="lucide:copy" class="h-4 w-4" />
          품목 복사
        </button>
      </div>
    </div>
  </header>

  <!-- 바디 -->
  <div class="flex flex-1 min-h-0 gap-5 overflow-hidden px-6 py-5">

    <!-- ── 카테고리 사이드바 ── -->
    <aside class="w-56 shrink-0 flex flex-col min-h-0 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow">

      <div class="shrink-0 border-b-2 border-base-200 bg-base-200 px-4 py-3">
        <p class="mb-2 text-xs font-bold uppercase tracking-wide opacity-50">카테고리</p>
        <div class="flex gap-1.5">
          <input
            type="text"
            placeholder="새 카테고리"
            bind:value={newCatInput}
            onkeydown={(e) => e.key === 'Enter' && addCategory()}
            disabled={!selectedClientId}
            class="input input-xs min-w-0 flex-1 disabled:opacity-50"
          />
          <button
            onclick={addCategory}
            aria-label="카테고리 추가"
            disabled={!newCatInput.trim() || !selectedClientId}
            class="btn btn-primary btn-xs btn-square"
          >
            <Icon icon="lucide:plus" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ul class="menu menu-sm bg-base-100 flex-1 min-h-0 overflow-y-auto py-1 flex-nowrap">
        {#if allCategories.length === 0}
          <li class="px-4 py-8 text-center text-xs opacity-40 pointer-events-none">
            <span>카테고리를<br/>추가해주세요</span>
          </li>
        {:else}
          {#each allCategories as cat (cat)}
            {@const isActive = effectiveCat === cat}
            <li class="group relative">
              <button
                onclick={() => (selectedCategory = cat)}
                class="w-full {isActive ? 'active font-bold' : 'font-medium'}"
              >
                <span class="min-w-0 flex-1 truncate">{catLabel(cat)}</span>
              </button>
              <button
                onclick={() => requestRemoveCategory(cat)}
                class="btn btn-ghost btn-xs btn-circle absolute right-1 top-1/2 -translate-y-1/2 hidden text-error group-hover:flex"
                title="카테고리 삭제"
              >
                ×
              </button>
            </li>
          {/each}
        {/if}
      </ul>
    </aside>

    <!-- ── 품목 패널 ── -->
    <section class="flex flex-1 min-w-0 flex-col min-h-0 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow">

      <!-- 패널 헤더 -->
      <div class="shrink-0 border-b-2 border-base-200 bg-base-200 px-6 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold">
            {effectiveCat ? catLabel(effectiveCat) : '—'}
          </span>
          <span class="badge badge-sm badge-neutral font-semibold">
            {currentItems.length}개
          </span>
        </div>
        <p class="text-[11px] opacity-60 flex items-center gap-1.5">
          <kbd class="kbd kbd-sm">↑↓←→</kbd>
          셀 이동 &nbsp;·&nbsp;
          <kbd class="kbd kbd-sm">Enter</kbd>
          다음 행 &nbsp;·&nbsp;
          <kbd class="kbd kbd-sm">Tab</kbd>
          다음 셀
        </p>
      </div>

      <!-- 테이블 -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        {#if !selectedClientId}
          <div class="flex h-full items-center justify-center">
            <p class="text-sm opacity-40">거래처를 선택해주세요.</p>
          </div>
        {:else if !effectiveCat}
          <div class="flex h-full items-center justify-center">
            <p class="text-sm opacity-40">카테고리를 추가해주세요.</p>
          </div>
        {:else}
          <table class="table table-xs w-full border-collapse">
            <!-- 컬럼 헤더 -->
            <thead class="sticky top-0 z-10">
              <tr class="border-b-2 border-base-300 bg-base-200">
                <th class="w-8 px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide opacity-60 select-none">#</th>
                <th class="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide opacity-60 min-w-[120px]">품목명</th>
                <th class="w-28 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide opacity-60">단가 (원)</th>
                <th class="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide opacity-60 min-w-[100px]">별칭</th>
                <th class="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide opacity-60 min-w-[110px]">중국어</th>
                <th class="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide opacity-60 min-w-[110px]">영어</th>
                <th class="w-36 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide opacity-60">가격적용시기</th>
                <th class="w-8 px-2 py-2.5"></th>
              </tr>
            </thead>

            <tbody>
              <!-- 기존 품목 행들 -->
              {#each currentItems as item, i (item.id)}
                {@const isActiveRow = activeRow === i}
                {@const isDragOver  = dragOverIdx === i}
                {@const isDragSrc   = dragSrcIdx  === i}
                <tr
                  animate:flip={{ duration: 220 }}
                  draggable="true"
                  ondragstart={(e) => onDragStart(e, i)}
                  ondragover={(e) => onDragOver(e, i)}
                  ondragleave={(e) => onDragLeave(e, i)}
                  ondrop={(e) => onDrop(e, i)}
                  ondragend={onDragEnd}
                  class="transition-colors
                    {isActiveRow ? 'bg-primary/5' : i % 2 === 0 ? 'bg-base-100 hover:bg-primary/5' : 'bg-base-200/40 hover:bg-primary/5'}
                    {isDragSrc  ? 'opacity-40' : ''}
                    {isDragOver ? 'ring-2 ring-inset ring-primary bg-primary/10' : ''}"
                >
                  <!-- 행 번호: 더블클릭 편집 / 드래그 핸들 -->
                  <td class="w-8 px-2 py-0 text-center select-none">
                    {#if editingOrderRow === i}
                      <input
                        id="order-input-{i}"
                        type="number"
                        min="1"
                        max={currentItems.length}
                        bind:value={orderInputValue}
                        onkeydown={(e) => {
                          if (e.key === 'Enter')  { e.preventDefault(); commitOrderEdit(i); }
                          if (e.key === 'Escape') { e.preventDefault(); cancelOrderEdit(); }
                        }}
                        onblur={() => commitOrderEdit(i)}
                        class="w-8 text-center text-xs font-bold bg-primary/10 border border-primary rounded outline-none text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    {:else}
                      <span
                        role="button"
                        tabindex="0"
                        class="block cursor-grab active:cursor-grabbing text-xs font-bold opacity-40 hover:opacity-70 transition-opacity"
                        title="드래그하거나 더블클릭으로 순번 변경"
                        ondblclick={() => startOrderEdit(i)}
                        onkeydown={(e) => e.key === 'Enter' && startOrderEdit(i)}
                      >
                        {i + 1}
                      </span>
                    {/if}
                  </td>

                  <!-- 품목명 셀 -->
                  <td class="p-0 min-w-[120px]">
                    <input
                      id="cell-{i}-0"
                      type="text"
                      value={getDisplayName(item)}
                      oninput={(e) => { nameDrafts[item.id] = e.currentTarget.value; }}
                      onfocus={() => onCellFocus(i, 0)}
                      onblur={() => commitName(item.id, item.name)}
                      onkeydown={(e) => handleCellKeydown(e, i, 0)}
                      class="w-full px-3 py-2.5 bg-transparent font-medium border-2 border-transparent rounded outline-none focus:border-primary focus:bg-base-100 focus:shadow-sm transition-all duration-75"
                    />
                  </td>

                  <!-- 단가 셀 -->
                  <td class="p-0 w-28">
                    <input
                      id="cell-{i}-1"
                      type="text"
                      inputmode="numeric"
                      value={getDisplayPrice(item)}
                      oninput={(e) => { priceDrafts[item.id] = e.currentTarget.value; }}
                      onfocus={() => onCellFocus(i, 1)}
                      onblur={() => commitPrice(item.id, item.name)}
                      onkeydown={(e) => handleCellKeydown(e, i, 1)}
                      placeholder="—"
                      class="w-full px-3 py-2.5 text-right bg-transparent border-2 border-transparent rounded outline-none focus:border-primary focus:bg-base-100 focus:shadow-sm placeholder:opacity-20 transition-all duration-75"
                    />
                  </td>

                  <!-- 별칭 셀 -->
                  <td class="p-0 min-w-[100px]">
                    <input
                      id="cell-{i}-2"
                      type="text"
                      value={getDisplayAlias(item)}
                      oninput={(e) => { aliasDrafts[item.id] = e.currentTarget.value; }}
                      onfocus={() => onCellFocus(i, 2)}
                      onblur={() => commitAlias(item.id)}
                      onkeydown={(e) => handleCellKeydown(e, i, 2)}
                      placeholder="—"
                      class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-primary focus:bg-base-100 focus:shadow-sm placeholder:opacity-20 transition-all duration-75"
                    />
                  </td>

                  <!-- 중국어 셀 -->
                  <td class="p-0 min-w-[110px]">
                    <input
                      id="cell-{i}-3"
                      type="text"
                      value={getDisplayCn(item)}
                      oninput={(e) => { cnDrafts[item.id] = e.currentTarget.value; }}
                      onfocus={() => onCellFocus(i, 3)}
                      onblur={() => commitCn(item.id)}
                      onkeydown={(e) => handleCellKeydown(e, i, 3)}
                      placeholder="—"
                      class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-primary focus:bg-base-100 focus:shadow-sm placeholder:opacity-20 transition-all duration-75"
                    />
                  </td>

                  <!-- 영어 셀 -->
                  <td class="p-0 min-w-[110px]">
                    <input
                      id="cell-{i}-4"
                      type="text"
                      value={getDisplayEn(item)}
                      oninput={(e) => { enDrafts[item.id] = e.currentTarget.value; }}
                      onfocus={() => onCellFocus(i, 4)}
                      onblur={() => commitEn(item.id)}
                      onkeydown={(e) => handleCellKeydown(e, i, 4)}
                      placeholder="—"
                      class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-primary focus:bg-base-100 focus:shadow-sm placeholder:opacity-20 transition-all duration-75"
                    />
                  </td>

                  <!-- 가격적용시기 셀 (인라인 텍스트 입력) -->
                  <td class="p-0 w-36">
                    <input
                      id="cell-{i}-5"
                      type="text"
                      inputmode="numeric"
                      value={dateDrafts[item.id] ?? getDisplayPriceDate(item)}
                      oninput={(e) => {
                        dateDrafts[item.id] = formatDateInput(e.currentTarget.value);
                        e.currentTarget.value = dateDrafts[item.id];
                      }}
                      onfocus={() => onCellFocus(i, 5)}
                      onblur={() => commitDate(item.id, item.name)}
                      onkeydown={(e) => handleCellKeydown(e, i, 5)}
                      placeholder="YYYY-MM-DD"
                      class={`w-full px-3 py-2.5 text-center font-mono text-sm bg-transparent border-2 rounded outline-none transition-all duration-75 placeholder:opacity-20 ${(!dateDrafts[item.id] && !getDisplayPriceDate(item)) || isValidDate(dateDrafts[item.id] ?? getDisplayPriceDate(item)) ? 'border-transparent focus:border-primary focus:bg-base-100 focus:shadow-sm' : 'border-error/50 bg-error/5 text-error'}`}
                    />
                  </td>

                  <!-- 삭제 버튼 -->
                  <td class="w-8 px-2 py-0 text-center">
                    <button
                      onclick={() => removeItem(item.id, item.name)}
                      class="btn btn-ghost btn-xs btn-square text-error opacity-0 transition-opacity"
                      title="품목 삭제"
                      tabindex="-1"
                    >
                      <Icon icon="lucide:trash-2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              {/each}

              <!-- 새 행 (빈 입력 행) -->
              {#if true}
              {@const newRowIdx = currentItems.length}
              {@const isNewRowActive = activeRow === newRowIdx}
              <tr class="border-b border-dashed border-base-300 transition-colors {isNewRowActive ? 'bg-success/5' : 'hover:bg-base-200/30'}">
                <!-- 행 번호 (별표) -->
                <td class="w-8 px-2 py-0 text-center text-[11px] opacity-20 select-none">
                  ✦
                </td>

                <!-- 새 품목명 -->
                <td class="p-0 min-w-[120px]">
                  <input
                    id="cell-{newRowIdx}-0"
                    type="text"
                    bind:value={newName}
                    onfocus={() => { activeRow = newRowIdx; }}
                    onblur={() => { if (activeRow === newRowIdx) activeRow = null; }}
                    onkeydown={(e) => handleCellKeydown(e, newRowIdx, 0)}
                    placeholder="새 품목명..."
                    class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-success focus:bg-base-100 focus:shadow-sm placeholder:opacity-30 transition-all duration-75"
                  />
                </td>

                <!-- 새 단가 -->
                <td class="p-0 w-28">
                  <input
                    id="cell-{newRowIdx}-1"
                    type="text"
                    inputmode="numeric"
                    bind:value={newPrice}
                    onfocus={() => { activeRow = newRowIdx; }}
                    onblur={() => { if (activeRow === newRowIdx) activeRow = null; }}
                    onkeydown={(e) => handleCellKeydown(e, newRowIdx, 1)}
                    placeholder="단가"
                    class="w-full px-3 py-2.5 text-right bg-transparent border-2 border-transparent rounded outline-none focus:border-success focus:bg-base-100 focus:shadow-sm placeholder:opacity-30 transition-all duration-75"
                  />
                </td>

                <!-- 새 행 별칭 -->
                <td class="p-0 min-w-[100px]">
                  <input
                    id="cell-{newRowIdx}-2"
                    type="text"
                    bind:value={newAlias}
                    onfocus={() => { activeRow = newRowIdx; }}
                    onblur={() => { if (activeRow === newRowIdx) activeRow = null; }}
                    onkeydown={(e) => handleCellKeydown(e, newRowIdx, 2)}
                    placeholder="—"
                    class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-success focus:bg-base-100 focus:shadow-sm placeholder:opacity-30 transition-all duration-75"
                  />
                </td>

                <!-- 새 행 중국어 -->
                <td class="p-0 min-w-[110px]">
                  <input
                    id="cell-{newRowIdx}-3"
                    type="text"
                    bind:value={newCn}
                    onfocus={() => { activeRow = newRowIdx; }}
                    onblur={() => { if (activeRow === newRowIdx) activeRow = null; }}
                    onkeydown={(e) => handleCellKeydown(e, newRowIdx, 3)}
                    placeholder="—"
                    class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-success focus:bg-base-100 focus:shadow-sm placeholder:opacity-30 transition-all duration-75"
                  />
                </td>

                <!-- 새 행 영어 -->
                <td class="p-0 min-w-[110px]">
                  <input
                    id="cell-{newRowIdx}-4"
                    type="text"
                    bind:value={newEn}
                    onfocus={() => { activeRow = newRowIdx; }}
                    onblur={() => { if (activeRow === newRowIdx) activeRow = null; }}
                    onkeydown={(e) => handleCellKeydown(e, newRowIdx, 4)}
                    placeholder="—"
                    class="w-full px-3 py-2.5 bg-transparent border-2 border-transparent rounded outline-none focus:border-success focus:bg-base-100 focus:shadow-sm placeholder:opacity-30 transition-all duration-75"
                  />
                </td>

                <!-- 새 행 가격적용시기 -->
                <td class="p-0 w-36">
                  <input
                    id="cell-{newRowIdx}-5"
                    type="text"
                    inputmode="numeric"
                    value={newPriceDate}
                    oninput={(e) => {
                      newPriceDate = formatDateInput(e.currentTarget.value);
                      e.currentTarget.value = newPriceDate;
                    }}
                    onfocus={() => { activeRow = newRowIdx; }}
                    onblur={() => { if (activeRow === newRowIdx) activeRow = null; }}
                    onkeydown={(e) => handleCellKeydown(e, newRowIdx, 5)}
                    placeholder="YYYY-MM-DD"
                    class="w-full px-3 py-2.5 text-center font-mono text-sm bg-transparent border-2 border-transparent rounded outline-none focus:border-success focus:bg-base-100 focus:shadow-sm placeholder:opacity-30 transition-all duration-75"
                  />
                </td>

                <!-- 추가 버튼 (품목명이 있을 때만) -->
                <td class="w-8 px-2 py-0 text-center">
                  {#if newName.trim()}
                    <button
                      onclick={() => addItemAndContinue()}
                      class="btn btn-success btn-xs btn-square"
                      title="추가 (Enter)"
                      tabindex="-1"
                    >
                      <Icon icon="lucide:check" class="h-3.5 w-3.5" />
                    </button>
                  {/if}
                </td>
              </tr>

              <!-- 빈 공간 행 (시각적 여백) -->
              <tr>
                <td colspan="8" class="h-16"></td>
              </tr>

              {/if}
            </tbody>
          </table>
        {/if}
      </div>
    </section>

  </div>
</div>

<!-- ── 가격 적용 시기 날짜 모달 ── -->
{#if showDateModal && dateModalRow !== null}
  <dialog
    open
    aria-modal="true"
    class="modal modal-open"
    onkeydown={(e) => e.key === 'Escape' && cancelDateModal()}
  >
    <div class="modal-box w-full max-w-sm flex flex-col gap-4">
      <div>
        <h3 class="text-base font-bold mb-1">가격 적용 시기</h3>
        <p class="text-xs opacity-50">이 날짜부터 해당 단가가 적용됩니다</p>
      </div>

      <div>
        <label for="dateInput" class="label label-text text-xs font-semibold mb-1">
          적용 시작일 (YYYY-MM-DD)
        </label>
        <input
          id="dateInput"
          type="date"
          bind:value={dateModalValue}
          class="input input-sm w-full"
        />
      </div>

      <div class="modal-action border-t border-base-200 pt-4 mt-0">
        <button type="button" onclick={cancelDateModal} class="btn btn-ghost btn-sm">취소</button>
        <button type="button" onclick={confirmDateModal} class="btn btn-primary btn-sm">확인</button>
      </div>
    </div>
    <div class="modal-backdrop" role="button" tabindex="-1" onclick={cancelDateModal} onkeydown={(e) => e.key === 'Escape' && cancelDateModal()}></div>
  </dialog>
{/if}

<style>
  /* 삭제 버튼: tr에 group이 없어서 table row hover 이벤트로 처리 */
  tr:hover button[title="품목 삭제"] {
    opacity: 1;
  }

  thead tr th {
    letter-spacing: 0.06em;
  }

  tbody tr {
    border-bottom: 1px solid #e2e8f0;
  }
</style>
