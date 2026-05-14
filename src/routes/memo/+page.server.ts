import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const load: PageServerLoad = async () => {
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

	const { data: shipouts } = await supabase
		.from('shipouts')
		.select('id, created_at, clients(id, name)')
		.is('deleted_at', null)
		.order('created_at', { ascending: false })
		.limit(50);

	return { shipouts: shipouts ?? [] };
};
