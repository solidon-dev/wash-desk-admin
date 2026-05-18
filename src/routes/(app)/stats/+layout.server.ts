import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const myRole = locals.session?.role;
	const myFactoryId = (locals.session?.factory_id ?? null) as string | null;

	let query = locals.supabase
		.from('clients')
		.select('id, name')
		.is('deleted_at', null)
		.order('name', { ascending: true });

	if (myRole === 'factory_admin' && myFactoryId) {
		query = query.eq('factory_id', myFactoryId);
	}

	const { data: clients } = await query;
	return { clients: clients ?? [] };
};
