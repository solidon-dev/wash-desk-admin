import type { LayoutServerLoad } from './$types';
import type { StatsShipout } from '$lib/api/stats';

export const load: LayoutServerLoad = async ({ locals }) => {
	const myRole = locals.session?.role;
	const myFactoryId = (locals.session?.factory_id ?? null) as string | null;

	// 거래처 목록
	let clientQuery = locals.supabase
		.from('clients')
		.select('id, name')
		.is('deleted_at', null)
		.order('name', { ascending: true });

	if (myRole === 'factory_admin' && myFactoryId) {
		clientQuery = clientQuery.eq('factory_id', myFactoryId);
	}

	// 날짜 계산
	const now = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	const dataFrom = '2025-01-01';

	type RpcResult = { shipouts: StatsShipout[] };

	// factory_admin 소속 거래처 ID 필터
	let clientIds: string[] | null = null;
	if (myRole === 'factory_admin' && myFactoryId) {
		const { data: factoryClients } = await locals.supabase
			.from('clients')
			.select('id')
			.eq('factory_id', myFactoryId)
			.is('deleted_at', null);
		clientIds = (factoryClients ?? []).map((c) => c.id);
	}

	// 거래처 목록 + shipout 데이터 병렬 로드
	const [{ data: clients }, { data: rpcData }] = await Promise.all([
		clientQuery,
		(
			locals.supabase.rpc as unknown as (
				fn: string,
				args: Record<string, unknown>
			) => Promise<{ data: RpcResult | null; error: unknown }>
		)('get_stats_data', { p_from: dataFrom, p_to: today, p_client_id: null })
	]);

	let shipouts = (rpcData?.shipouts ?? []) as StatsShipout[];
	if (clientIds !== null) {
		const idSet = new Set(clientIds);
		shipouts = shipouts.filter((s) => idSet.has(s.client_id));
	}

	return {
		clients: clients ?? [],
		shipouts,
		today
	};
};
