import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	const { data: memos, error: memosError, count } = await locals.supabase
		.from('shipout_memos')
		.select(`
			id,
			shipout_id,
			title,
			content,
			author_name,
			is_read,
			created_at,
			shipouts (
				id,
				created_at,
				clients ( id, name )
			)
		`, { count: 'exact' })
		.order('created_at', { ascending: false })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	if (memosError) console.error('memos load error:', memosError);

	return { memos: memos ?? [], total: count ?? 0, page, PAGE_SIZE };
};

export const actions: Actions = {
	markRead: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;
		if (!id) return fail(400, { error: 'id 없음' });
		const { error } = await locals.supabase
			.from('shipout_memos')
			.update({ is_read: true })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	markAllRead: async ({ locals }) => {
		const { error } = await locals.supabase
			.from('shipout_memos')
			.update({ is_read: true })
			.eq('is_read', false);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteMemo: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;
		if (!id) return fail(400, { error: 'id 없음' });
		const { error } = await locals.supabase
			.from('shipout_memos')
			.delete()
			.eq('id', id);
		if (error) return fail(500, { error: '삭제 실패: ' + error.message });
		return { success: true };
	},
};
