import { supabase } from '$lib/supabase/client';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface StatsShipoutItem {
	item_id:       string;
	item_name:     string;
	category_id:   string;
	category_name: string;
	quantity:      number;
	unit_price:    number;
}

export interface StatsShipout {
	id:          string;
	client_id:   string;
	client_name: string;
	created_at:  string;
	items:       StatsShipoutItem[];
}

export interface StatsData {
	shipouts: StatsShipout[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * 통계 페이지용 출고 데이터 조회
 * @param from 'YYYY-MM-DD'
 * @param to   'YYYY-MM-DD'
 * @param clientId 거래처 UUID (생략 시 전체)
 */
export async function getStatsData(
	from: string,
	to: string,
	clientId?: string,
): Promise<StatsData> {
	const { data, error } = await (supabase.rpc as unknown as (
		fn: string,
		args: Record<string, unknown>,
	) => ReturnType<typeof supabase.rpc>)('get_stats_data', {
		p_from:      from,
		p_to:        to,
		p_client_id: clientId ?? null,
	});

	if (error) throw error;
	return (data as unknown as StatsData) ?? { shipouts: [] };
}
