import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ locals, url }) => {
	const page       = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const showHidden = url.searchParams.get('hidden') === '1';
	const q          = url.searchParams.get('q')?.trim() ?? '';

	let query = locals.supabase
		.from('clients')
		.select('id, factory_id, name, business_number, email, manager_name, manager_phone, contract_start_date, contract_end_date, created_at, deleted_at', { count: 'exact' })
		.order('created_at', { ascending: false })
		.order('id', { ascending: true })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	if (!showHidden) query = query.is('deleted_at', null);
	if (q)           query = query.ilike('name', `%${q}%`);

	const { data: clients, count, error } = await query;
	if (error) return { clients: [], total: 0, page, PAGE_SIZE, showHidden, q, allClients: [] };

	const { data: allClientsData } = await locals.supabase
		.from('clients')
		.select('id, name, business_number, deleted_at')
		.order('name');

	return { clients: clients ?? [], total: count ?? 0, page, PAGE_SIZE, showHidden, q, allClients: allClientsData ?? [] };
};

export const actions: Actions = {
	// ── 거래처 등록
	create: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form               = await request.formData();
		const name               = (form.get('name')               as string)?.trim();
		const business_number    = (form.get('business_number')    as string)?.trim() || null;
		const email              = (form.get('email')              as string)?.trim() || null;
		const manager_name       = (form.get('manager_name')       as string)?.trim() || null;
		const manager_phone      = (form.get('manager_phone')      as string)?.trim().replace(/-/g, '') || null;
		const contract_start_date = (form.get('contract_start_date') as string) || null;
		const contract_end_date   = (form.get('contract_end_date')   as string) || null;
		const factory_id         = myRole === 'factory_admin'
			? myFactoryId
			: ((form.get('factory_id') as string) || null);

		if (!name)       return fail(400, { error: '거래처명을 입력해주세요.' });
		if (!factory_id) return fail(400, { error: '공장을 선택해주세요.' });

		const { error } = await locals.supabase
			.from('clients')
			.insert({ name, business_number, email, manager_name, manager_phone, contract_start_date, contract_end_date, factory_id });

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 거래처 수정
	update: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form               = await request.formData();
		const id                 = form.get('id')                as string;
		const name               = (form.get('name')               as string)?.trim();
		const business_number    = (form.get('business_number')    as string)?.trim() || null;
		const email              = (form.get('email')              as string)?.trim() || null;
		const manager_name       = (form.get('manager_name')       as string)?.trim() || null;
		const manager_phone      = (form.get('manager_phone')      as string)?.trim().replace(/-/g, '') || null;
		const contract_start_date = (form.get('contract_start_date') as string) || null;
		const contract_end_date   = (form.get('contract_end_date')   as string) || null;
		const factory_id: string | undefined        = myRole === 'super_admin'
			? ((form.get('factory_id') as string) || undefined)
			: (myFactoryId ?? undefined);

		if (!id || !name) return fail(400, { error: '필수 항목 누락' });

		if (myRole === 'factory_admin') {
			const { data: target } = await locals.supabase
				.from('clients')
				.select('factory_id')
				.eq('id', id)
				.single();
			if (!target || target.factory_id !== myFactoryId)
				return fail(403, { error: '본인 공장 소속 거래처만 수정할 수 있습니다.' });
		}

		const { error } = await locals.supabase
			.from('clients')
			.update({ name, business_number, email, manager_name, manager_phone, contract_start_date, contract_end_date, factory_id })
			.eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 비활성화 (soft delete)
	hide: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		if (myRole === 'factory_admin') {
			const { data: target } = await locals.supabase
				.from('clients')
				.select('factory_id')
				.eq('id', id)
				.single();
			if (!target || target.factory_id !== myFactoryId)
				return fail(403, { error: '본인 공장 소속 거래처만 비활성화할 수 있습니다.' });
		}

		const { error } = await locals.supabase
			.from('clients')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 활성화 (복원)
	restore: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		if (myRole === 'factory_admin') {
			const { data: target } = await locals.supabase
				.from('clients')
				.select('factory_id')
				.eq('id', id)
				.single();
			if (!target || target.factory_id !== myFactoryId)
				return fail(403, { error: '본인 공장 소속 거래처만 활성화할 수 있습니다.' });
		}

		const { error } = await locals.supabase
			.from('clients')
			.update({ deleted_at: null })
			.eq('id', id);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},
};
