import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// 서버 싱글턴 — 매 요청마다 새 인스턴스 생성 방지
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	auth: { autoRefreshToken: false, persistSession: false },
});

export const load: PageServerLoad = async () => {
	const { data: shipouts } = await supabase
		.from('shipouts')
		.select('id, created_at, clients(id, name)')
		.is('deleted_at', null)
		.order('created_at', { ascending: false })
		.limit(50);

	return { shipouts: shipouts ?? [] };
};
