import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
	const myRole = locals.session?.role;
	const myFactoryId = (locals.session?.factory_id ?? null) as string | null;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	// factory_admin: 자기 공장 소속 shipout_id 목록을 먼저 구함
	let shipoutIds: string[] | null = null;
	if (myRole === 'factory_admin' && myFactoryId) {
		const { data: shipouts } = await locals.supabase
			.from('shipouts')
			.select('id, clients!inner(factory_id)')
			.eq('clients.factory_id', myFactoryId)
			.is('deleted_at', null);
		shipoutIds = (shipouts ?? []).map((s) => s.id);
	}

	let query = locals.supabase
		.from('shipout_memos')
		.select(
			`
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
		`,
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	if (shipoutIds !== null) {
		query =
			shipoutIds.length > 0
				? query.in('shipout_id', shipoutIds)
				: query.eq('shipout_id', 'no-match'); // 소속 공장 거래처가 없으면 빈 결과
	}

	const { data: memos, error: memosError, count } = await query;
	if (memosError) console.error('memos load error:', memosError);

	return { memos: memos ?? [], total: count ?? 0, page, PAGE_SIZE };
};

export const actions: Actions = {
	markRead: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;
		if (!id) return fail(400, { error: 'id 없음' });
		const { data: updated, error } = await locals.supabase
			.from('shipout_memos')
			.update({ is_read: true })
			.eq('id', id)
			.select('*')
			.single();
		if (error) return fail(500, { error: error.message });
		return { success: true, memo: updated };
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
		const { error } = await locals.supabase.from('shipout_memos').delete().eq('id', id);
		if (error) return fail(500, { error: '삭제 실패: ' + error.message });
		return { success: true };
	}
};
