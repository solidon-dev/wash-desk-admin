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
// super_admin / factory_admin 만 허용
export async function login(username: string, password: string): Promise<string | null> {
	const email = `${username}@mail.com`;
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) return error.message;
	if (!data.user) return '로그인 실패';

	// role 확인
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', data.user.id)
		.single();

	const role = profile?.role;
	if (role !== 'super_admin' && role !== 'factory_admin') {
		// 접근 권한 없음 — 바로 로그아웃
		await supabase.auth.signOut();
		return 'ACCESS_DENIED';
	}

	return null;
}

// 로그아웃
export async function logout() {
	await supabase.auth.signOut();
}
