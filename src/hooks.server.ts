import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event.cookies);
	event.locals.supabase = supabase;

	// getUser()를 써야 서버에서 실제 JWT 검증을 한다 (getSession은 캐시만 봄)
	const { data: { user } } = await supabase.auth.getUser();

	if (user) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('role, factory_id')
			.eq('id', user.id)
			.single();

		event.locals.session = {
			user,
			role: profile?.role ?? null,
			factory_id: profile?.factory_id ?? null,
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
