<script lang="ts">
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type MemoSummary = {
		id: string;
		title: string;
		author_name: string;
		created_at: string;
	};

	const shipout = $derived(data.shipout);
	let memoList = $derived(data.memos as MemoSummary[]);

	let title = $state('');
	let content = $state('');
	let authorName = $state('');
	let submitting = $state(false);
	let submitted = $state(false);

	// 전송 성공 시 초기화
	$effect(() => {
		if (form?.success) {
			submitted = true;
			title = '';
			content = '';
		}
	});

	function fmtDate(s: string) {
		const d = new Date(s);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function writeAnother() {
		submitted = false;
	}
</script>

<svelte:head>
	<title>메모 작성 — {shipout.client_name}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="bg-base-200 flex min-h-screen flex-col items-center px-4 py-10">
	<!-- 헤더 카드 -->
	<div class="w-full max-w-md">
		<div class="card bg-base-100 mb-4 shadow-md">
			<div class="card-body px-5 py-4">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
						<Icon icon="lucide:package" class="text-primary h-5 w-5" />
					</div>
					<div>
						<p class="text-base-content/40 text-xs font-semibold tracking-wide uppercase">
							출고 건
						</p>
						<p class="text-base-content text-base font-extrabold">{shipout.client_name}</p>
						<p class="text-base-content/50 text-xs">{fmtDate(shipout.created_at)}</p>
					</div>
				</div>
			</div>
		</div>

		{#if submitted}
			<!-- 전송 완료 화면 -->
			<div class="card bg-base-100 shadow-md">
				<div class="card-body items-center gap-4 py-12 text-center">
					<div class="bg-success/10 flex h-14 w-14 items-center justify-center rounded-full">
						<Icon icon="lucide:check-circle" class="text-success h-7 w-7" />
					</div>
					<div>
						<h2 class="text-base-content text-lg font-extrabold">메모가 전송되었습니다</h2>
						<p class="text-base-content/50 mt-1 text-sm">담당자가 확인할 예정입니다.</p>
					</div>
					<button type="button" class="btn btn-primary btn-sm mt-2 gap-1.5" onclick={writeAnother}>
						<Icon icon="lucide:plus" class="h-4 w-4" />
						메모 추가 작성
					</button>
				</div>
			</div>
		{:else}
			<!-- 메모 작성 폼 -->
			<div class="card bg-base-100 shadow-md">
				<div class="card-body gap-4">
					<h2 class="text-base-content text-base font-extrabold">메모 작성</h2>

					<form
						method="POST"
						use:enhance={() => {
							submitting = true;
							return async ({ update }) => {
								submitting = false;
								await update();
							};
						}}
						class="flex flex-col gap-4"
					>
						<!-- 작성자 이름 -->
						<div class="form-control">
							<label class="label label-text text-xs font-semibold" for="author">이름 (선택)</label>
							<input
								id="author"
								name="author_name"
								type="text"
								placeholder="예: 홍길동"
								class="input input-bordered input-sm w-full"
								bind:value={authorName}
								maxlength="30"
							/>
						</div>

						<!-- 제목 -->
						<div class="form-control">
							<label class="label label-text text-xs font-semibold" for="title">
								제목 <span class="text-error">*</span>
							</label>
							<input
								id="title"
								name="title"
								type="text"
								placeholder="메모 제목을 입력하세요"
								class="input input-bordered input-sm w-full {form?.error && !title
									? 'input-error'
									: ''}"
								bind:value={title}
								required
								maxlength="100"
							/>
						</div>

						<!-- 내용 -->
						<div class="form-control">
							<label class="label label-text text-xs font-semibold" for="content">
								내용 <span class="text-error">*</span>
							</label>
							<textarea
								id="content"
								name="content"
								rows="5"
								placeholder="내용을 입력하세요..."
								class="textarea textarea-bordered textarea-sm w-full resize-none {form?.error &&
								!content
									? 'textarea-error'
									: ''}"
								bind:value={content}
								required
								maxlength="1000"
							></textarea>
							<p class="label-text-alt text-base-content/30 mt-1 text-right">
								{content.length}/1000
							</p>
						</div>

						{#if form?.error}
							<div class="alert alert-error alert-sm py-2">
								<Icon icon="lucide:alert-circle" class="h-4 w-4" />
								<span class="text-sm">{form.error}</span>
							</div>
						{/if}

						<button type="submit" class="btn btn-primary w-full gap-2" disabled={submitting}>
							{#if submitting}
								<span class="loading loading-spinner loading-sm"></span>
								전송 중...
							{:else}
								<Icon icon="lucide:send" class="h-4 w-4" />
								메모 전송
							{/if}
						</button>
					</form>
				</div>
			</div>
		{/if}

		<!-- 이전 메모 목록 -->
		{#if memoList.length > 0}
			<div class="card bg-base-100 mt-4 shadow-md">
				<div class="card-body px-5 py-4">
					<h3 class="text-base-content/60 mb-3 text-sm font-bold">
						이전 메모 ({memoList.length}건)
					</h3>
					<ul class="flex flex-col gap-2">
						{#each memoList as memo (memo.id)}
							<li class="border-base-200 rounded-lg border px-3 py-2">
								<p class="text-base-content text-sm font-semibold">{memo.title}</p>
								<p class="text-base-content/40 mt-0.5 flex items-center gap-1 text-xs">
									<Icon icon="lucide:user" class="h-3 w-3" />
									{memo.author_name}
									<span class="ml-1">{fmtDate(memo.created_at)}</span>
								</p>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}
	</div>
</div>
