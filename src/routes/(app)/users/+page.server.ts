import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';

function getAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export const load: PageServerLoad = async ({ locals }) => {
	const { data: users, error } = await locals.supabase
		.from('profiles')
		.select('id, full_name, phone, role, factory_id, created_at, deleted_at, factories(id, name)')
		.order('created_at', { ascending: true });

	if (error) return { users: [] };

	const admin = getAdminClient();
	const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
	const emailMap = new Map(authList?.users.map(u => [u.id, u.email ?? '']) ?? []);

	return {
		users: (users ?? []).map(u => ({
			...u,
			username: (emailMap.get(u.id) ?? '').replace('@mail.com', ''),
			factory_name: (u.factories as { name: string } | null)?.name ?? null,
		})),
	};
};

export const actions: Actions = {
	// ── 유저 생성 (Admin API 필요) ─────────────────────────────
	create: async ({ request, locals }) => {
		if (locals.session?.role !== 'super_admin') {
			return fail(403, { error: '권한이 없습니다.' });
		}

		const form = await request.formData();
		const full_name  = (form.get('full_name')  as string)?.trim();
		const username   = (form.get('username')   as string)?.trim();
		const password   = (form.get('password')   as string)?.trim();
		const role       = form.get('role')        as string;
		const factory_id = (form.get('factory_id') as string) || null;
		const phone      = (form.get('phone')      as string)?.trim() || null;

		if (!full_name || !username || !password || !role) {
			return fail(400, { error: '필수 항목을 모두 입력해주세요.' });
		}
		if (!factory_id) {
			return fail(400, { error: '공장을 선택해주세요.' });
		}

		const admin = getAdminClient();

		const { data: created, error: authErr } = await admin.auth.admin.createUser({
			email: `${username}@mail.com`,
			password,
			email_confirm: true,
			user_metadata: { full_name },
		});
		if (authErr) {
			const msg = authErr.message.includes('already been registered')
				? '이미 사용 중인 아이디입니다.'
				: authErr.message;
			return fail(400, { error: msg });
		}

		// trigger 가 worker role로 profiles row 생성 → role/factory_id/phone 업데이트
		const { error: profileErr } = await locals.supabase
			.from('profiles')
			.update({ role: role as 'factory_admin' | 'worker', factory_id, phone })
			.eq('id', created.user.id);

		if (profileErr) {
			await admin.auth.admin.deleteUser(created.user.id);
			return fail(500, { error: '프로필 저장 실패: ' + profileErr.message });
		}

		return { success: true };
	},

	// ── 비밀번호 변경 (Admin API 필요) ────────────────────────
	setPassword: async ({ request, locals }) => {
		if (locals.session?.role !== 'super_admin') {
			return fail(403, { error: '권한이 없습니다.' });
		}

		const form = await request.formData();
		const id       = form.get('id')       as string;
		const password = (form.get('password') as string)?.trim();

		if (!id || !password) return fail(400, { error: '필수 항목 누락' });

		const admin = getAdminClient();
		const { error } = await admin.auth.admin.updateUserById(id, { password });
		if (error) return fail(500, { error: error.message });

		return { success: true };
	},

	// ── 비활성화 (ban + deleted_at) ───────────────────────────
	deactivate: async ({ request, locals }) => {
		if (locals.session?.role !== 'super_admin') {
			return fail(403, { error: '권한이 없습니다.' });
		}

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const admin = getAdminClient();
		const { error: banErr } = await admin.auth.admin.updateUserById(id, { ban_duration: '876600h' });
		if (banErr) return fail(500, { error: banErr.message });

		await locals.supabase
			.from('profiles')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', id);

		return { success: true };
	},

	// ── 활성화 (ban 해제 + deleted_at null) ──────────────────
	activate: async ({ request, locals }) => {
		if (locals.session?.role !== 'super_admin') {
			return fail(403, { error: '권한이 없습니다.' });
		}

		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const admin = getAdminClient();
		const { error: banErr } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
		if (banErr) return fail(500, { error: banErr.message });

		await locals.supabase
			.from('profiles')
			.update({ deleted_at: null })
			.eq('id', id);

		return { success: true };
	},
};
