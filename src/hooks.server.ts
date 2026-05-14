import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event.cookies);
	event.locals.supabase = supabase;

	// getUser()로 Auth 서버 검증 (보안) + app_metadata에서 role/factory_id 읽기 (DB 조회 없음)
	const { data: { user } } = await supabase.auth.getUser();

	if (user) {
		const meta = user.app_metadata as Record<string, unknown>;

		event.locals.session = {
			user,
			role: (meta?.role as string) ?? null,
			factory_id: (meta?.factory_id as string) ?? null,
		};
	} else {
		event.locals.session = null;
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
