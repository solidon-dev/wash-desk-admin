import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// 이 페이지는 인증 없이 접근 가능 — anon 클라이언트 사용
function anonClient() {
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

export const load: PageServerLoad = async ({ params }) => {
	const { shipout_id } = params;

	const supabase = anonClient();

	// shipout 정보 조회 (존재 여부 확인 + 거래처명 표시용)
	const { data: shipout, error: shipoutError } = await supabase
		.from('shipouts')
		.select(`
			id,
			created_at,
			clients ( id, name )
		`)
		.eq('id', shipout_id)
		.is('deleted_at', null)
		.single();

	if (shipoutError || !shipout) {
		error(404, '해당 출고 건을 찾을 수 없습니다.');
	}

	// 해당 shipout의 기존 메모 목록
	const { data: memos } = await supabase
		.from('shipout_memos')
		.select('id, title, author_name, created_at')
		.eq('shipout_id', shipout_id)
		.order('created_at', { ascending: false });

	return {
		shipout: {
			id: String(shipout.id),
			created_at: String(shipout.created_at),
			client_name: (shipout.clients as unknown as { name: string } | null)?.name ?? '미확인',
		},
		memos: memos ?? [],
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { shipout_id } = params;
		const fd = await request.formData();
		const title       = (fd.get('title') as string)?.trim();
		const content     = (fd.get('content') as string)?.trim();
		const author_name = (fd.get('author_name') as string)?.trim() || '익명';

		if (!title || !content) {
			return fail(400, { error: '제목과 내용을 입력해주세요.' });
		}

		const supabase = anonClient();

		// shipout 존재 여부 재확인
		const { data: shipout } = await supabase
			.from('shipouts')
			.select('id')
			.eq('id', shipout_id)
			.is('deleted_at', null)
			.single();

		if (!shipout) return fail(404, { error: '해당 출고 건을 찾을 수 없습니다.' });

		const { error: insertError } = await supabase
			.from('shipout_memos')
			.insert({ shipout_id, title, content, author_name });

		if (insertError) return fail(500, { error: '메모 저장에 실패했습니다.' });

		return { success: true };
	},
};
