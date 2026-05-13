import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event.cookies);

	const { data: { session } } = await supabase.auth.getSession();
	event.locals.session = session;
	event.locals.supabase = supabase;

	return resolve(event);
};
