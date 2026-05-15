import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PRIVATE_SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 10;

function getAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const myRole      = locals.session?.role;
	const myFactoryId = locals.session?.factory_id as string | null;

	const page        = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const showDeleted = url.searchParams.get('hidden') === '1';
	const q           = url.searchParams.get('q')?.trim() ?? '';

	const admin = getAdminClient();

	// 쿼리 기본 조건
	let query = locals.supabase
		.from('profiles')
		.select('id, full_name, phone, role, factory_id, created_at, deleted_at, factories(id, name)', { count: 'exact' })
		.neq('role', 'super_admin')
		.order('created_at', { ascending: true })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	if (!showDeleted) query = query.is('deleted_at', null);
	if (q)            query = query.ilike('full_name', `%${q}%`);
	if (myRole === 'factory_admin' && myFactoryId)
		query = query.eq('factory_id', myFactoryId);

	const [{ data: profiles, count, error }, { data: authList }, { data: allFactories }] =
		await Promise.all([
			query,
			admin.auth.admin.listUsers({ perPage: 1000 }),
			locals.supabase.from('factories').select('id, name').order('name'),
		]);

	if (error) return { users: [], total: 0, page, PAGE_SIZE, showDeleted, q, allFactories: [] };

	const emailMap = new Map(authList?.users.map(u => [u.id, u.email ?? '']) ?? []);

	return {
		users: (profiles ?? []).map(u => ({
			...u,
			username: (emailMap.get(u.id) ?? '').replace('@mail.com', ''),
			factory_name: (u.factories as { name: string } | null)?.name ?? null,
		})),
		total: count ?? 0,
		page,
		PAGE_SIZE,
		showDeleted,
		q,
		allFactories: allFactories ?? [],
	};
};

export const actions: Actions = {
	// ── 유저 생성
	// super_admin: 모든 공장, 모든 역할 등록 가능
	// factory_admin: 자기 공장 worker만 등록 가능
	create: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form       = await request.formData();
		const full_name  = (form.get('full_name')  as string)?.trim();
		const username   = (form.get('username')   as string)?.trim();
		const password   = (form.get('password')   as string)?.trim();
		const role       = form.get('role')        as string;
		const factory_id = (form.get('factory_id') as string) || null;
		const phone      = (form.get('phone')      as string)?.trim().replace(/-/g, '') || null;

		if (!full_name || !username || !password) return fail(400, { error: '필수 항목을 모두 입력해주세요.' });
		if (!factory_id) return fail(400, { error: '공장을 선택해주세요.' });

		// factory_admin은 자기 공장 worker만
		if (myRole === 'factory_admin') {
			if (factory_id !== myFactoryId) return fail(403, { error: '본인 공장 소속만 등록할 수 있습니다.' });
			if (role !== 'worker') return fail(403, { error: '실무자만 등록할 수 있습니다.' });
		}

		const admin = getAdminClient();
		const { error: authErr } = await admin.auth.admin.createUser({
			email: `${username}@mail.com`,
			password,
			email_confirm: true,
			user_metadata: {
				full_name,
				role: role ?? 'worker',
				factory_id,
				phone,
			},
		});
		if (authErr) {
			const msg = authErr.message.includes('already been registered')
				? '이미 사용 중인 아이디입니다.'
				: authErr.message;
			return fail(400, { error: msg });
		}

		return { success: true };
	},

	// ── 유저 수정
	// super_admin: 모든 유저, 모든 필드 수정 가능
	// factory_admin: 자기 공장 소속 유저(본인 포함) 이름/연락처/비밀번호만, 역할·공장 변경 불가
	update: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || !locals.session?.user?.id || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form       = await request.formData();
		const targetId   = form.get('id')         as string;
		const full_name  = (form.get('full_name')  as string)?.trim();
		const phone      = (form.get('phone')      as string)?.trim().replace(/-/g, '') || null;
		const role       = form.get('role')        as string | null;
		const factory_id = (form.get('factory_id') as string) || null;

		if (!targetId || !full_name) return fail(400, { error: '필수 항목 누락' });

		if (myRole === 'factory_admin') {
			const { data: target } = await locals.supabase
				.from('profiles')
				.select('factory_id')
				.eq('id', targetId)
				.single();

			if (!target || target.factory_id !== myFactoryId) {
				return fail(403, { error: '본인 공장 소속 사용자만 수정할 수 있습니다.' });
			}

			const { error } = await locals.supabase
				.from('profiles')
				.update({ full_name, phone })
				.eq('id', targetId);

			if (error) return fail(500, { error: error.message });
			return { success: true };
		}

		// super_admin: 모든 필드
		if (!factory_id) return fail(400, { error: '공장을 선택해주세요.' });

		const { error } = await locals.supabase
			.from('profiles')
			.update({ full_name, phone, role: role as 'factory_admin' | 'worker', factory_id })
			.eq('id', targetId);

		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 비밀번호 변경
	// super_admin: 누구든
	// factory_admin: 자기 공장 소속만
	setPassword: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = locals.session?.factory_id as string | null;

		if (!myRole || myRole === 'worker') return fail(403, { error: '권한이 없습니다.' });

		const form     = await request.formData();
		const targetId = form.get('id')        as string;
		const password = (form.get('password') as string)?.trim();

		if (!targetId || !password) return fail(400, { error: '필수 항목 누락' });

		if (myRole === 'factory_admin') {
			const { data: target } = await locals.supabase
				.from('profiles')
				.select('factory_id')
				.eq('id', targetId)
				.single();

			if (!target || target.factory_id !== myFactoryId) {
				return fail(403, { error: '본인 공장 소속 사용자의 비밀번호만 변경할 수 있습니다.' });
			}
		}

		const admin = getAdminClient();
		const { error } = await admin.auth.admin.updateUserById(targetId, { password });
		if (error) return fail(500, { error: error.message });

		return { success: true };
	},

	// ── 비활성화 — super_admin 전용
	deactivate: async ({ request, locals }) => {
		if (locals.session?.role !== 'super_admin') return fail(403, { error: '권한이 없습니다.' });

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const admin = getAdminClient();
		const { error: banErr } = await admin.auth.admin.updateUserById(id, { ban_duration: '876600h' });
		if (banErr) return fail(500, { error: banErr.message });

		await locals.supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
		return { success: true };
	},

	// ── 활성화 — super_admin 전용
	activate: async ({ request, locals }) => {
		if (locals.session?.role !== 'super_admin') return fail(403, { error: '권한이 없습니다.' });

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const admin = getAdminClient();
		const { error: banErr } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
		if (banErr) return fail(500, { error: banErr.message });

		await locals.supabase.from('profiles').update({ deleted_at: null }).eq('id', id);
		return { success: true };
	},
};
