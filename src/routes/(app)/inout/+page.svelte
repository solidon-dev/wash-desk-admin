<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	type LaundryCategory = 'towel' | 'sheet' | 'uniform' | 'all';
	type ShipmentItem = { laundryItemId: string; itemName: string; category: string; quantity: number };
	type Shipment = { id: string; clientId: string; items: ShipmentItem[]; driverId: string; shippedAt: string; createdAt: string; memo?: string };

	const clients = [
		{ id: 'client-001', name: '그랜드호텔' },
		{ id: 'client-002', name: '오션뷰펜션' },
		{ id: 'client-003', name: '제주리조트' },
		{ id: 'client-004', name: '힐사이드호텔' },
		{ id: 'client-005', name: '선셋펜션' },
		{ id: 'client-006', name: '블루라군리조트' },
	];

	let laundryItems = $state([
		{ id: 'item-001', clientId: 'client-001', category: 'towel', name: '대형타올', counts: { received: 0, washing: 20, completed: 150, stock: 80, shipped: 500 }, updatedAt: '2025-01-17' },
		{ id: 'item-002', clientId: 'client-001', category: 'sheet', name: '싱글시트', counts: { received: 0, washing: 10, completed: 80, stock: 40, shipped: 300 }, updatedAt: '2025-01-17' },
		{ id: 'item-003', clientId: 'client-001', category: 'uniform', name: '직원유니폼', counts: { received: 0, washing: 5, completed: 30, stock: 20, shipped: 100 }, updatedAt: '2025-01-17' },
		{ id: 'item-004', clientId: 'client-002', category: 'towel', name: '소형타올', counts: { received: 0, washing: 15, completed: 90, stock: 50, shipped: 200 }, updatedAt: '2025-01-16' },
		{ id: 'item-005', clientId: 'client-002', category: 'sheet', name: '더블시트', counts: { received: 0, washing: 8, completed: 60, stock: 30, shipped: 150 }, updatedAt: '2025-01-16' },
		{ id: 'item-006', clientId: 'client-003', category: 'towel', name: '바스타올', counts: { received: 0, washing: 25, completed: 200, stock: 100, shipped: 800 }, updatedAt: '2025-01-15' },
	]);

	let shipments = $state<Shipment[]>([
		{ id: 'ship-001', clientId: 'client-001', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 50 }, { laundryItemId: 'item-002', itemName: '싱글시트', category: 'sheet', quantity: 20 }], driverId: 'driver-001', shippedAt: '2025-01-10T10:00:00', createdAt: '2025-01-10T10:00:00' },
		{ id: 'ship-002', clientId: 'client-002', items: [{ laundryItemId: 'item-004', itemName: '소형타올', category: 'towel', quantity: 30 }], driverId: 'driver-001', shippedAt: '2025-01-12T14:00:00', createdAt: '2025-01-12T14:00:00' },
		{ id: 'ship-003', clientId: 'client-001', items: [{ laundryItemId: 'item-001', itemName: '대형타올', category: 'towel', quantity: 40 }, { laundryItemId: 'item-003', itemName: '직원유니폼', category: 'uniform', quantity: 10 }], driverId: 'driver-002', shippedAt: '2025-01-15T09:00:00', createdAt: '2025-01-15T09:00:00' },
		{ id: 'ship-004', clientId: 'client-003', items: [{ laundryItemId: 'item-006', itemName: '바스타올', category: 'towel', quantity: 80 }], driverId: 'driver-001', shippedAt: '2025-01-16T11:00:00', createdAt: '2025-01-16T11:00:00' },
	]);

	function getShipmentsByDateRange(clientId: string | null, from: string, to: string) {
		const fromTs = new Date(from).getTime();
		const toTs = new Date(to).getTime();
		return shipments.filter(s => {
			if (clientId && clientId !== 'all' && s.clientId !== clientId) return false;
			const ts = new Date(s.shippedAt).getTime();
			return ts >= fromTs && ts <= toTs;
		});
	}

	// ── 탭 상태 ──────────────────────────────────────────────────────
	let activeTab = $state<'status' | 'history'>('status');

	// ── 탭1: 세탁완료 현황 필터 ──────────────────────────────────────
	let statusClientFilter = $state<string>('all');
	let statusCategoryFilter = $state<Exclude<LaundryCategory, 'all'> | 'all'>('all');

	const categoryButtons: Array<{ key: Exclude<LaundryCategory, 'all'> | 'all'; label: string }> = [
		{ key: 'all', label: '전체' },
		{ key: 'towel', label: '타올' },
		{ key: 'sheet', label: '시트' },
		{ key: 'uniform', label: '유니폼' }
	];

	const categoryBadge: Record<string, string> = {
		towel: 'badge-info',
		sheet: 'badge-secondary',
		uniform: 'badge-warning'
	};

	const CATEGORY_LABELS: Record<string, string> = { towel: '타월', sheet: '시트', uniform: '유니폼', all: '전체' };

	// 필터 적용 + 세탁완료>0 우선 정렬
	const filteredStatusItems = $derived.by(() => {
		let items = laundryItems.slice();
		if (statusClientFilter !== 'all') {
			items = items.filter((i) => i.clientId === statusClientFilter);
		}
		if (statusCategoryFilter !== 'all') {
			items = items.filter((i) => i.category === statusCategoryFilter);
		}
		// 세탁완료 > 0 우선, 그 다음 clientId, category, name 순
		items.sort((a, b) => {
			const aHas = a.counts.completed > 0 ? 0 : 1;
			const bHas = b.counts.completed > 0 ? 0 : 1;
			if (aHas !== bHas) return aHas - bHas;
			if (a.clientId !== b.clientId) return a.clientId.localeCompare(b.clientId);
			if (a.category !== b.category) return a.category.localeCompare(b.category);
			return a.name.localeCompare(b.name);
		});
		return items;
	});

	// 거래처별 소계 계산 (clientId → { completed, stock })
	const clientSubtotals = $derived.by(() => {
		const map = new SvelteMap<string, { completed: number; stock: number }>();
		for (const item of filteredStatusItems) {
			const cur = map.get(item.clientId) ?? { completed: 0, stock: 0 };
			cur.completed += item.counts.completed;
			cur.stock += item.counts.stock;
			map.set(item.clientId, cur);
		}
		return map;
	});

	// 소계 행을 삽입하기 위해 (clientId 전환점 체크용)
	function isLastOfClient(idx: number): boolean {
		const items = filteredStatusItems;
		if (idx === items.length - 1) return true;
		return items[idx].clientId !== items[idx + 1].clientId;
	}

	// ── 탭2: 출고 이력 ──────────────────────────────────────────────

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

	let fromDate = $state(firstDayOfMonth());
	let toDate = $state(todayStr());
	let historyClientFilter = $state<string>('all');

	// 조회 결과 (버튼 클릭 시 갱신)
	let queriedFrom = $state(firstDayOfMonth());
	let queriedTo = $state(todayStr());
	let queriedClientId = $state<string | null>(null);

	let expandedShipmentIds = new SvelteSet<string>();

	function doQuery() {
		queriedFrom = fromDate;
		queriedTo = toDate;
		queriedClientId = historyClientFilter === 'all' ? null : historyClientFilter;
		expandedShipmentIds.clear();
	}

	const queryResults = $derived(
		getShipmentsByDateRange(queriedClientId, queriedFrom, queriedTo + 'T23:59:59')
			.slice()
			.sort((a, b) => new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime())
	);

	// 요약 카드
	const summaryTotalCount = $derived(queryResults.length);
	const summaryTotalQty = $derived(
		queryResults.reduce((s, sh) => s + sh.items.reduce((ss, i) => ss + i.quantity, 0), 0)
	);
	const summaryClientCount = $derived(new Set(queryResults.map((s) => s.clientId)).size);

	function toggleExpand(id: string) {
		if (expandedShipmentIds.has(id)) expandedShipmentIds.delete(id);
		else expandedShipmentIds.add(id);
	}

	function formatDateTime(dateStr: string): string {
		const d = new Date(dateStr);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function shipmentSummary(ship: Shipment): string {
		return ship.items.map((i) => `${i.itemName} ${i.quantity}개`).join(', ');
	}

	function shipmentTotalQty(ship: Shipment): number {
		return ship.items.reduce((s, i) => s + i.quantity, 0);
	}
</script>

<svelte:head>
	<title>입출고 관리 — 세탁 관리자</title>
</svelte:head>

<div class="space-y-6 px-8 py-6 bg-base-200 min-h-screen">

	<!-- 헤더 -->
	<div class="flex items-end justify-between">
		<h2 class="text-2xl font-bold text-base-content">입출고 관리</h2>
	</div>

	<!-- 탭 -->
	<div class="tabs tabs-boxed bg-base-100 shadow-sm w-fit gap-1 p-1">
		<button
			class="tab tab-lg font-semibold transition-all duration-150
				{activeTab === 'status' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'status')}
		>
			현재 세탁완료 현황
		</button>
		<button
			class="tab tab-lg font-semibold transition-all duration-150
				{activeTab === 'history' ? 'tab-active' : ''}"
			onclick={() => (activeTab = 'history')}
		>
			출고 이력
		</button>
	</div>

	<!-- ══════════════════════════════════════════════════════ -->
	<!-- 탭 1: 현재 세탁완료 현황                               -->
	<!-- ══════════════════════════════════════════════════════ -->
	{#if activeTab === 'status'}

		<!-- 필터 -->
		<div class="flex flex-wrap items-center gap-3">

			<!-- 거래처 select -->
			<select
				bind:value={statusClientFilter}
				class="select select-bordered select-sm"
			>
				<option value="all">전체 거래처</option>
				{#each clients as client (client.id)}
					<option value={client.id}>{client.name}</option>
				{/each}
			</select>

			<!-- 카테고리 버튼 -->
			<div class="flex gap-1">
				{#each categoryButtons as btn (btn.key)}
					<button
						class="btn btn-sm
							{statusCategoryFilter === btn.key ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (statusCategoryFilter = btn.key)}
					>
						{btn.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- 테이블 카드 -->
		<div class="card bg-base-100 shadow-sm overflow-hidden">
			{#if filteredStatusItems.length === 0}
				<div class="card-body items-center py-12">
					<p class="text-base-content/40 text-sm">조건에 맞는 품목이 없습니다.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-zebra w-full text-sm">
						<thead>
							<tr class="bg-base-200 text-base-content/50 text-xs uppercase tracking-wide">
								<th>거래처</th>
								<th>카테고리</th>
								<th>품목명</th>
								<th class="text-right">세탁완료</th>
								<th class="text-right">재고</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredStatusItems as item, idx (item.id)}
								<!-- 품목 행 -->
								<tr class="transition-colors {item.counts.completed === 0 ? 'opacity-50' : ''}">
									<td class="font-medium">
										{clients.find(c => c.id === item.clientId)?.name ?? '—'}
									</td>
									<td>
										{#if item.category === 'towel'}
											<span class="badge badge-info badge-sm font-semibold">
												{CATEGORY_LABELS[item.category]}
											</span>
										{:else if item.category === 'sheet'}
											<span class="badge badge-secondary badge-sm font-semibold">
												{CATEGORY_LABELS[item.category]}
											</span>
										{:else if item.category === 'uniform'}
											<span class="badge badge-warning badge-sm font-semibold">
												{CATEGORY_LABELS[item.category]}
											</span>
										{:else}
											<span class="badge badge-ghost badge-sm font-semibold">
												{CATEGORY_LABELS[item.category]}
											</span>
										{/if}
									</td>
									<td>{item.name}</td>
									<td class="text-right font-bold {item.counts.completed > 0 ? 'text-primary' : 'text-base-content/30'}">
										{item.counts.completed.toLocaleString()}
									</td>
									<td class="text-right text-base-content/70">
										{item.counts.stock.toLocaleString()}
									</td>
								</tr>

								<!-- 소계 행 (거래처가 바뀔 때) -->
								{#if isLastOfClient(idx)}
									{@const sub = clientSubtotals.get(item.clientId)}
									<tr class="bg-base-200 border-t border-base-300">
										<td colspan="3" class="text-right text-xs font-bold text-base-content/50">
											{clients.find(c => c.id === item.clientId)?.name ?? '—'} 소계
										</td>
										<td class="text-right text-xs font-bold text-primary">
											{(sub?.completed ?? 0).toLocaleString()}
										</td>
										<td class="text-right text-xs font-bold text-base-content/60">
											{(sub?.stock ?? 0).toLocaleString()}
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ══════════════════════════════════════════════════════ -->
	<!-- 탭 2: 출고 이력                                        -->
	<!-- ══════════════════════════════════════════════════════ -->
	{#if activeTab === 'history'}

		<!-- 필터 -->
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body py-4">
				<div class="flex flex-wrap items-end gap-3">
					<div class="flex flex-col gap-1">
						<label for="history-from" class="label label-text text-xs font-semibold">시작일</label>
						<input
							id="history-from"
							type="date"
							bind:value={fromDate}
							class="input input-bordered input-sm"
						/>
					</div>
					<span class="mb-1 text-base-content/40 text-lg font-light">~</span>
					<div class="flex flex-col gap-1">
						<label for="history-to" class="label label-text text-xs font-semibold">종료일</label>
						<input
							id="history-to"
							type="date"
							bind:value={toDate}
							class="input input-bordered input-sm"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="history-client" class="label label-text text-xs font-semibold">거래처</label>
						<select
							id="history-client"
							bind:value={historyClientFilter}
							class="select select-bordered select-sm"
						>
							<option value="all">전체 거래처</option>
							{#each clients as client (client.id)}
								<option value={client.id}>{client.name}</option>
							{/each}
						</select>
					</div>
					<button
						class="btn btn-primary btn-sm mb-0.5"
						onclick={doQuery}
					>
						조회
					</button>
				</div>
			</div>
		</div>

		<!-- 요약 통계 카드 3개 -->
		<div class="stats stats-horizontal shadow-sm bg-base-100 w-full">
			<div class="stat">
				<div class="stat-title">총 출고 건수</div>
				<div class="stat-value text-base-content">{summaryTotalCount}</div>
			</div>
			<div class="stat">
				<div class="stat-title">총 수량</div>
				<div class="stat-value text-primary">{summaryTotalQty.toLocaleString()}</div>
			</div>
			<div class="stat">
				<div class="stat-title">관련 거래처 수</div>
				<div class="stat-value text-base-content">{summaryClientCount}</div>
			</div>
		</div>

		<!-- 결과 테이블 카드 -->
		<div class="card bg-base-100 shadow-sm overflow-hidden">
			{#if queryResults.length === 0}
				<div class="card-body items-center py-14">
					<p class="text-base-content/40 text-sm">해당 기간 출고 이력이 없습니다.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table w-full text-sm">
						<thead>
							<tr class="bg-base-200 text-base-content/50 text-xs uppercase tracking-wide">
								<th>출고일시</th>
								<th>거래처</th>
								<th>품목 내역</th>
								<th class="text-right">총 수량</th>
								<th>메모</th>
							</tr>
						</thead>
						<tbody>
							{#each queryResults as ship (ship.id)}
								<!-- 메인 행 -->
								<tr
									class="cursor-pointer hover transition-colors
										{expandedShipmentIds.has(ship.id) ? 'bg-primary/10' : ''}"
									onclick={() => toggleExpand(ship.id)}
								>
									<td class="whitespace-nowrap text-base-content/70">
										{formatDateTime(ship.shippedAt)}
									</td>
									<td class="font-medium whitespace-nowrap">
										{clients.find(c => c.id === ship.clientId)?.name ?? '—'}
									</td>
									<td class="max-w-xs text-base-content/70">
										<span class="block overflow-hidden text-ellipsis whitespace-nowrap">
											{shipmentSummary(ship)}
										</span>
									</td>
									<td class="text-right font-bold">
										{shipmentTotalQty(ship).toLocaleString()}
									</td>
									<td class="max-w-[140px] text-base-content/50">
										<span class="block overflow-hidden text-ellipsis whitespace-nowrap text-xs">
											{ship.memo ?? '—'}
										</span>
									</td>
								</tr>

								<!-- 상세 펼침 행 -->
								{#if expandedShipmentIds.has(ship.id)}
									<tr class="bg-primary/5">
										<td colspan="5" class="px-8 py-4">
											<div class="rounded-xl border border-primary/20 bg-base-100 p-4">
												<p class="mb-3 text-xs font-bold uppercase tracking-wide text-primary">
													출고 상세 내역
												</p>
												<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
													{#each ship.items as item (item.laundryItemId)}
														<div class="flex items-center justify-between rounded-lg border border-base-200 bg-base-200/50 px-3 py-2">
															<div class="flex items-center gap-2">
																{#if item.category === 'towel'}
																	<span class="badge badge-info badge-xs font-semibold">
																		{CATEGORY_LABELS[item.category]}
																	</span>
																{:else if item.category === 'sheet'}
																	<span class="badge badge-secondary badge-xs font-semibold">
																		{CATEGORY_LABELS[item.category]}
																	</span>
																{:else if item.category === 'uniform'}
																	<span class="badge badge-warning badge-xs font-semibold">
																		{CATEGORY_LABELS[item.category]}
																	</span>
																{:else}
																	<span class="badge badge-ghost badge-xs font-semibold">
																		{CATEGORY_LABELS[item.category]}
																	</span>
																{/if}
																<span class="text-sm">{item.itemName}</span>
															</div>
															<span class="ml-2 font-bold text-primary">{item.quantity.toLocaleString()}개</span>
														</div>
													{/each}
												</div>
												{#if ship.memo}
													<p class="mt-3 text-xs text-base-content/50">
														<span class="font-semibold">메모:</span> {ship.memo}
													</p>
												{/if}
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}

</div>
