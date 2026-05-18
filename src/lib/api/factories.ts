import { supabase } from '$lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '$lib/supabase/types';

export type Factory = Tables<'factories'>;

// 전체 공장 목록 (soft delete 포함)
export async function getFactories(): Promise<Factory[]> {
	const { data, error } = await supabase
		.from('factories')
		.select('*')
		.order('created_at', { ascending: true });

	if (error) throw error;
	return data ?? [];
}

// 공장 등록
export async function createFactory(
	payload: Pick<TablesInsert<'factories'>, 'name' | 'address' | 'phone'>
) {
	const { data, error } = await supabase.from('factories').insert(payload).select().single();

	if (error) throw error;
	return data;
}

// 공장 수정
export async function updateFactory(
	id: string,
	payload: Pick<TablesUpdate<'factories'>, 'name' | 'address' | 'phone'>
) {
	const { data, error } = await supabase
		.from('factories')
		.update(payload)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

// 공장 숨기기 (soft delete)
export async function hideFactory(id: string) {
	const { error } = await supabase
		.from('factories')
		.update({ deleted_at: new Date().toISOString() })
		.eq('id', id);

	if (error) throw error;
}

// 공장 복원 (soft delete 취소)
export async function restoreFactory(id: string) {
	const { error } = await supabase.from('factories').update({ deleted_at: null }).eq('id', id);

	if (error) throw error;
}
