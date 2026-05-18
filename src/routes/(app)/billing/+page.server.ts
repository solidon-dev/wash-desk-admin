import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// ── 타입 ──────────────────────────────────────────────────────────────────
export interface ShipoutLog {
	shipout_id: string;
	processed_at: string;
	item_id: string;
	item_name_ko: string;
	category_id: string;
	category_name: string;
	item_sort_order: number;
	quantity: number;
	unit_price: number;
	price_from: string | null;
	price_to: string | null;
}

// ── 권한 헬퍼 ─────────────────────────────────────────────────────────────
function getFactoryId(locals: App.Locals): string | null {
	return (locals.session?.factory_id ?? null) as string | null;
}

// ── load ──────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals, url }) => {
	const myRole = locals.session?.role;
	const myFactoryId = getFactoryId(locals);

	// ── 1. 거래처 목록 조회 ───────────────────────────────────────────────
	let clientsQuery = locals.supabase
		.from('clients')
		.select('id, name')
		.is('deleted_at', null)
		.order('name', { ascending: true });

	if (myRole !== 'super_admin' && myFactoryId) {
		clientsQuery = clientsQuery.eq('factory_id', myFactoryId);
	}

	const { data: clients, error: clientsError } = await clientsQuery;
	if (clientsError) {
		return {
			clients: [] as { id: string; name: string }[],
			selectedClientId: null,
			shipoutLogs: [] as ShipoutLog[],
			categories: [] as { id: string; name: string; sort_order: number }[],
			invoiceHistory: []
		};
	}

	const clientList = clients ?? [];

	// ── 2. selectedClientId 결정 ──────────────────────────────────────────
	const paramClientId = url.searchParams.get('clientId');
	const selectedClientId =
		paramClientId && clientList.some((c) => c.id === paramClientId)
			? paramClientId
			: (clientList[0]?.id ?? null);

	if (!selectedClientId) {
		return {
			clients: clientList,
			selectedClientId: null,
			shipoutLogs: [] as ShipoutLog[],
			categories: [] as { id: string; name: string; sort_order: number }[],
			invoiceHistory: []
		};
	}

	// ── 3. 페이지 데이터 일괄 조회 (RPC 1번) ─────────────────────────────
	// categories + shipout_logs(단가 포함) + invoices 를 DB에서 한 번에
	type RpcRow = {
		categories: { id: string; name: string; sort_order: number }[];
		shipout_logs: {
			shipout_id: string;
			processed_at: string;
			item_id: string;
			item_name_ko: string;
			category_id: string;
			item_sort_order: number;
			quantity: number;
			unit_price: number;
			price_from: string | null;
			price_to: string | null;
		}[];
		invoices: unknown[];
	};

	const { data: rpcRows, error: rpcError } = await (
		locals.supabase.rpc as unknown as (
			fn: string,
			args: Record<string, unknown>
		) => Promise<{ data: RpcRow[] | null; error: unknown }>
	)('get_billing_page_data', { p_client_id: selectedClientId });

	if (rpcError || !rpcRows || rpcRows.length === 0) {
		return {
			clients: clientList,
			selectedClientId,
			shipoutLogs: [] as ShipoutLog[],
			categories: [] as { id: string; name: string; sort_order: number }[],
			invoiceHistory: []
		};
	}

	const row = rpcRows[0];
	const categoryList = row.categories ?? [];
	const rawLogs = row.shipout_logs ?? [];
	const invoiceHistory = row.invoices ?? [];

	// category_id → name 매핑
	const categoryMap = new Map<string, string>(categoryList.map((c) => [c.id, c.name]));

	// ── 4. shipoutLogs 조립 ───────────────────────────────────────────────
	const shipoutLogs: ShipoutLog[] = rawLogs.map((log) => ({
		shipout_id: log.shipout_id,
		processed_at: log.processed_at,
		item_id: log.item_id,
		item_name_ko: log.item_name_ko,
		category_id: log.category_id,
		category_name: categoryMap.get(log.category_id) ?? '',
		item_sort_order: log.item_sort_order,
		quantity: log.quantity,
		unit_price: log.unit_price,
		price_from: log.price_from,
		price_to: log.price_to
	}));

	return {
		clients: clientList,
		selectedClientId,
		shipoutLogs,
		categories: categoryList,
		invoiceHistory
	};
};

// ── actions ───────────────────────────────────────────────────────────────
export const actions: Actions = {
	// ── 청구서 발행 ─────────────────────────────────────────────────────
	issueInvoice: async ({ request, locals }) => {
		const myRole = locals.session?.role;
		const myFactoryId = (locals.session?.factory_id ?? null) as string | null;
		const myUserId = locals.session?.user?.id ?? null;

		if (!myFactoryId || !myUserId) {
			return fail(401, { error: '인증 정보가 없습니다.' });
		}
		if (myRole === 'worker') {
			return fail(403, { error: '권한이 없습니다.' });
		}

		const fd = await request.formData();

		const client_id = fd.get('client_id') as string;
		const period_from = fd.get('period_from') as string;
		const period_to = fd.get('period_to') as string;
		const subtotal = parseInt(fd.get('subtotal') as string, 10);
		const vat = parseInt(fd.get('vat') as string, 10);
		const jeolsa = parseInt(fd.get('jeolsa') as string, 10);
		const total = parseInt(fd.get('total') as string, 10);
		const snapshot_factory = JSON.parse(fd.get('snapshot_factory') as string);
		const snapshot_client = JSON.parse(fd.get('snapshot_client') as string);
		const items = JSON.parse(fd.get('items') as string) as {
			category: string;
			itemName: string;
			itemSortOrder: number;
			quantity: number;
			unitPrice: number;
			amount: number;
		}[];
		// 1. invoices INSERT
		const { data: invoice, error: invoiceError } = await locals.supabase
			.from('invoices')
			.insert({
				client_id,
				factory_id: myFactoryId,
				created_by: myUserId,
				period_start: period_from,
				period_end: period_to,
				subtotal,
				vat,
				jeolsa,
				total,
				discount: 0,
				snapshot_factory,
				snapshot_client
			})
			.select('id')
			.single();

		if (invoiceError || !invoice) {
			return fail(500, { error: '청구서 저장 실패: ' + (invoiceError?.message ?? '') });
		}

		const invoiceId = invoice.id;

		// 2. invoice_items INSERT
		const invoiceItemRows = items.map((line, idx) => ({
			invoice_id: invoiceId,
			item_name_ko: line.itemName,
			category_name: line.category,
			quantity: line.quantity,
			unit_price: line.unitPrice,
			amount: line.amount,
			sort_order: idx
		}));

		await locals.supabase.from('invoice_items').insert(invoiceItemRows);

		return { success: true, invoiceId };
	},

	// ── 청구서 취소 ──────────────────────────────────────────────
	cancelInvoice: async ({ request, locals }) => {
		const myRole = locals.session?.role;
		const myUserId = locals.session?.user?.id ?? null;

		if (!myUserId) {
			return fail(401, { error: '인증 정보가 없습니다.' });
		}
		if (myRole === 'worker') {
			return fail(403, { error: '권한이 없습니다.' });
		}

		const fd = await request.formData();
		const invoice_id = fd.get('invoice_id') as string;

		// invoice_items 먼저 삭제 (외래키 제약)
		await locals.supabase.from('invoice_items').delete().eq('invoice_id', invoice_id);

		const { error } = await locals.supabase.from('invoices').delete().eq('id', invoice_id);

		if (error) {
			return fail(500, { error: '삭제 실패: ' + error.message });
		}

		return { success: true };
	}
};
