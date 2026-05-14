import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const myFactoryId = locals.session?.factory_id ?? null;
	const myRole      = locals.session?.role;

	// shipout_memos + shipout 정보 조인해서 가져오기
	const { data: memos, error: memosError } = await locals.supabase
		.from('shipout_memos')
		.select(`
			id,
			shipout_id,
			title,
			content,
			author_name,
			created_at,
			shipouts (
				id,
				created_at,
				client_id,
				factory_id,
				clients ( id, name )
			)
		`)
		.order('created_at', { ascending: false })
		.limit(200);

	if (memosError) console.error('memos load error:', memosError);

	// 테스트용: 최근 shipout 목록 (factory 필터)
	let shiloutsQuery = locals.supabase
		.from('shipouts')
		.select(`id, created_at, client_id, clients ( id, name )`)
		.is('deleted_at', null)
		.order('created_at', { ascending: false })
		.limit(50);

	if (myRole !== 'super_admin' && myFactoryId) {
		shiloutsQuery = shiloutsQuery.eq('factory_id', myFactoryId);
	}

	const { data: shipouts } = await shiloutsQuery;

	return {
		memos: memos ?? [],
		shipouts: shipouts ?? [],
	};
};

export const actions: Actions = {
	// 어드민에서 직접 메모 작성 (테스트용)
	addMemo: async ({ request, locals }) => {
		const fd = await request.formData();
		const shipout_id  = fd.get('shipout_id') as string;
		const title       = (fd.get('title') as string)?.trim();
		const content     = (fd.get('content') as string)?.trim();
		const author_name = (fd.get('author_name') as string)?.trim() || '어드민';

		if (!shipout_id || !title || !content) {
			return fail(400, { error: '필수 항목을 모두 입력해주세요.' });
		}

		const { error } = await locals.supabase
			.from('shipout_memos')
			.insert({ shipout_id, title, content, author_name });

		if (error) return fail(500, { error: '메모 저장 실패: ' + error.message });

		return { success: true };
	},

	// 메모 삭제
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
