import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event.cookies);
	event.locals.supabase = supabase;

	// getSession()은 JWT를 로컬에서 검증하므로 DB 왕복 없음
	// role, factory_id는 JWT의 app_metadata 클레임에서 직접 읽음
	const { data: { session } } = await supabase.auth.getSession();

	if (session?.user) {
		const meta = session.user.app_metadata as Record<string, unknown>;

		event.locals.session = {
			user: session.user,
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
