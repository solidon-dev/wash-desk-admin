<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { modal, SearchBar, Pagination, TableCard, createListStore } from '$lib';
	import { submitAction } from '$lib/utils/action';
	import type { PageData } from './$types';
	import { formatPhone, displayPhone } from '$lib/utils/phone';

	// ── 타입 ──
	type UserRole = 'super_admin' | 'factory_admin' | 'worker';
	type UserRow = {
		id: string;
		full_name: string | null;
		username: string;
		phone: string | null;
		role: string;
		factory_id: string | null;
		factory_name: string | null;
		created_at: string;
		deleted_at: string | null;
	};
	type Props = {
		data: PageData & {
			users: UserRow[];
			total: number;
			page: number;
			PAGE_SIZE: number;
			showDeleted: boolean;
			q: string;
			allFactories: { id: string; name: string }[];
			role: string;
			factory_id: string | null;
		};
	};
	let { data }: Props = $props();

	// ── $derived ──
	const myRole = $derived(data.role as UserRole);
	const myFactoryId = $derived(data.factory_id as string | null);
	const factories = $derived(data.allFactories);
	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.PAGE_SIZE)));

	const roleLabel: Record<UserRole, string> = {
		super_admin: '최고관리자',
		factory_admin: '공장관리자',
		worker: '실무자'
	};
	const roleBadge: Record<UserRole, string> = {
		super_admin: 'badge-warning',
		factory_admin: 'badge-primary',
		worker: 'badge-ghost'
	};

	// ── createListStore ──
	const list = createListStore(() => data.users);

	// ── 헬퍼 ──
	function canEdit(u: UserRow) {
		if (myRole === 'super_admin') return true;
		if (myRole === 'factory_admin') return u.factory_id === myFactoryId;
		return false;
	}

	function formatDate(iso: string) {
		return iso.slice(0, 10);
	}

	async function navTo(params: { q?: string; page?: number; hidden?: boolean }) {
		const q = params.q ?? data.q;
		const page = params.page ?? 1;
		const hidden = params.hidden ?? data.showDeleted;
		const parts: string[] = [];
		if (q) parts.push(`q=${encodeURIComponent(q)}`);
		if (hidden) parts.push('hidden=1');
		if (page > 1) parts.push(`page=${page}`);
		await goto(parts.length ? `?${parts.join('&')}` : '?');
	}

	const searchItems = $derived(
		data.users.map((u) => ({ id: u.id, label: u.full_name ?? u.username, sub: u.username }))
	);

	// ── UI 상태 ──
	let editingUser = $state<UserRow | null>(null);
	let formName = $state('');
	let formUsername = $state('');
	let formPassword = $state('');
	let formPasswordConf = $state('');
	let formRole = $state<UserRole>('worker');
	let formFactoryId = $state('');
	let formPhone = $state('');
	let showPassword = $state(false);
	let showPasswordConf = $state(false);

	const passwordMismatch = $derived(
		formPasswordConf.length > 0 && formPassword !== formPasswordConf
	);

	// ── 에러 모달 ──
	let errorMessage = $state('');
	function showErrorModal(message?: string) {
		errorMessage =
			message ?? '업데이트에 실패했습니다. 같은 문제가 반복된다면 관리자에게 문의해 주세요.';
		modal.open(errorContent);
	}

	// ── 모달 열기 ──
	function openAdd() {
		editingUser = null;
		formName = '';
		formUsername = '';
		formPassword = '';
		formPasswordConf = '';
		formRole = 'worker';
		formFactoryId = myRole === 'factory_admin' ? (myFactoryId ?? '') : (factories[0]?.id ?? '');
		formPhone = '';
		showPassword = false;
		showPasswordConf = false;
		modal.open(userFormModal);
	}

	function openEdit(u: UserRow) {
		editingUser = u;
		formName = u.full_name ?? '';
		formUsername = u.username;
		formPassword = '';
		formPasswordConf = '';
		formRole = (u.role as UserRole) ?? 'worker';
		formFactoryId = u.factory_id ?? '';
		formPhone = u.phone ? displayPhone(u.phone) : '';
		showPassword = false;
		showPasswordConf = false;
		modal.open(userFormModal);
	}

	// ── handleSave ──
	async function handleSave() {
		if (!formName.trim()) {
			showErrorModal('이름을 입력해주세요.');
			return;
		}
		if (!editingUser && (!formPassword || passwordMismatch)) {
			showErrorModal('비밀번호를 확인해주세요.');
			return;
		}

		const payload: Record<string, string> = {
			full_name: formName.trim(),
			phone: formPhone,
			role: formRole,
			factory_id: formFactoryId
		};

		if (editingUser) {
			payload.id = editingUser.id;
			const prev = data.users.find((u) => u.id === editingUser!.id);
			const optimistic: UserRow = {
				...(prev ?? editingUser),
				full_name: formName.trim(),
				phone: formPhone || null,
				role: formRole,
				factory_id: formFactoryId || null,
				factory_name:
					factories.find((f) => f.id === formFactoryId)?.name ?? prev?.factory_name ?? null
			};
			list.override(editingUser.id, optimistic);
			modal.close();

			const saved = await submitAction<UserRow>('update', payload, {
				responseKey: 'user',
				onRollback: () => list.clear(editingUser!.id),
				onError: showErrorModal
			});
			list.clear(editingUser.id);
			if (saved) list.override(saved.id, { ...saved, username: prev?.username ?? '' });
		} else {
			payload.username = formUsername;
			payload.password = formPassword;
			modal.close();
			await submitAction('create', payload, {
				onError: showErrorModal,
				revalidate: true
			});
		}
	}

	// ── handleDeactivate ──
	async function handleDeactivate() {
		if (!editingUser) return;
		const id = editingUser.id;
		const prev = data.users.find((u) => u.id === id);
		list.override(id, { ...(prev ?? editingUser), deleted_at: new Date().toISOString() });
		modal.close();
		const saved = await submitAction<UserRow>(
			'deactivate',
			{ id },
			{
				responseKey: 'user',
				onRollback: () => list.clear(id),
				onError: showErrorModal
			}
		);
		list.clear(id);
		if (saved) list.override(id, { ...saved, username: prev?.username ?? '' });
	}

	// ── handleActivate ──
	async function handleActivate() {
		if (!editingUser) return;
		const id = editingUser.id;
		const prev = data.users.find((u) => u.id === id);
		list.override(id, { ...(prev ?? editingUser), deleted_at: null });
		modal.close();
		const saved = await submitAction<UserRow>(
			'activate',
			{ id },
			{
				responseKey: 'user',
				onRollback: () => list.clear(id),
				onError: showErrorModal
			}
		);
		list.clear(id);
		if (saved) list.override(id, { ...saved, username: prev?.username ?? '' });
	}
</script>

<!-- ── 에러 모달 snippet ── -->
{#snippet errorContent()}
	<div class="modal-box max-w-sm rounded-2xl p-6">
		<div class="flex items-start gap-3">
			<Icon icon="lucide:circle-alert" class="text-error mt-0.5 h-5 w-5 shrink-0" />
			<div class="flex-1">
				<h3 class="mb-1 text-base font-bold">오류</h3>
				<p class="text-base-content/70 text-sm">{errorMessage}</p>
			</div>
		</div>
		<div class="modal-action mt-4">
			<button onclick={modal.close} class="btn btn-sm btn-ghost font-bold">확인</button>
		</div>
	</div>
{/snippet}

<!-- ── 사용자 등록/수정 모달 snippet ── -->
{#snippet userFormModal()}
	<div class="modal-box flex w-full max-w-lg flex-col rounded-2xl p-6" style="max-height: 620px;">
		<!-- 헤더 -->
		<div class="mb-5 flex shrink-0 items-center justify-between">
			<div class="flex items-center gap-2">
				<h3 class="text-lg font-extrabold">{editingUser ? '사용자 수정' : '사용자 등록'}</h3>
				{#if editingUser?.deleted_at}
					<span class="badge badge-sm badge-error gap-1">
						<Icon icon="lucide:ban" class="h-3 w-3" />비활성화
					</span>
				{/if}
			</div>
			<button onclick={modal.close} class="btn btn-ghost btn-sm btn-circle">
				<Icon icon="lucide:x" class="h-5 w-5" />
			</button>
		</div>

		<!-- 폼 필드 영역 -->
		<div class="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
			<!-- 이름 + 아이디 -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="fName" class="label pb-1">
						<span class="label-text text-base-content/60 text-xs font-bold">이름</span>
					</label>
					<input
						id="fName"
						type="text"
						bind:value={formName}
						placeholder="홍길동"
						class="input input-bordered w-full text-sm"
					/>
				</div>
				<div>
					<label for="fUsername" class="label pb-1">
						<span class="label-text text-base-content/60 text-xs font-bold">
							아이디
							{#if editingUser}<span class="text-base-content/30 font-normal">(변경 불가)</span
								>{/if}
						</span>
					</label>
					{#if editingUser}
						<input
							id="fUsername"
							type="text"
							value={formUsername}
							class="input input-bordered w-full text-sm opacity-50"
							disabled
						/>
					{:else}
						<input
							id="fUsername"
							type="text"
							bind:value={formUsername}
							placeholder="user_id"
							class="input input-bordered w-full text-sm"
						/>
					{/if}
				</div>
			</div>

			<!-- 비밀번호 -->
			{#if editingUser}
				<!-- 수정 시: 비밀번호 변경 섹션 -->
				<div class="border-base-300 flex flex-col gap-3 rounded-xl border p-4">
					<p class="text-base-content/50 text-xs font-bold tracking-wider uppercase">
						비밀번호 변경 (선택)
					</p>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="pw-new" class="label pb-1">
								<span class="label-text text-base-content/60 text-xs font-bold">새 비밀번호</span>
							</label>
							<div class="relative">
								<input
									id="pw-new"
									type={showPassword ? 'text' : 'password'}
									bind:value={formPassword}
									placeholder="비밀번호 입력"
									autocomplete="new-password"
									class="input input-bordered w-full pr-9 text-sm"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="text-base-content/40 hover:text-base-content/70 absolute top-1/2 right-3 -translate-y-1/2"
								>
									<Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="h-4 w-4" />
								</button>
							</div>
						</div>
						<div>
							<label for="pw-conf" class="label pb-1">
								<span class="label-text text-base-content/60 text-xs font-bold">
									확인
									{#if passwordMismatch}<span class="text-error ml-1">불일치</span>{/if}
								</span>
							</label>
							<div class="relative">
								<input
									id="pw-conf"
									type={showPasswordConf ? 'text' : 'password'}
									bind:value={formPasswordConf}
									placeholder="다시 입력"
									autocomplete="new-password"
									class="input input-bordered w-full pr-9 text-sm {passwordMismatch
										? 'input-error'
										: ''}"
								/>
								<button
									type="button"
									onclick={() => (showPasswordConf = !showPasswordConf)}
									class="text-base-content/40 hover:text-base-content/70 absolute top-1/2 right-3 -translate-y-1/2"
								>
									<Icon icon={showPasswordConf ? 'lucide:eye-off' : 'lucide:eye'} class="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
					{#if formPassword}
						<button
							type="button"
							disabled={passwordMismatch || !formPassword}
							onclick={async () => {
								if (!formPassword || passwordMismatch || !editingUser) return;
								const ok = await submitAction(
									'setPassword',
									{
										id: editingUser.id,
										password: formPassword
									},
									{ onError: showErrorModal }
								);
								if (ok) {
									formPassword = '';
									formPasswordConf = '';
								}
							}}
							class="btn btn-sm btn-outline btn-primary self-start font-bold disabled:opacity-50"
							>비밀번호 변경</button
						>
					{/if}
				</div>
			{:else}
				<!-- 등록 시: 비밀번호 필수 -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="cPw" class="label pb-1">
							<span class="label-text text-base-content/60 text-xs font-bold">비밀번호</span>
						</label>
						<div class="relative">
							<input
								id="cPw"
								type={showPassword ? 'text' : 'password'}
								bind:value={formPassword}
								placeholder="비밀번호 입력"
								autocomplete="new-password"
								class="input input-bordered w-full pr-9 text-sm"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="text-base-content/40 hover:text-base-content/70 absolute top-1/2 right-3 -translate-y-1/2"
							>
								<Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="h-4 w-4" />
							</button>
						</div>
					</div>
					<div>
						<label for="cPwConf" class="label pb-1">
							<span class="label-text text-base-content/60 text-xs font-bold">
								비밀번호 확인
								{#if passwordMismatch}<span class="text-error ml-1">불일치</span>{/if}
							</span>
						</label>
						<div class="relative">
							<input
								id="cPwConf"
								type={showPasswordConf ? 'text' : 'password'}
								bind:value={formPasswordConf}
								placeholder="다시 입력"
								autocomplete="new-password"
								class="input input-bordered w-full pr-9 text-sm {passwordMismatch
									? 'input-error'
									: ''}"
							/>
							<button
								type="button"
								onclick={() => (showPasswordConf = !showPasswordConf)}
								class="text-base-content/40 hover:text-base-content/70 absolute top-1/2 right-3 -translate-y-1/2"
							>
								<Icon icon={showPasswordConf ? 'lucide:eye-off' : 'lucide:eye'} class="h-4 w-4" />
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- 역할 + 공장 -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="label-text text-base-content/60 mb-2 text-xs font-bold">역할</p>
					{#if myRole === 'super_admin'}
						<div class="flex gap-1.5">
							{#each ['factory_admin', 'worker'] as UserRole[] as r (r)}
								<button
									type="button"
									onclick={() => (formRole = r)}
									class="btn btn-sm flex-1 font-bold {formRole === r
										? 'btn-primary'
										: 'btn-outline btn-ghost'}"
								>
									{roleLabel[r]}
								</button>
							{/each}
						</div>
					{:else}
						<div class="input input-bordered flex h-10 items-center px-3 text-sm opacity-50">
							실무자
						</div>
					{/if}
				</div>
				<div>
					<label for="fFactory" class="label pb-1">
						<span class="label-text text-base-content/60 text-xs font-bold">공장</span>
					</label>
					{#if myRole === 'super_admin'}
						<select
							id="fFactory"
							bind:value={formFactoryId}
							class="select select-bordered w-full text-sm"
						>
							<option value="">공장 선택</option>
							{#each factories as f (f.id)}
								<option value={f.id}>{f.name}</option>
							{/each}
						</select>
					{:else}
						{@const myFactory = factories.find((f) => f.id === myFactoryId)}
						<div class="input input-bordered flex h-10 items-center px-3 text-sm opacity-50">
							{myFactory?.name ?? '-'}
						</div>
					{/if}
				</div>
			</div>

			<!-- 연락처 -->
			<div>
				<label for="fPhone" class="label pb-1">
					<span class="label-text text-base-content/60 text-xs font-bold"
						>연락처 <span class="text-base-content/30 font-normal">(선택)</span></span
					>
				</label>
				<input
					id="fPhone"
					type="text"
					value={formPhone}
					oninput={(e) => {
						formPhone = formatPhone((e.target as HTMLInputElement).value);
					}}
					placeholder="010-0000-0000"
					maxlength="13"
					class="input input-bordered w-full text-sm"
				/>
			</div>
		</div>

		<!-- 하단 버튼 -->
		<div class="modal-action border-base-200 mt-5 flex shrink-0 justify-between border-t pt-4">
			<div>
				{#if editingUser && myRole === 'super_admin'}
					{#if editingUser.deleted_at}
						<button onclick={handleActivate} class="btn btn-sm btn-success gap-1.5 font-bold">
							<Icon icon="lucide:circle-check" class="h-4 w-4" />활성화
						</button>
					{:else}
						<button
							onclick={handleDeactivate}
							class="btn btn-sm btn-error btn-outline gap-1.5 font-bold"
						>
							<Icon icon="lucide:ban" class="h-4 w-4" />비활성화
						</button>
					{/if}
				{/if}
			</div>
			<div class="flex gap-2">
				<button onclick={modal.close} class="btn btn-ghost font-bold">취소</button>
				<button onclick={handleSave} disabled={passwordMismatch} class="btn btn-primary font-bold">
					{editingUser ? '저장' : '등록'}
				</button>
			</div>
		</div>
	</div>
{/snippet}

<div class="bg-base-200 min-h-full px-8 py-10">
	<h2 class="text-base-content mb-5 text-2xl font-extrabold">사용자 관리</h2>

	<div class="mb-5 flex flex-wrap items-center gap-3">
		<SearchBar
			items={searchItems}
			initialValue={data.q}
			placeholder="이름으로 검색"
			onselect={(id) => {
				const u = data.users.find((u) => u.id === id);
				if (u) navTo({ q: u.full_name ?? u.username });
			}}
			onenter={(q) => navTo({ q })}
		/>
		<label
			class="text-base-content/60 flex cursor-pointer items-center gap-2 text-sm font-semibold select-none"
		>
			<input
				type="checkbox"
				checked={data.showDeleted}
				onchange={(e) => navTo({ hidden: (e.target as HTMLInputElement).checked })}
				class="checkbox checkbox-sm"
			/>
			비활성화 포함
		</label>
		{#if myRole === 'super_admin' || myRole === 'factory_admin'}
			<button
				onclick={openAdd}
				class="btn btn-primary btn-sm ml-auto w-full gap-2 whitespace-nowrap sm:w-auto"
			>
				<Icon icon="lucide:plus" class="h-4 w-4" />
				사용자 등록
			</button>
		{/if}
	</div>

	<TableCard>
		<table class="table-sm table w-full">
			<thead class="bg-base-200 text-base-content/60">
				<tr>
					<th class="text-xs font-bold">이름</th>
					<th class="hidden text-xs font-bold lg:table-cell">역할</th>
					<th class="hidden text-xs font-bold lg:table-cell">아이디</th>
					<th class="hidden text-xs font-bold lg:table-cell">공장</th>
					<th class="hidden text-xs font-bold lg:table-cell">연락처</th>
					<th class="hidden text-xs font-bold whitespace-nowrap lg:table-cell">등록일</th>
					<th class="text-center text-xs font-bold whitespace-nowrap">관리</th>
				</tr>
			</thead>
			<tbody>
				{#if list.items.length === 0}
					<tr>
						<td colspan="7" class="text-base-content/40 py-16 text-center text-sm">
							<Icon icon="lucide:users" class="mx-auto mb-2 h-8 w-8 opacity-30" />
							등록된 사용자가 없습니다.
						</td>
					</tr>
				{:else}
					{#each list.items as user (user.id)}
						{@const isDeleted = user.deleted_at !== null}
						{@const role = user.role as UserRole}
						<tr class="hover:bg-base-200 transition-colors {isDeleted ? 'opacity-40' : ''}">
							<td class="text-base-content font-semibold">
								<span>{user.full_name ?? '-'}</span>
								<div class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 lg:hidden">
									<span class="badge badge-xs font-bold {roleBadge[role] ?? 'badge-ghost'}"
										>{roleLabel[role] ?? role}</span
									>
									<span class="text-base-content/50 font-mono text-xs">{user.username}</span>
									{#if user.factory_name}<span class="text-base-content/40 text-xs"
											>{user.factory_name}</span
										>{/if}
									{#if user.phone}<span class="text-base-content/40 text-xs"
											>{displayPhone(user.phone)}</span
										>{/if}
									<span class="text-base-content/30 text-xs">{formatDate(user.created_at)}</span>
								</div>
							</td>
							<td class="hidden lg:table-cell">
								<span class="badge badge-sm font-bold {roleBadge[role] ?? 'badge-ghost'}"
									>{roleLabel[role] ?? role}</span
								>
							</td>
							<td class="text-base-content/70 hidden font-mono text-sm lg:table-cell"
								>{user.username}</td
							>
							<td class="text-base-content/70 hidden text-sm lg:table-cell"
								>{user.factory_name ?? '-'}</td
							>
							<td class="text-base-content/70 hidden text-sm lg:table-cell"
								>{user.phone ? displayPhone(user.phone) : '-'}</td
							>
							<td class="text-base-content/50 hidden text-xs whitespace-nowrap lg:table-cell"
								>{formatDate(user.created_at)}</td
							>
							<td class="text-center">
								{#if canEdit(user)}
									<button
										onclick={() => openEdit(user)}
										class="btn btn-ghost btn-xs text-primary font-semibold">수정</button
									>
								{:else}
									<span class="text-base-content/20 text-xs">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</TableCard>

	<div class="mt-4">
		<Pagination
			currentPage={data.page}
			{totalPages}
			totalItems={data.total}
			pageSize={data.PAGE_SIZE}
			onpage={(p) => navTo({ page: p })}
		/>
	</div>
</div>
