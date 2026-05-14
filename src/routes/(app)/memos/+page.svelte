<script lang="ts">
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import type { PageData } from './$types';

	type MemoRow = {
		id: string;
		shipout_id: string;
		title: string;
		content: string;
		author_name: string;
		is_read: boolean;
		created_at: string;
		shipouts: {
			id: string;
			created_at: string;
			clients: { id: string; name: string } | null;
		} | null;
	};

	let { data }: { data: PageData & { memos: MemoRow[]; total: number; page: number; PAGE_SIZE: number } } = $props();

	const memos = $derived(data.memos ?? []);
	const totalPages = $derived(Math.ceil((data.total ?? 0) / (data.PAGE_SIZE ?? 50)));

	// ── 검색 (SearchBar) ──
	const searchItems = $derived(
		memos.map(m => ({
			id: m.id,
			label: m.shipouts?.clients?.name ?? '—',
			sub: m.title,
		}))
	);
	let selectedId   = $state('');
	let searchQuery  = $state('');

	// ── 읽음 필터 ──
	let statusFilter = $state<'all' | 'unread' | 'read'>('unread');

	const unreadCount = $derived(memos.filter(m => !m.is_read).length);

	const filteredMemos = $derived(
		memos.filter(m => {
			if (selectedId) return m.id === selectedId;
			const matchStatus =
				statusFilter === 'all'    ? true :
				statusFilter === 'unread' ? !m.is_read : m.is_read;
			if (!matchStatus) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				return (
					m.title.toLowerCase().includes(q) ||
					m.content.toLowerCase().includes(q) ||
					m.author_name.toLowerCase().includes(q) ||
					(m.shipouts?.clients?.name ?? '').toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	function fmtDate(s: string) {
		const d = new Date(s);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
	}

	// ── 상세 모달 ──
	let viewingMemo = $state<MemoRow | null>(null);

	// ── 삭제 확인 ──
	let deleteTargetId   = $state<string | null>(null);
	let deleteSubmitting = $state(false);

	// ── 삭제 확인 ──
	function goMemoPage() {
		window.open('/memo', '_blank');
	}
</script>

<div class="min-h-full bg-base-200 px-8 py-10">

	<!-- 헤더 -->
	<div class="flex items-start justify-between mb-6">
		<div>
			<h2 class="text-2xl font-extrabold text-base-content">
				메모 확인
				{#if unreadCount > 0}
					<span class="badge badge-primary font-bold ml-2">{unreadCount}</span>
				{/if}
			</h2>
			<p class="text-sm text-base-content/50 mt-0.5">출고 건별로 실무자가 남긴 메모를 확인합니다.</p>
		</div>
		<button
			type="button"
			class="btn btn-outline btn-sm gap-1.5"
			onclick={goMemoPage}
		>
			<Icon icon="lucide:external-link" class="w-4 h-4" />
			메모 작성 테스트
		</button>
	</div>

	<!-- 검색 / 필터 바 -->
	<div class="flex flex-wrap items-center gap-3 mb-5">
		<SearchBar
			placeholder="거래처명, 제목 검색..."
			items={searchItems}
			onselect={(id) => { selectedId = id; searchQuery = ''; }}
			oninput={(v) => { searchQuery = v; selectedId = ''; }}
			class="w-64 sm:w-72"
		/>

		<!-- 읽음 상태 필터 -->
		<div class="flex items-center gap-1">
			{#each ([
				{ value: 'all',    label: '전체'     },
				{ value: 'unread', label: '안읽음'   },
				{ value: 'read',   label: '읽음'     },
			] as const) as f (f.value)}
				<button
					type="button"
					class="btn btn-sm {statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => { statusFilter = f.value; selectedId = ''; }}
				>{f.label}</button>
			{/each}
		</div>

		<!-- 전체 읽음 -->
		<form method="POST" action="?/markAllRead" use:enhance class="ml-auto">
			<button
				type="submit"
				class="btn btn-sm btn-ghost gap-1.5"
				disabled={unreadCount === 0}
			>
				<Icon icon="lucide:check-check" class="w-4 h-4" />
				전체 읽음
			</button>
		</form>
	</div>

	<!-- 테이블 -->
	<div class="card bg-base-100 shadow-sm overflow-hidden">
		{#if filteredMemos.length === 0}
			<div class="flex flex-col items-center justify-center py-20 gap-3">
				<Icon icon="lucide:message-square-off" class="w-10 h-10 text-base-content/20" />
				<p class="text-base-content/40 text-sm">메모가 없습니다.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table table-sm w-full">
					<thead class="bg-base-200 text-base-content/60">
						<tr>
							<th class="text-xs w-6"></th>
							<th class="text-xs">거래처</th>
							<th class="text-xs hidden sm:table-cell">출고일</th>
							<th class="text-xs">제목</th>
							<th class="text-xs hidden md:table-cell">작성자</th>
							<th class="text-xs hidden lg:table-cell">작성일시</th>
							<th class="text-xs text-center w-20">액션</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMemos as memo (memo.id)}
							<tr
								class="hover cursor-pointer {memo.is_read ? 'opacity-50' : 'font-semibold'}"
								onclick={() => { viewingMemo = memo; }}
							>
								<td>
									{#if !memo.is_read}
										<span class="inline-block w-2 h-2 rounded-full bg-primary"></span>
									{/if}
								</td>
								<td>{memo.shipouts?.clients?.name ?? '—'}</td>
								<td class="text-xs text-base-content/60 hidden sm:table-cell">
									{memo.shipouts?.created_at ? fmtDate(memo.shipouts.created_at) : '—'}
								</td>
								<td class="text-sm">{memo.title}</td>
								<td class="text-xs text-base-content/60 hidden md:table-cell">{memo.author_name}</td>
								<td class="text-xs text-base-content/50 whitespace-nowrap hidden lg:table-cell">{fmtDate(memo.created_at)}</td>
								<td onclick={(e) => e.stopPropagation()}>
									<div class="flex items-center justify-center">
										<button
											type="button"
											class="btn btn-ghost btn-xs text-error"
											onclick={() => { deleteTargetId = memo.id; }}
										>
											<Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- 페이지네이션 -->
	{#if totalPages > 1}
		<div class="flex justify-center mt-5 gap-1">
			{#if data.page > 1}
				<a href="?page={data.page - 1}" class="btn btn-sm btn-ghost">‹ 이전</a>
			{/if}
			{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p (p)}
				<a href="?page={p}" class="btn btn-sm {data.page === p ? 'btn-primary' : 'btn-ghost'}">{p}</a>
			{/each}
			{#if data.page < totalPages}
				<a href="?page={data.page + 1}" class="btn btn-sm btn-ghost">다음 ›</a>
			{/if}
		</div>
	{/if}
</div>
{#if viewingMemo}
	{@const m = viewingMemo}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col gap-0" style="max-height:600px;">
			<div class="flex items-start justify-between mb-4">
				<div>
					<p class="text-xs font-bold text-base-content/40 uppercase tracking-wide mb-1">
						{m.shipouts?.clients?.name ?? '—'} · {m.shipouts?.created_at ? fmtDate(m.shipouts.created_at) : ''}
					</p>
					<h3 class="text-lg font-extrabold text-base-content leading-snug">{m.title}</h3>
				</div>
				<button
					type="button"
					onclick={() => { viewingMemo = null; }}
					class="btn btn-ghost btn-sm btn-circle ml-3 shrink-0"
				>
					<Icon icon="lucide:x" class="w-5 h-5" />
				</button>
			</div>
			<p class="text-xs text-base-content/40 mb-4 flex items-center gap-1.5">
				<Icon icon="lucide:user" class="w-3.5 h-3.5" />{m.author_name}
				<span class="flex items-center gap-1 ml-2">
					<Icon icon="lucide:clock" class="w-3.5 h-3.5" />{fmtDate(m.created_at)}
				</span>
			</p>
			<div class="divider my-0"></div>
			<div class="flex-1 overflow-y-auto py-4 text-sm text-base-content leading-relaxed whitespace-pre-wrap">
				{m.content}
			</div>
			<div class="divider my-0"></div>
			<div class="flex justify-end items-center gap-2 pt-4">
				<button type="button" onclick={() => { viewingMemo = null; }} class="btn btn-ghost btn-sm">닫기</button>
				{#if !m.is_read}
					<form method="POST" action="?/markRead" use:enhance={() => {
						return async ({ update }) => {
							await update();
							viewingMemo = null;
						};
					}}>
						<input type="hidden" name="id" value={m.id} />
						<button type="submit" class="btn btn-primary btn-sm gap-1.5">
							<Icon icon="lucide:check" class="w-4 h-4" />
							읽음 확인
						</button>
					</form>
				{/if}
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={() => { viewingMemo = null; }}>close</button>
		</form>
	</dialog>
{/if}

<!-- ───── 삭제 확인 모달 ───── -->
{#if deleteTargetId}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box w-full max-w-sm rounded-2xl p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
					<Icon icon="lucide:trash-2" class="h-5 w-5 text-error" />
				</div>
				<div>
					<h3 class="text-base font-extrabold">메모 삭제</h3>
					<p class="text-sm text-base-content/50 mt-0.5">삭제하면 복구할 수 없습니다.</p>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					onclick={() => { deleteTargetId = null; }}
					disabled={deleteSubmitting}
				>취소</button>
				<form
					method="POST"
					action="?/deleteMemo"
					use:enhance={() => {
						deleteSubmitting = true;
						return async ({ update }) => {
							deleteSubmitting = false;
							deleteTargetId = null;
							if (viewingMemo?.id === deleteTargetId) viewingMemo = null;
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={deleteTargetId} />
					<button type="submit" class="btn btn-error btn-sm gap-1.5" disabled={deleteSubmitting}>
						{#if deleteSubmitting}
							<span class="loading loading-spinner loading-xs"></span>
						{:else}
							<Icon icon="lucide:trash-2" class="w-4 h-4" />
						{/if}
						삭제
					</button>
				</form>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={() => { deleteTargetId = null; }}>close</button>
		</form>
	</dialog>
{/if}
