<script lang="ts">
	import Icon from '@iconify/svelte';
	import { invalidateAll } from '$app/navigation';
	import { modal, Pagination, createListStore } from '$lib';
	import { submitAction } from '$lib/utils/action';
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

	let {
		data
	}: { data: PageData & { memos: MemoRow[]; total: number; page: number; PAGE_SIZE: number } } =
		$props();

	// ── 낙관적 업데이트
	const list = createListStore(() => data.memos ?? []);
	const totalPages = $derived(Math.ceil((data.total ?? 0) / (data.PAGE_SIZE ?? 50)));

	// ── 검색 (SearchBar)
	const searchItems = $derived(
		list.items.map((m) => ({
			id: m.id,
			label: m.shipouts?.clients?.name ?? '—',
			sub: m.title
		}))
	);
	let selectedId = $state('');
	let searchQuery = $state('');

	// ── 읽음 필터
	let statusFilter = $state<'all' | 'unread' | 'read'>('unread');

	const unreadCount = $derived(list.items.filter((m) => !m.is_read).length);

	const filteredMemos = $derived(
		list.items.filter((m) => {
			if (selectedId) return m.id === selectedId;
			const matchStatus =
				statusFilter === 'all' ? true : statusFilter === 'unread' ? !m.is_read : m.is_read;
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
		return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
	}

	// ── 에러 모달
	let errorMessage = $state('');
	function showErrorModal(message?: string) {
		errorMessage =
			message ?? '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
		modal.open(errorContent);
	}

	// ── 상세 모달
	let viewingMemo = $state<MemoRow | null>(null);

	// ── 삭제 확인
	let deleteTargetId = $state<string | null>(null);

	// ── 액션 핸들러
	async function handleMarkRead(id: string) {
		const target = list.items.find((m) => m.id === id);
		if (!target) return;
		// 낙관적 업데이트
		list.override(id, { ...target, is_read: true });

		const updated = await submitAction<MemoRow>(
			'markRead',
			{ id },
			{
				responseKey: 'memo',
				onRollback: () => list.clear(id),
				onError: (msg) => {
					list.clear(id);
					showErrorModal(msg);
				}
			}
		);
		if (updated) {
			list.override(id, updated);
		}
		modal.close();
	}

	async function handleMarkAllRead() {
		const ok = await submitAction(
			'markAllRead',
			{},
			{
				onError: showErrorModal
			}
		);
		if (ok) await invalidateAll();
	}

	async function handleDeleteMemo(id: string) {
		// 낙관적 삭제
		list.remove(id);
		modal.close();

		const ok = await submitAction(
			'deleteMemo',
			{ id },
			{
				onRollback: () => list.restoreRemoved(id),
				onError: (msg) => {
					list.restoreRemoved(id);
					showErrorModal(msg);
				}
			}
		);
		if (!ok) return;
		deleteTargetId = null;
		if (viewingMemo?.id === id) viewingMemo = null;
	}

	function goMemoPage() {
		window.open('/memo', '_blank');
	}
</script>

{#snippet detailContent()}
	{@const m = viewingMemo}
	{#if m}
		<div
			class="modal-box flex w-full max-w-lg flex-col gap-0 rounded-2xl p-6"
			style="max-height:600px;"
		>
			<div class="mb-4 flex items-start justify-between">
				<div>
					<p class="text-base-content/40 mb-1 text-xs font-bold tracking-wide uppercase">
						{m.shipouts?.clients?.name ?? '—'} · {m.shipouts?.created_at
							? fmtDate(m.shipouts.created_at)
							: ''}
					</p>
					<h3 class="text-base-content text-lg leading-snug font-extrabold">{m.title}</h3>
				</div>
				<button
					type="button"
					onclick={modal.close}
					class="btn btn-ghost btn-sm btn-circle ml-3 shrink-0"
				>
					<Icon icon="lucide:x" class="h-5 w-5" />
				</button>
			</div>
			<p class="text-base-content/40 mb-4 flex items-center gap-1.5 text-xs">
				<Icon icon="lucide:user" class="h-3.5 w-3.5" />{m.author_name}
				<span class="ml-2 flex items-center gap-1">
					<Icon icon="lucide:clock" class="h-3.5 w-3.5" />{fmtDate(m.created_at)}
				</span>
			</p>
			<div class="divider my-0"></div>
			<div
				class="text-base-content flex-1 overflow-y-auto py-4 text-sm leading-relaxed whitespace-pre-wrap"
			>
				{m.content}
			</div>
			<div class="divider my-0"></div>
			<div class="flex items-center justify-end gap-2 pt-4">
				<button type="button" onclick={modal.close} class="btn btn-ghost btn-sm">닫기</button>
				{#if !m.is_read}
					<button
						type="button"
						class="btn btn-primary btn-sm gap-1.5"
						onclick={() => handleMarkRead(m.id)}
					>
						<Icon icon="lucide:check" class="h-4 w-4" />
						읽음 확인
					</button>
				{/if}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet deleteConfirmContent()}
	{@const id = deleteTargetId}
	{#if id}
		<div class="modal-box w-full max-w-sm rounded-2xl p-6">
			<div class="mb-4 flex items-center gap-3">
				<div class="bg-error/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
					<Icon icon="lucide:trash-2" class="text-error h-5 w-5" />
				</div>
				<div>
					<h3 class="text-base font-extrabold">메모 삭제</h3>
					<p class="text-base-content/50 mt-0.5 text-sm">삭제하면 복구할 수 없습니다.</p>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn btn-ghost btn-sm" onclick={modal.close}>취소</button>
				<button
					type="button"
					class="btn btn-error btn-sm gap-1.5"
					onclick={() => handleDeleteMemo(id)}
				>
					<Icon icon="lucide:trash-2" class="h-4 w-4" />
					삭제
				</button>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet errorContent()}
	<div class="modal-box w-full max-w-sm rounded-2xl p-6">
		<div class="mb-4 flex items-center gap-3">
			<div class="bg-error/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
				<Icon icon="lucide:alert-circle" class="text-error h-5 w-5" />
			</div>
			<div>
				<h3 class="text-base font-extrabold">오류</h3>
				<p class="text-base-content/50 mt-0.5 text-sm">{errorMessage}</p>
			</div>
		</div>
		<div class="flex justify-end">
			<button type="button" class="btn btn-ghost btn-sm" onclick={modal.close}>확인</button>
		</div>
	</div>
{/snippet}

<div class="bg-base-200 min-h-full px-8 py-10">
	<!-- 헤더 -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<h2 class="text-base-content text-2xl font-extrabold">
				메모 확인
				{#if unreadCount > 0}
					<span class="badge badge-primary ml-2 font-bold">{unreadCount}</span>
				{/if}
			</h2>
			<p class="text-base-content/50 mt-0.5 text-sm">
				출고 건별로 실무자가 남긴 메모를 확인합니다.
			</p>
		</div>
		<button type="button" class="btn btn-outline btn-sm gap-1.5" onclick={goMemoPage}>
			<Icon icon="lucide:external-link" class="h-4 w-4" />
			메모 작성 테스트
		</button>
	</div>

	<!-- 검색 / 필터 바 -->
	<div class="mb-5 flex flex-wrap items-center gap-3">
		<SearchBar
			placeholder="거래처명, 제목 검색..."
			items={searchItems}
			onselect={(id) => {
				selectedId = id;
				searchQuery = '';
			}}
			oninput={(v) => {
				searchQuery = v;
				selectedId = '';
			}}
		/>

		<!-- 읽음 상태 필터 -->
		<div class="flex items-center gap-1">
			{#each [{ value: 'all', label: '전체' }, { value: 'unread', label: '안읽음' }, { value: 'read', label: '읽음' }] as const as f (f.value)}
				<button
					type="button"
					class="btn btn-sm {statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => {
						statusFilter = f.value;
						selectedId = '';
					}}>{f.label}</button
				>
			{/each}
		</div>

		<!-- 전체 읽음 -->
		<button
			type="button"
			class="btn btn-sm btn-ghost ml-auto gap-1.5"
			disabled={unreadCount === 0}
			onclick={handleMarkAllRead}
		>
			<Icon icon="lucide:check-check" class="h-4 w-4" />
			전체 읽음
		</button>
	</div>

	<!-- 테이블 -->
	<div class="card bg-base-100 overflow-hidden shadow-sm">
		{#if filteredMemos.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 py-20">
				<Icon icon="lucide:message-square-off" class="text-base-content/20 h-10 w-10" />
				<p class="text-base-content/40 text-sm">메모가 없습니다.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="table-sm table w-full">
					<thead class="bg-base-200 text-base-content/60">
						<tr>
							<th class="w-6 text-xs"></th>
							<th class="text-xs">거래처</th>
							<th class="hidden text-xs sm:table-cell">출고일</th>
							<th class="text-xs">제목</th>
							<th class="hidden text-xs md:table-cell">작성자</th>
							<th class="hidden text-xs lg:table-cell">작성일시</th>
							<th class="w-20 text-center text-xs">액션</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMemos as memo (memo.id)}
							<tr
								class="hover cursor-pointer {memo.is_read ? 'opacity-50' : 'font-semibold'}"
								onclick={() => {
									viewingMemo = memo;
									modal.open(detailContent);
								}}
							>
								<td>
									{#if !memo.is_read}
										<span class="bg-primary inline-block h-2 w-2 rounded-full"></span>
									{/if}
								</td>
								<td>{memo.shipouts?.clients?.name ?? '—'}</td>
								<td class="text-base-content/60 hidden text-xs sm:table-cell">
									{memo.shipouts?.created_at ? fmtDate(memo.shipouts.created_at) : '—'}
								</td>
								<td class="text-sm">{memo.title}</td>
								<td class="text-base-content/60 hidden text-xs md:table-cell">{memo.author_name}</td
								>
								<td class="text-base-content/50 hidden text-xs whitespace-nowrap lg:table-cell"
									>{fmtDate(memo.created_at)}</td
								>
								<td onclick={(e) => e.stopPropagation()}>
									<div class="flex items-center justify-center">
										<button
											type="button"
											class="btn btn-ghost btn-xs text-error"
											onclick={() => {
												deleteTargetId = memo.id;
												modal.open(deleteConfirmContent);
											}}
										>
											<Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
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
	<div class="mt-5">
		<Pagination
			currentPage={data.page}
			{totalPages}
			totalItems={data.total ?? 0}
			pageSize={data.PAGE_SIZE ?? 50}
			onpage={(p) => {
				const url = new URL(window.location.href);
				url.searchParams.set('page', String(p));
				window.location.href = url.toString();
			}}
		/>
	</div>
</div>
