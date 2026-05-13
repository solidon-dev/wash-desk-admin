import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// 이미 로그인된 경우 리다이렉트
	if (locals.session) redirect(302, '/clients');
	return {};
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const form = await request.formData();
		const username = (form.get('username') as string)?.trim();
		const password = form.get('password') as string;

		if (!username || !password) {
			return fail(400, { error: '아이디와 비밀번호를 입력해주세요.' });
		}

		const email = `${username}@mail.com`;
		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
		}

		redirect(302, '/clients');
	}
};
