import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// ── 권한 헬퍼 ─────────────────────────────────────────────────────────────
function getFactoryId(locals: App.Locals): string | null {
	return (locals.session?.factory_id ?? null) as string | null;
}

function guardWorker(role: string | null | undefined) {
	if (!role || role === 'worker') return fail(403, { error: '권한이 없습니다.' });
	return null;
}

function guardFactory(role: string, myFactoryId: string | null | undefined, targetFactoryId: string) {
	if (role === 'factory_admin' && myFactoryId !== targetFactoryId)
		return fail(403, { error: '본인 공장 데이터만 수정할 수 있습니다.' });
	return null;
}

// ── load ──────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
	const myRole      = locals.session?.role;
	const myFactoryId = getFactoryId(locals);

	const selectedClientId = url.searchParams.get('clientId') || null;

	// 거래처 목록 (soft-delete 제외, 이름순)
	let clientsQuery = locals.supabase
		.from('clients')
		.select('id, name, factory_id')
		.is('deleted_at', null)
		.order('name', { ascending: true });

	if (myRole === 'factory_admin' && myFactoryId) {
		clientsQuery = clientsQuery.eq('factory_id', myFactoryId);
	}

	const { data: clients, error: clientsError } = await clientsQuery;
	if (clientsError) return { clients: [], categories: [], items: [], itemPrices: [], selectedClientId: null };

	if (!selectedClientId) {
		return { clients: clients ?? [], categories: [], items: [], itemPrices: [], selectedClientId: null };
	}

	// 선택된 거래처 소속 공장 확인
	const targetClient = (clients ?? []).find(c => c.id === selectedClientId);
	if (!targetClient) {
		// 접근 불가 — 조용히 초기화
		return { clients: clients ?? [], categories: [], items: [], itemPrices: [], selectedClientId: null };
	}

	const targetFactoryId = targetClient.factory_id;

	// categories (sort_order ASC)
	const { data: categories } = await locals.supabase
		.from('categories')
		.select('id, name, sort_order, factory_id')
		.eq('factory_id', targetFactoryId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	// items (sort_order ASC)
	const { data: items } = await locals.supabase
		.from('items')
		.select('id, category_id, factory_id, name_ko, name_en, name_zh, nickname, sort_order')
		.eq('factory_id', targetFactoryId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	// item_prices for this client
	const { data: itemPrices } = await (locals.supabase.from('item_prices') as any)
		.select('id, item_id, unit_price, effective_from')
		.eq('client_id', selectedClientId as string);

	return {
		clients:          clients   ?? [],
		categories:       categories ?? [],
		items:            items      ?? [],
		itemPrices:       (itemPrices ?? []).map((p: Record<string, unknown>) => ({ ...p, client_id: selectedClientId })),
		selectedClientId,
	};
};

// ── actions ───────────────────────────────────────────────────────────────
export const actions: Actions = {

	// ── 카테고리 생성/수정
	upsertCategory: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form       = await request.formData();
		const id         = (form.get('id') as string) || null;
		const name       = (form.get('name') as string)?.trim();
		const factory_id = myRole === 'factory_admin'
			? myFactoryId!
			: ((form.get('factory_id') as string) || '');

		if (!name)       return fail(400, { error: '카테고리명을 입력해주세요.' });
		if (!factory_id) return fail(400, { error: '공장 정보가 없습니다.' });

		if (id) {
			// 수정
			const { data: target } = await locals.supabase
				.from('categories').select('factory_id').eq('id', id).single();
			if (!target) return fail(404, { error: '카테고리를 찾을 수 없습니다.' });
			const fg = guardFactory(myRole!, myFactoryId, target.factory_id); if (fg) return fg;

			const { error } = await locals.supabase
				.from('categories').update({ name }).eq('id', id);
			if (error) return fail(500, { error: error.message });
		} else {
			// 생성 — sort_order는 기존 max+1
			const { data: maxRow } = await locals.supabase
				.from('categories')
				.select('sort_order')
				.eq('factory_id', factory_id)
				.order('sort_order', { ascending: false })
				.limit(1)
				.single();
			const sort_order = (maxRow?.sort_order ?? -1) + 1;

			const { error } = await locals.supabase
				.from('categories').insert({ name, factory_id, sort_order });
			if (error) return fail(500, { error: error.message });
		}
		return { success: true };
	},

	// ── 카테고리 삭제
	deleteCategory: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const { data: target } = await locals.supabase
			.from('categories').select('factory_id').eq('id', id).single();
		if (!target) return fail(404, { error: '카테고리를 찾을 수 없습니다.' });
		const fg = guardFactory(myRole!, myFactoryId, target.factory_id); if (fg) return fg;

		const { error } = await locals.supabase.from('categories').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 카테고리 순서 변경
	reorderCategories: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		let ids: string[];
		try { ids = JSON.parse(form.get('ids') as string); }
		catch { return fail(400, { error: '잘못된 순서 데이터입니다.' }); }
		if (!Array.isArray(ids) || ids.length === 0) return fail(400, { error: '순서 데이터 누락' });

		if (myRole === 'factory_admin') {
			const { data: first } = await locals.supabase
				.from('categories').select('factory_id').eq('id', ids[0]).single();
			if (!first || first.factory_id !== myFactoryId)
				return fail(403, { error: '본인 공장 데이터만 수정할 수 있습니다.' });
		}

		const updates = ids.map((id, idx) =>
			locals.supabase.from('categories').update({ sort_order: idx }).eq('id', id)
		);
		const results = await Promise.all(updates);
		const failed  = results.find(r => r.error);
		if (failed?.error) return fail(500, { error: failed.error.message });
		return { success: true };
	},

	// ── 품목 생성/수정
	upsertItem: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form        = await request.formData();
		const id          = (form.get('id') as string) || null;
		const category_id = (form.get('category_id') as string);
		const name_ko     = (form.get('name_ko') as string)?.trim();
		const name_en     = (form.get('name_en') as string)?.trim() || undefined;
		const name_zh     = (form.get('name_zh') as string)?.trim() || undefined;
		const nickname    = (form.get('nickname') as string)?.trim() || undefined;

		if (!category_id) return fail(400, { error: 'category_id 누락' });
		if (!name_ko)     return fail(400, { error: '품목명을 입력해주세요.' });

		// category에서 factory_id 가져오기
		const { data: cat } = await locals.supabase
			.from('categories').select('factory_id').eq('id', category_id).single();
		if (!cat) return fail(404, { error: '카테고리를 찾을 수 없습니다.' });
		const fg = guardFactory(myRole!, myFactoryId, cat.factory_id); if (fg) return fg;

		if (id) {
			// 수정
			const { error } = await locals.supabase
				.from('items')
				.update({ category_id, name_ko, name_en: name_en ?? null, name_zh: name_zh ?? null, nickname: nickname ?? null })
				.eq('id', id);
			if (error) return fail(500, { error: error.message });
		} else {
			// 생성 — sort_order max+1
			const { data: maxRow } = await locals.supabase
				.from('items')
				.select('sort_order')
				.eq('category_id', category_id)
				.order('sort_order', { ascending: false })
				.limit(1)
				.single();
			const sort_order = (maxRow?.sort_order ?? -1) + 1;

			const { data: inserted, error } = await locals.supabase
				.from('items')
				.insert({ category_id, factory_id: cat.factory_id, name_ko, name_en: name_en ?? null, name_zh: name_zh ?? null, nickname: nickname ?? null, sort_order })
				.select('id, sort_order')
				.single();
			if (error) return fail(500, { error: error.message });
			return { success: true, id: inserted.id, sort_order: inserted.sort_order };
		}
	},

	// ── 품목 삭제
	deleteItem: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const { data: target } = await locals.supabase
			.from('items').select('factory_id').eq('id', id).single();
		if (!target) return fail(404, { error: '품목을 찾을 수 없습니다.' });
		const fg = guardFactory(myRole!, myFactoryId, target.factory_id); if (fg) return fg;

		const { error } = await locals.supabase.from('items').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 품목 순서 변경
	reorderItems: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		let ids: string[];
		try { ids = JSON.parse(form.get('ids') as string); }
		catch { return fail(400, { error: '잘못된 순서 데이터입니다.' }); }
		if (!Array.isArray(ids) || ids.length === 0) return fail(400, { error: '순서 데이터 누락' });

		if (myRole === 'factory_admin') {
			const { data: first } = await locals.supabase
				.from('items').select('factory_id').eq('id', ids[0]).single();
			if (!first || first.factory_id !== myFactoryId)
				return fail(403, { error: '본인 공장 데이터만 수정할 수 있습니다.' });
		}

		const updates = ids.map((id, idx) =>
			locals.supabase.from('items').update({ sort_order: idx }).eq('id', id)
		);
		const results = await Promise.all(updates);
		const failed  = results.find(r => r.error);
		if (failed?.error) return fail(500, { error: failed.error.message });
		return { success: true };
	},

	// ── 거래처별 단가 upsert
	upsertPrice: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form           = await request.formData();
		const item_id        = form.get('item_id')       as string;
		const client_id      = form.get('client_id')     as string;
		const unit_price_raw = form.get('unit_price')    as string;
		const effective_from = form.get('effective_from') as string;

		if (!item_id)        return fail(400, { error: 'item_id 누락' });
		if (!client_id)      return fail(400, { error: 'client_id 누락' });
		if (!effective_from) return fail(400, { error: '적용일 누락' });
		const unit_price = parseInt(unit_price_raw?.replace(/[^0-9]/g, '') || '0', 10);

		// factory_admin 권한 검증
		if (myRole === 'factory_admin') {
			const [{ data: item }, { data: client }] = await Promise.all([
				locals.supabase.from('items').select('factory_id').eq('id', item_id).single(),
				locals.supabase.from('clients').select('factory_id').eq('id', client_id).single(),
			]);
			if (!item   || item.factory_id   !== myFactoryId) return fail(403, { error: '권한이 없습니다.' });
			if (!client || client.factory_id !== myFactoryId) return fail(403, { error: '권한이 없습니다.' });
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (locals.supabase.from('item_prices') as any)
			.upsert(
				{ item_id, client_id, unit_price, effective_from },
				{ onConflict: 'client_id,item_id,effective_from' }
			);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 단가 삭제
	deletePrice: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId: string | null = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		if (myRole === 'factory_admin') {
			const { data: price } = await locals.supabase
				.from('item_prices')
				.select('item_id')
				.eq('id', id)
				.single();
			if (price) {
				const { data: item } = await locals.supabase
					.from('items').select('factory_id').eq('id', price.item_id).single();
				if (!item || item.factory_id !== myFactoryId)
					return fail(403, { error: '권한이 없습니다.' });
			}
		}

		const { error } = await locals.supabase.from('item_prices').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},
};
