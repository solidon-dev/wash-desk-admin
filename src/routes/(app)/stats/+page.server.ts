import type { PageServerLoad } from './$types';
import type { StatsShipout } from '$lib/api/stats';

const DATA_FROM = '2025-01-01';

export const load: PageServerLoad = async ({ locals }) => {
	const now   = new Date();
	const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

	type RpcResult = { shipouts: StatsShipout[] };

	const { data } = await (locals.supabase.rpc as unknown as (
		fn: string,
		args: Record<string, unknown>,
	) => Promise<{ data: RpcResult | null; error: unknown }>)(
		'get_stats_data',
		{ p_from: DATA_FROM, p_to: today, p_client_id: null },
	);

	return {
		shipouts: (data?.shipouts ?? []) as StatsShipout[],
		today,
	};
};
