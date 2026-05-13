import { supabase } from '$lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

// 현재 세션/유저 상태
export let session = $state<Session | null>(null);
export let user = $state<User | null>(null);
export let authReady = $state(false);

// 앱 시작 시 한번 호출 — 세션 로드 + 변경 구독
export function initAuth() {
	supabase.auth.getSession().then(({ data }) => {
		session = data.session;
		user = data.session?.user ?? null;
		authReady = true;
	});

	supabase.auth.onAuthStateChange((_event, s) => {
		session = s;
		user = s?.user ?? null;
		authReady = true;
	});
}

// 로그인 — username만 받아서 @mail.com 붙임
export async function login(username: string, password: string) {
	const email = `${username}@mail.com`;
	const { error } = await supabase.auth.signInWithPassword({ email, password });
	return error;
}

// 로그아웃
export async function logout() {
	await supabase.auth.signOut();
}
