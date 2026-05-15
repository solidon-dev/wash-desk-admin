import type { PageServerLoad } from './$types';
import type { StatsShipout } from '$lib/api/stats';

const DATA_FROM = '2025-01-01';

export const load: PageServerLoad = async ({ locals }) => {
	const myRole      = locals.session?.role;
	const myFactoryId = (locals.session?.factory_id ?? null) as string | null;

	const now   = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

	type RpcResult = { shipouts: StatsShipout[] };

	// factory_admin 이면 소속 공장의 거래처 ID만 조회
	let clientIds: string[] | null = null;
	if (myRole === 'factory_admin' && myFactoryId) {
		const { data: factoryClients } = await locals.supabase
			.from('clients')
			.select('id')
			.eq('factory_id', myFactoryId)
			.is('deleted_at', null);
		clientIds = (factoryClients ?? []).map((c) => c.id);
	}

	const { data } = await (locals.supabase.rpc as unknown as (
		fn: string,
		args: Record<string, unknown>,
	) => Promise<{ data: RpcResult | null; error: unknown }>)(
		'get_stats_data',
		{ p_from: DATA_FROM, p_to: today, p_client_id: null },
	);

	let shipouts = (data?.shipouts ?? []) as StatsShipout[];

	// factory_admin: 소속 공장 거래처 데이터만 필터링
	if (clientIds !== null) {
		const idSet = new Set(clientIds);
		shipouts = shipouts.filter((s) => idSet.has(s.client_id));
	}

	return {
		shipouts,
		today,
	};
};
