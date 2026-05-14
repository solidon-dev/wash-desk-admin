import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const ALLOWED_ROLES = ['super_admin', 'factory_admin'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		redirect(302, '/');
	}

	const role = locals.session.role;
	if (!role || !ALLOWED_ROLES.includes(role)) {
		await locals.supabase.auth.signOut();
		redirect(302, '/?error=unauthorized');
	}

	// factory_admin은 /factories 접근 불가
	if (role === 'factory_admin' && url.pathname.startsWith('/factories')) {
		redirect(302, '/clients');
	}

	const { data: factories } = await locals.supabase
		.from('factories')
		.select('id, name')
		.is('deleted_at', null)
		.order('created_at', { ascending: true });

	// 메모 건수 (최근 30일)
	const { count: memoCount } = await locals.supabase
		.from('shipout_memos')
		.select('id', { count: 'exact', head: true })
		.eq('is_read', false);

	return {
		user: locals.session.user,
		role,
		factory_id: locals.session.factory_id ?? null,
		factories: factories ?? [],
		memoCount: memoCount ?? 0,
	};
};
