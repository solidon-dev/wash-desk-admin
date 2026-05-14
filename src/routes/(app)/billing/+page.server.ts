import type { PageServerLoad } from './$types';

// ── 타입 ──────────────────────────────────────────────────────────────────
export interface ShipoutLog {
	shipout_id: string;
	processed_at: string;
	item_id: string;
	item_name_ko: string;
	category_id: string;
	category_name: string;
	quantity: number;
	unit_price: number;
}

// ── 권한 헬퍼 ─────────────────────────────────────────────────────────────
function getFactoryId(locals: App.Locals): string | null {
	return (locals.session?.factory_id ?? null) as string | null;
}

// ── load ──────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
	const myRole      = locals.session?.role;
	const myFactoryId = getFactoryId(locals);

	// ── 1. 거래처 목록 조회 ───────────────────────────────────────────────
	let clientsQuery = locals.supabase
		.from('clients')
		.select('id, name')
		.is('deleted_at', null)
		.order('name', { ascending: true });

	// factory_admin / worker 모두 자기 공장 소속만
	if (myRole !== 'super_admin' && myFactoryId) {
		clientsQuery = clientsQuery.eq('factory_id', myFactoryId);
	}

	const { data: clients, error: clientsError } = await clientsQuery;
	if (clientsError) {
		return {
			clients: [] as { id: string; name: string }[],
			selectedClientId: null,
			shipoutLogs: [] as ShipoutLog[],
			categories: [] as { id: string; name: string; sort_order: number }[],
		};
	}

	const clientList = clients ?? [];

	// ── 2. selectedClientId 결정 ──────────────────────────────────────────
	const paramClientId  = url.searchParams.get('clientId');
	const selectedClientId =
		(paramClientId && clientList.some((c) => c.id === paramClientId))
			? paramClientId
			: (clientList[0]?.id ?? null);

	if (!selectedClientId) {
		return {
			clients: clientList,
			selectedClientId: null,
			shipoutLogs: [] as ShipoutLog[],
			categories: [] as { id: string; name: string; sort_order: number }[],
		};
	}

	// ── 3. categories 조회 ────────────────────────────────────────────────
	const { data: categories } = await locals.supabase
		.from('categories')
		.select('id, name, sort_order')
		.eq('client_id', selectedClientId)
		.order('sort_order', { ascending: true });

	const categoryList = categories ?? [];

	// category_id → category_name 매핑
	const categoryMap = new Map<string, string>(
		categoryList.map((c) => [c.id, c.name])
	);

	// ── 4. inventory_logs 조회 (out, 삭제되지 않은 shipout 소속) ──────────
	const { data: rawLogs } = await locals.supabase
		.from('inventory_logs')
		.select(`
			id,
			shipout_id,
			processed_at,
			item_id,
			quantity,
			items!inner ( name_ko, category_id )
		`)
		.eq('client_id', selectedClientId)
		.eq('log_type', 'out')
		.not('shipout_id', 'is', null)
		.order('processed_at', { ascending: false });

	// shipout_id가 존재하는 로그만 추려서, 유효한(삭제 안 된) shipout 목록과 교차
	// → shipouts 테이블에서 deleted_at IS NULL인 id 목록을 가져와 필터
	const allShipoutIds = [
		...new Set(
			(rawLogs ?? [])
				.map((l) => l.shipout_id)
				.filter((id): id is string => !!id)
		),
	];

	let validShipoutIds = new Set<string>();
	if (allShipoutIds.length > 0) {
		const { data: validShipouts } = await locals.supabase
			.from('shipouts')
			.select('id')
			.in('id', allShipoutIds)
			.is('deleted_at', null);
		validShipoutIds = new Set((validShipouts ?? []).map((s) => s.id));
	}

	const filteredLogs = (rawLogs ?? []).filter(
		(l) => l.shipout_id && validShipoutIds.has(l.shipout_id)
	);

	// ── 5. 단가 계산: item_prices 조인으로 일괄 처리 ─────────────────────
	// 각 log의 (item_id, processed_at의 date) 조합에 대한 단가를 구해야 함.
	// 로그가 최대 200건 이하라 가정하고, get_unit_price RPC를 Promise.all로 병렬 호출
	type LogWithItem = typeof filteredLogs[number];

	const unitPriceResults = await Promise.all(
		filteredLogs.map(async (log: LogWithItem) => {
			const processedDate = log.processed_at
				? log.processed_at.slice(0, 10) // 'YYYY-MM-DD'
				: new Date().toISOString().slice(0, 10);

			try {
				const { data, error } = await locals.supabase.rpc('get_unit_price', {
					p_item_id: log.item_id,
					p_date:    processedDate,
				});
				if (error || data === null || data === undefined) return 0;
				return data as number;
			} catch {
				return 0;
			}
		})
	);

	// ── 6. shipoutLogs 조립 ───────────────────────────────────────────────
	const shipoutLogs: ShipoutLog[] = filteredLogs.map((log: LogWithItem, idx: number) => {
		const itemData = Array.isArray(log.items) ? log.items[0] : log.items;
		const categoryId   = (itemData as { name_ko: string; category_id: string } | null)?.category_id ?? '';
		const itemNameKo   = (itemData as { name_ko: string; category_id: string } | null)?.name_ko    ?? '';

		return {
			shipout_id:    log.shipout_id ?? '',
			processed_at:  log.processed_at ?? '',
			item_id:       log.item_id,
			item_name_ko:  itemNameKo,
			category_id:   categoryId,
			category_name: categoryMap.get(categoryId) ?? '',
			quantity:      log.quantity ?? 0,
			unit_price:    unitPriceResults[idx] ?? 0,
		};
	});

	return {
		clients:          clientList,
		selectedClientId,
		shipoutLogs,
		categories:       categoryList,
	};
};
