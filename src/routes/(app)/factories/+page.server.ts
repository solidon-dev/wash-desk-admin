import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ locals, url }) => {
	const page       = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const showHidden = url.searchParams.get('hidden') === '1';
	const q          = url.searchParams.get('q')?.trim() ?? '';

	let query = locals.supabase
		.from('factories')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: true })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	if (!showHidden) query = query.is('deleted_at', null);
	if (q)           query = query.ilike('name', `%${q}%`);

	const { data: factories, count, error } = await query;
	if (error) return { factories: [], total: 0, page, PAGE_SIZE, showHidden, q };

	return { factories: factories ?? [], total: count ?? 0, page, PAGE_SIZE, showHidden, q };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const fd = await request.formData();
		const name    = (fd.get('name')    as string)?.trim();
		const address = (fd.get('address') as string)?.trim() || null;
		const phone   = (fd.get('phone')   as string)?.trim() || null;
		if (!name) return fail(400, { error: '공장명을 입력해주세요.' });
		const { error } = await locals.supabase.from('factories').insert({ name, address, phone });
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const fd = await request.formData();
		const id      = fd.get('id')      as string;
		const name    = (fd.get('name')    as string)?.trim();
		const address = (fd.get('address') as string)?.trim() || null;
		const phone   = (fd.get('phone')   as string)?.trim() || null;
		if (!id || !name) return fail(400, { error: '필수 항목 누락' });
		const { error } = await locals.supabase.from('factories').update({ name, address, phone }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	hide: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });
		const { error } = await locals.supabase.from('factories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	restore: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });
		const { error } = await locals.supabase.from('factories').update({ deleted_at: null }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},
};
