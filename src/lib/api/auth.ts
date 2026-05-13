import { supabase } from '$lib/supabase/client';

// 세션 조회
export async function getSession() {
	const { data } = await supabase.auth.getSession();
	return data.session;
}

// 세션 변경 구독 (콜러 측에서 $state 업데이트용)
export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
	return supabase.auth.onAuthStateChange(callback);
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
