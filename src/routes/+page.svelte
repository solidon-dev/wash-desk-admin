<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { login } from '$lib/api/auth';

	let isLoading = $state(false);
	let showPassword = $state(false);
	let errorMsg = $state('');

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const apply = (dark: boolean) =>
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		apply(mq.matches);
		mq.addEventListener('change', (e) => apply(e.matches));
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		errorMsg = '';
		isLoading = true;
		const form = e.target as HTMLFormElement;
		const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
		const password = (form.elements.namedItem('password') as HTMLInputElement).value;
		const error = await login(username, password);
		if (error) {
			errorMsg = '아이디 또는 비밀번호가 올바르지 않습니다.';
			isLoading = false;
		} else {
			goto('/clients');
		}
	}
</script>

<svelte:head>
	<title>로그인 — WASH DESK</title>
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

<div class="relative min-h-screen overflow-hidden bg-base-200 flex items-center justify-center px-4">

	<!-- 배경 장식 원 -->
	<div class="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl"></div>
	<div class="pointer-events-none absolute -bottom-40 -right-24 h-[440px] w-[440px] rounded-full bg-secondary/10 blur-3xl"></div>

	<div class="relative z-10 w-full max-w-sm">

		<!-- 로고 영역 -->
		<div class="mb-8 flex flex-col items-center gap-3">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
				<Icon icon="lucide:washing-machine" class="h-8 w-8 text-primary-content" />
			</div>
			<div class="text-center">
				<h1 class="text-3xl font-black tracking-tight text-base-content">WASH DESK</h1>
				<p class="mt-0.5 text-sm font-semibold text-base-content/40 tracking-widest uppercase">Admin System</p>
			</div>
		</div>

		<!-- 로그인 카드 -->
		<div class="card bg-base-100 shadow-2xl border border-base-300/60 rounded-3xl overflow-hidden">

			<!-- 카드 상단 컬러 바 -->
			<div class="h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent"></div>

			<div class="card-body gap-0 px-8 py-8">
				<h2 class="mb-6 text-lg font-extrabold text-base-content">로그인</h2>

				<form onsubmit={handleLogin} class="flex flex-col gap-5">

					<!-- 아이디 -->
					<div class="form-control gap-2">
						<label for="username" class="label py-0">
							<span class="label-text text-xs font-bold text-base-content/50 uppercase tracking-widest">아이디</span>
						</label>
						<label class="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all">
							<Icon icon="lucide:user" class="h-4 w-4 shrink-0 text-base-content/30" />
							<input
								id="username"
								name="username"
								type="text"
								placeholder="아이디를 입력하세요"
								autocomplete="username"
								class="grow text-sm bg-transparent outline-none placeholder:text-base-content/25"
								required
							/>
						</label>
					</div>

					<!-- 비밀번호 -->
					<div class="form-control gap-2">
						<label for="password" class="label py-0">
							<span class="label-text text-xs font-bold text-base-content/50 uppercase tracking-widest">비밀번호</span>
						</label>
						<label class="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all">
							<Icon icon="lucide:lock" class="h-4 w-4 shrink-0 text-base-content/30" />
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="비밀번호를 입력하세요"
								autocomplete="current-password"
								class="grow text-sm bg-transparent outline-none placeholder:text-base-content/25"
								required
							/>
							<button
								type="button"
								tabindex="-1"
								class="text-base-content/30 hover:text-base-content/60 transition-colors"
								onclick={() => (showPassword = !showPassword)}
								aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
							>
								<Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="h-4 w-4" />
							</button>
						</label>
					</div>

					<!-- 에러 메시지 -->
					{#if errorMsg}
						<div class="alert alert-error gap-2 rounded-xl py-3 px-4 text-sm font-semibold">
							<Icon icon="lucide:circle-alert" class="h-4 w-4 shrink-0" />
							<span>{errorMsg}</span>
						</div>
					{/if}

					<!-- 로그인 버튼 -->
					<button
						type="submit"
						class="btn btn-primary w-full rounded-xl font-extrabold text-base mt-1 shadow-md shadow-primary/20 hover:shadow-primary/40 transition-shadow"
						disabled={isLoading}
					>
						{#if isLoading}
							<span class="loading loading-spinner loading-sm"></span>
							<span>로그인 중...</span>
						{:else}
							<Icon icon="lucide:log-in" class="h-4 w-4" />
							<span>로그인</span>
						{/if}
					</button>

				</form>
			</div>
		</div>

		<!-- 하단 카피라이트 -->
		<p class="mt-6 text-center text-xs font-medium text-base-content/25">
			© 2025 WASH DESK. All rights reserved.
		</p>
	</div>
</div>
