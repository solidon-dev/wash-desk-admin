import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const ALLOWED_ROLES = ['super_admin', 'factory_admin'];

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		redirect(302, '/');
	}

	const role = locals.session.role;
	if (!role || !ALLOWED_ROLES.includes(role)) {
		// 권한 없는 유저 (worker 등) — 로그아웃 후 로그인 페이지로
		await locals.supabase.auth.signOut();
		redirect(302, '/?error=unauthorized');
	}

	return {
		user: locals.session.user,
		role
	};
};
