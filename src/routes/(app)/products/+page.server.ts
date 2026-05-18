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
// 거래처가 내 공장 소속인지 확인
async function guardClientFactory(
	locals: App.Locals,
	clientId: string,
	myFactoryId: string | null
): Promise<ReturnType<typeof fail> | null> {
	if (locals.session?.role !== 'factory_admin') return null;
	const { data } = await locals.supabase
		.from('clients').select('factory_id').eq('id', clientId).single();
	if (!data || data.factory_id !== myFactoryId)
		return fail(403, { error: '권한이 없습니다.' });
	return null;
}

// ── load ──────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
	const myRole      = locals.session?.role;
	const myFactoryId = getFactoryId(locals);

	// 거래처 목록
	let clientsQuery = locals.supabase
		.from('clients')
		.select('id, name, factory_id')
		.is('deleted_at', null)
		.order('name', { ascending: true });
	if (myRole === 'factory_admin' && myFactoryId)
		clientsQuery = clientsQuery.eq('factory_id', myFactoryId);

	const { data: clients, error: clientsError } = await clientsQuery;
	if (clientsError) return { clients: [], categories: [], items: [], itemPrices: [], selectedClientId: null };

	// clientId 없으면 URL 없이 진입한 것 — localStorage fallback은 클라이언트가 처리
	const rawClientId = url.searchParams.get('clientId');
	const selectedClientId = rawClientId || (clients?.[0]?.id ?? null);
	if (!selectedClientId)
		return { clients: clients ?? [], categories: [], items: [], itemPrices: [], selectedClientId: null, invalidClientId: false };

	const targetClient = (clients ?? []).find(c => c.id === selectedClientId);
	if (!targetClient)
		// rawClientId가 있는데 찾을 수 없으면 무효 id → 클라이언트가 localStorage 제거
		return { clients: clients ?? [], categories: [], items: [], itemPrices: [], selectedClientId: null, invalidClientId: !!rawClientId };

	// categories + items 병렬 조회
	const [{ data: categories }, { data: items }] = await Promise.all([
		locals.supabase
			.from('categories')
			.select('id, name, sort_order, client_id')
			.eq('client_id', selectedClientId)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: true }),
		locals.supabase
			.from('items')
			.select('id, category_id, client_id, name_ko, name_en, name_zh, nickname, sort_order')
			.eq('client_id', selectedClientId)
			.order('sort_order', { ascending: true })
			.order('created_at', { ascending: true }),
	]);

	// item_prices — items에 딸린 단가 (client_id 없음, item_id로만)
	const itemIds = (items ?? []).map(i => i.id);
	let itemPrices: Array<{ id: string; item_id: string; unit_price: number; effective_from: string }> = [];
	if (itemIds.length > 0) {
		const { data } = await locals.supabase
			.from('item_prices')
			.select('id, item_id, unit_price, effective_from')
			.in('item_id', itemIds);
		itemPrices = data ?? [];
	}

	return {
		clients:         clients ?? [],
		categories:      categories ?? [],
		items:           items ?? [],
		itemPrices,
		selectedClientId,
		invalidClientId: false,
	};
};

// ── actions ───────────────────────────────────────────────────────────────
export const actions: Actions = {

	// ── 카테고리 생성/수정
	upsertCategory: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form      = await request.formData();
		const id        = (form.get('id') as string) || null;
		const name      = (form.get('name') as string)?.trim();
		const client_id = (form.get('client_id') as string);

		if (!name)      return fail(400, { error: '카테고리명을 입력해주세요.' });
		if (!client_id) return fail(400, { error: '거래처 정보가 없습니다.' });

		const fg = await guardClientFactory(locals, client_id, myFactoryId); if (fg) return fg;

		if (id) {
			const { error } = await locals.supabase
				.from('categories').update({ name }).eq('id', id);
			if (error) return fail(500, { error: error.message });
		} else {
			const { data: maxRow } = await locals.supabase
				.from('categories').select('sort_order')
				.eq('client_id', client_id)
				.order('sort_order', { ascending: false }).limit(1).single();
			const sort_order = (maxRow?.sort_order ?? -1) + 1;

			const { data: inserted, error } = await locals.supabase
				.from('categories').insert({ name, client_id, sort_order }).select('id').single();
			if (error) return fail(500, { error: error.message });
			return { success: true, id: inserted.id, sort_order };
		}
		return { success: true };
	},

	// ── 카테고리 삭제
	deleteCategory: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const { data: target } = await locals.supabase
			.from('categories').select('client_id').eq('id', id).single();
		if (!target) return fail(404, { error: '카테고리를 찾을 수 없습니다.' });

		const fg = await guardClientFactory(locals, target.client_id, myFactoryId); if (fg) return fg;

		const { error } = await locals.supabase.from('categories').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 카테고리 순서 변경
	reorderCategories: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		let ids: string[];
		try { ids = JSON.parse(form.get('ids') as string); }
		catch { return fail(400, { error: '잘못된 순서 데이터입니다.' }); }
		if (!Array.isArray(ids) || ids.length === 0) return fail(400, { error: '순서 데이터 누락' });

		if (myRole === 'factory_admin') {
			const { data: first } = await locals.supabase
				.from('categories').select('client_id').eq('id', ids[0]).single();
			if (!first) return fail(404, { error: '카테고리를 찾을 수 없습니다.' });
			const fg = await guardClientFactory(locals, first.client_id, myFactoryId); if (fg) return fg;
		}

		const { error: reorderError } = await (locals.supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('reorder_categories', {
			p_ids: ids,
			p_orders: ids.map((_, idx) => idx),
		});
		if (reorderError) return fail(500, { error: reorderError.message });
		return { success: true };
	},

	// ── 품목 생성/수정
	upsertItem: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form        = await request.formData();
		const id          = (form.get('id') as string) || null;
		const category_id = (form.get('category_id') as string);
		const client_id   = (form.get('client_id') as string);
		const name_ko     = (form.get('name_ko') as string)?.trim();
		const name_en     = (form.get('name_en') as string)?.trim() || '';
		const name_zh     = (form.get('name_zh') as string)?.trim() || '';
		const nickname    = (form.get('nickname') as string)?.trim() || '';

		if (!category_id) return fail(400, { error: 'category_id 누락' });
		if (!client_id)   return fail(400, { error: 'client_id 누락' });
		if (!name_ko)     return fail(400, { error: '품목명을 입력해주세요.' });

		const fg = await guardClientFactory(locals, client_id, myFactoryId); if (fg) return fg;

		if (id) {
			// 수정
			const { error } = await locals.supabase
				.from('items')
				.update({ category_id, name_ko, name_en: name_en || null, name_zh: name_zh || null, nickname: nickname || null })
				.eq('id', id);
			if (error) return fail(500, { error: error.message });
			return { success: true };
		} else {
			// 신규 생성: RPC로 item + price 한 트랜잭션
			const unit_price_raw = (form.get('unit_price') as string);
			const effective_from = (form.get('effective_from') as string);
			if (!effective_from) return fail(400, { error: '적용일 누락' });
			const unit_price = parseInt(unit_price_raw?.replace(/[^0-9]/g, '') || '0', 10);
			if (unit_price <= 0) return fail(400, { error: '단가는 0보다 커야 합니다.' });

			const { data: maxRow } = await locals.supabase
				.from('items').select('sort_order')
				.eq('category_id', category_id)
				.order('sort_order', { ascending: false }).limit(1).single();
			const sort_order = (maxRow?.sort_order ?? -1) + 1;

			const { data: result, error } = await locals.supabase.rpc('create_item_with_price', {
				p_client_id:      client_id,
				p_category_id:    category_id,
				p_name_ko:        name_ko,
				p_name_en:        name_en,
				p_name_zh:        name_zh,
				p_nickname:       nickname,
				p_sort_order:     sort_order,
				p_unit_price:     unit_price,
				p_effective_from: effective_from,
			});
			if (error) return fail(500, { error: error.message });

			const parsed = result as { id: string; sort_order: number };
			return { success: true, id: parsed.id, sort_order: parsed.sort_order };
		}
	},

	// ── 품목 삭제
	deleteItem: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		const { data: target } = await locals.supabase
			.from('items').select('client_id').eq('id', id).single();
		if (!target) return fail(404, { error: '품목을 찾을 수 없습니다.' });

		const fg = await guardClientFactory(locals, target.client_id, myFactoryId); if (fg) return fg;

		const { error } = await locals.supabase.from('items').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 품목 순서 변경
	reorderItems: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		let ids: string[];
		try { ids = JSON.parse(form.get('ids') as string); }
		catch { return fail(400, { error: '잘못된 순서 데이터입니다.' }); }
		if (!Array.isArray(ids) || ids.length === 0) return fail(400, { error: '순서 데이터 누락' });

		if (myRole === 'factory_admin') {
			const { data: first } = await locals.supabase
				.from('items').select('client_id').eq('id', ids[0]).single();
			if (!first) return fail(404, { error: '품목을 찾을 수 없습니다.' });
			const fg = await guardClientFactory(locals, first.client_id, myFactoryId); if (fg) return fg;
		}

		const { error: reorderError } = await (locals.supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)('reorder_items', {
			p_ids: ids,
			p_orders: ids.map((_, idx) => idx),
		});
		if (reorderError) return fail(500, { error: reorderError.message });
		return { success: true };
	},

	// ── 단가 리셋 (이전 날짜로 변경 시: 기존 이력 전부 삭제 후 단일 레코드로 교체)
	resetPrice: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form           = await request.formData();
		const item_id        = form.get('item_id')        as string;
		const unit_price_raw = form.get('unit_price')     as string;
		const effective_from = form.get('effective_from') as string;

		if (!item_id)        return fail(400, { error: 'item_id 누락' });
		if (!effective_from) return fail(400, { error: '적용일 누락' });
		const unit_price = parseInt(unit_price_raw?.replace(/[^0-9]/g, '') || '0', 10);
		if (unit_price <= 0) return fail(400, { error: '단가는 0보다 커야 합니다.' });

		if (myRole === 'factory_admin') {
			const { data: item } = await locals.supabase
				.from('items').select('client_id').eq('id', item_id).single();
			if (!item) return fail(404, { error: '품목을 찾을 수 없습니다.' });
			const fg = await guardClientFactory(locals, item.client_id, myFactoryId); if (fg) return fg;
		}

		const { data, error } = await (locals.supabase.rpc as unknown as (
			fn: string, args: Record<string, unknown>
		) => Promise<{ data: { deleted_count: number } | null; error: { message: string } | null }>)(
			'reset_item_price',
			{ p_item_id: item_id, p_unit_price: unit_price, p_effective_from: effective_from }
		);
		if (error) return fail(500, { error: error.message });
		return { success: true, deleted_count: data?.deleted_count ?? 0 };
	},

	// ── 단가 upsert
	upsertPrice: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form           = await request.formData();
		const item_id        = form.get('item_id')        as string;
		const unit_price_raw = form.get('unit_price')     as string;
		const effective_from = form.get('effective_from') as string;

		if (!item_id)        return fail(400, { error: 'item_id 누락' });
		if (!effective_from) return fail(400, { error: '적용일 누락' });
		const unit_price = parseInt(unit_price_raw?.replace(/[^0-9]/g, '') || '0', 10);
		if (unit_price <= 0) return fail(400, { error: '단가는 0보다 커야 합니다.' });

		if (myRole === 'factory_admin') {
			const { data: item } = await locals.supabase
				.from('items').select('client_id').eq('id', item_id).single();
			if (!item) return fail(404, { error: '품목을 찾을 수 없습니다.' });
			const fg = await guardClientFactory(locals, item.client_id, myFactoryId); if (fg) return fg;
		}

		const { error } = await locals.supabase
			.from('item_prices')
			.upsert(
				{ item_id, unit_price, effective_from },
				{ onConflict: 'item_id,effective_from' }
			);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── 단가 삭제
	deletePrice: async ({ request, locals }) => {
		const myRole      = locals.session?.role;
		const myFactoryId = getFactoryId(locals);
		const g = guardWorker(myRole); if (g) return g;

		const form = await request.formData();
		const id   = form.get('id') as string;
		if (!id) return fail(400, { error: 'id 누락' });

		if (myRole === 'factory_admin') {
			const { data: price } = await locals.supabase
				.from('item_prices').select('item_id').eq('id', id).single();
			if (!price) return fail(404, { error: '단가를 찾을 수 없습니다.' });
			const { data: item } = await locals.supabase
				.from('items').select('client_id').eq('id', price.item_id).single();
			if (!item) return fail(404, { error: '품목을 찾을 수 없습니다.' });
			const fg = await guardClientFactory(locals, item.client_id, myFactoryId); if (fg) return fg;
		}

		const { error } = await locals.supabase.from('item_prices').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},
};
