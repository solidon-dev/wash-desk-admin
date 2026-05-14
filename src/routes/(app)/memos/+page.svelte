<script lang="ts">
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	type MemoRow = {
		id: string;
		shipout_id: string;
		title: string;
		content: string;
		author_name: string;
		created_at: string;
		shipouts: {
			id: string;
			created_at: string;
			client_id: string;
			factory_id: string;
			clients: { id: string; name: string } | null;
		} | null;
	};

	type ShipoutRow = {
		id: string;
		created_at: string;
		client_id: string;
		clients: { id: string; name: string } | null;
	};

	let { data }: { data: PageData & { memos: MemoRow[]; shipouts: ShipoutRow[] } } = $props();

	// PageData & 로 타입 확장했으니 직접 접근 가능
	const memos     = $derived(data.memos ?? []);
	const shipouts  = $derived(data.shipouts ?? []);

	// ── 검색 / 필터 ──
	let searchQuery  = $state('');
	let filterShipout = $state('all');

	const filteredMemos = $derived(
		memos.filter(m => {
			const matchShipout = filterShipout === 'all' || m.shipout_id === filterShipout;
			const q = searchQuery.toLowerCase();
			const matchSearch = !q ||
				m.title.toLowerCase().includes(q) ||
				m.content.toLowerCase().includes(q) ||
				m.author_name.toLowerCase().includes(q) ||
				(m.shipouts?.clients?.name ?? '').toLowerCase().includes(q);
			return matchShipout && matchSearch;
		})
	);

	// ── 날짜 포맷 ──
	function fmtDate(s: string) {
		const d = new Date(s);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
	function fmtShipoutLabel(s: ShipoutRow) {
		const clientName = s.clients?.name ?? '미확인';
		const d = new Date(s.created_at);
		return `${clientName} — ${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
	}

	// ── 메모 상세 모달 ──
	let viewingMemo = $state<MemoRow | null>(null);

	// ── 메모 작성 모달 (테스트용) ──
	let showWriteModal   = $state(false);
	let writeShipoutId   = $state('');
	let writeTitle       = $state('');
	let writeContent     = $state('');
	let writeAuthor      = $state('');
	let writeSubmitting  = $state(false);
	let writeError       = $state('');

	function openWriteModal() {
		writeShipoutId  = shipouts[0]?.id ?? '';
		writeTitle      = '';
		writeContent    = '';
		writeAuthor     = '';
		writeError      = '';
		showWriteModal  = true;
	}

	// ── 삭제 확인 ──
	let deleteTargetId = $state<string | null>(null);
	let deleteSubmitting = $state(false);

	// ── QR 링크 복사 ──
	let copiedId = $state<string | null>(null);
	function copyQrLink(shipoutId: string) {
		const url = `${window.location.origin}/memo/${shipoutId}`;
		navigator.clipboard.writeText(url).then(() => {
			copiedId = shipoutId;
			setTimeout(() => { copiedId = null; }, 2000);
		});
	}
</script>

<div class="min-h-full bg-base-200 px-8 py-10">

	<!-- 헤더 -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h2 class="text-2xl font-extrabold text-base-content">메모 확인</h2>
			<p class="text-sm text-base-content/50 mt-0.5">출고 건별로 실무자가 남긴 메모를 확인합니다.</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-sm gap-1.5"
			onclick={openWriteModal}
		>
			<Icon icon="lucide:plus" class="w-4 h-4" />
			테스트 메모 작성
		</button>
	</div>

	<!-- 필터 -->
	<div class="flex flex-wrap items-center gap-3 mb-5">
		<!-- 검색 -->
		<div class="relative">
			<Icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 pointer-events-none" />
			<input
				type="text"
				placeholder="제목, 내용, 작성자, 거래처 검색..."
				class="input input-bordered input-sm pl-9 w-72"
				bind:value={searchQuery}
			/>
		</div>
		<!-- 출고 건 필터 -->
		<select class="select select-bordered select-sm" bind:value={filterShipout}>
			<option value="all">전체 출고 건</option>
			{#each shipouts as s (s.id)}
				<option value={s.id}>{fmtShipoutLabel(s)}</option>
			{/each}
		</select>
		<span class="text-sm text-base-content/40 ml-auto">{filteredMemos.length}건</span>
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
							<th class="text-xs">거래처</th>
							<th class="text-xs">출고일</th>
							<th class="text-xs">제목</th>
							<th class="text-xs">작성자</th>
							<th class="text-xs">작성일시</th>
							<th class="text-xs text-center w-24">액션</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMemos as memo (memo.id)}
							<tr
								class="hover cursor-pointer"
								onclick={() => { viewingMemo = memo; }}
							>
								<td class="font-semibold text-sm">{memo.shipouts?.clients?.name ?? '—'}</td>
								<td class="text-xs text-base-content/60">
									{memo.shipouts?.created_at ? fmtDate(memo.shipouts.created_at) : '—'}
								</td>
								<td class="text-sm">{memo.title}</td>
								<td class="text-xs text-base-content/60">{memo.author_name}</td>
								<td class="text-xs text-base-content/50 whitespace-nowrap">{fmtDate(memo.created_at)}</td>
								<td onclick={(e) => e.stopPropagation()}>
									<div class="flex items-center justify-center gap-1">
										<button
											type="button"
											class="btn btn-ghost btn-xs"
											title="QR 링크 복사"
											onclick={() => copyQrLink(memo.shipout_id)}
										>
											{#if copiedId === memo.shipout_id}
												<Icon icon="lucide:check" class="w-3.5 h-3.5 text-success" />
											{:else}
												<Icon icon="lucide:link" class="w-3.5 h-3.5" />
											{/if}
										</button>
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
</div>

<!-- ───── 메모 상세 모달 ───── -->
{#if viewingMemo}
	{@const m = viewingMemo}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box w-full max-w-lg rounded-2xl p-6 flex flex-col gap-0" style="max-height: 600px;">
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
			<p class="text-xs text-base-content/40 mb-4 flex items-center gap-1">
				<Icon icon="lucide:user" class="w-3.5 h-3.5" />
				{m.author_name}
				<span class="ml-2 flex items-center gap-1">
					<Icon icon="lucide:clock" class="w-3.5 h-3.5" />
					{fmtDate(m.created_at)}
				</span>
			</p>
			<div class="divider my-0"></div>
			<div class="flex-1 overflow-y-auto py-4 text-sm text-base-content leading-relaxed whitespace-pre-wrap">
				{m.content}
			</div>
			<div class="divider my-0"></div>
			<div class="flex justify-between items-center pt-4">
				<button
					type="button"
					class="btn btn-ghost btn-sm gap-1.5 text-base-content/50"
					onclick={() => { copyQrLink(m.shipout_id); }}
				>
					<Icon icon="lucide:link" class="w-4 h-4" />
					{copiedId === m.shipout_id ? '복사됨!' : 'QR 링크 복사'}
				</button>
				<button
					type="button"
					onclick={() => { viewingMemo = null; }}
					class="btn btn-ghost btn-sm font-bold"
				>닫기</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={() => { viewingMemo = null; }}>close</button>
		</form>
	</dialog>
{/if}

<!-- ───── 테스트 메모 작성 모달 ───── -->
{#if showWriteModal}
	<dialog class="modal modal-open" aria-modal="true">
		<div class="modal-box w-full max-w-lg rounded-2xl p-6">
			<div class="flex items-center justify-between mb-5">
				<div>
					<h3 class="text-base font-extrabold">메모 작성 (테스트)</h3>
					<p class="text-xs text-base-content/40 mt-0.5">QR 없이 직접 출고 건을 선택해 메모를 남깁니다.</p>
				</div>
				<button
					type="button"
					onclick={() => { showWriteModal = false; }}
					class="btn btn-ghost btn-sm btn-circle"
				>
					<Icon icon="lucide:x" class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/addMemo"
				use:enhance={() => {
					writeSubmitting = true;
					writeError = '';
					return async ({ result, update }) => {
						writeSubmitting = false;
						if (result.type === 'failure') {
							writeError = (result.data as { error?: string })?.error ?? '오류 발생';
						} else {
							showWriteModal = false;
							await update();
						}
					};
				}}
				class="flex flex-col gap-4"
			>
				<!-- 출고 건 선택 -->
				<div class="form-control">
					<label class="label label-text text-xs font-semibold" for="write-shipout">출고 건 선택</label>
					<select
						id="write-shipout"
						name="shipout_id"
						class="select select-bordered select-sm w-full"
						bind:value={writeShipoutId}
						required
					>
						{#each shipouts as s (s.id)}
							<option value={s.id}>{fmtShipoutLabel(s)} — {s.id.slice(0,8)}...</option>
						{/each}
					</select>
				</div>

				<!-- 작성자 이름 -->
				<div class="form-control">
					<label class="label label-text text-xs font-semibold" for="write-author">작성자 이름</label>
					<input
						id="write-author"
						name="author_name"
						type="text"
						placeholder="예: 홍길동"
						class="input input-bordered input-sm w-full"
						bind:value={writeAuthor}
					/>
				</div>

				<!-- 제목 -->
				<div class="form-control">
					<label class="label label-text text-xs font-semibold" for="write-title">제목</label>
					<input
						id="write-title"
						name="title"
						type="text"
						placeholder="메모 제목"
						class="input input-bordered input-sm w-full"
						bind:value={writeTitle}
						required
					/>
				</div>

				<!-- 내용 -->
				<div class="form-control">
					<label class="label label-text text-xs font-semibold" for="write-content">내용</label>
					<textarea
						id="write-content"
						name="content"
						rows="4"
						placeholder="메모 내용을 입력하세요..."
						class="textarea textarea-bordered textarea-sm w-full resize-none"
						bind:value={writeContent}
						required
					></textarea>
				</div>

				{#if writeError}
					<p class="text-xs text-error">{writeError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => { showWriteModal = false; }}
					>취소</button>
					<button
						type="submit"
						class="btn btn-primary btn-sm gap-1.5"
						disabled={writeSubmitting}
					>
						{#if writeSubmitting}
							<span class="loading loading-spinner loading-xs"></span>
						{:else}
							<Icon icon="lucide:send" class="w-4 h-4" />
						{/if}
						저장
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={() => { showWriteModal = false; }}>close</button>
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
					<button
						type="submit"
						class="btn btn-error btn-sm gap-1.5"
						disabled={deleteSubmitting}
					>
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
