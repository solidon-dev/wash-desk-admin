<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// ── 페이지 전환 진행바 (NProgress 스타일) ──────────────────────────────────
	let navProgress = $state(0); // 0~100
	let navVisible = $state(false);
	let navOpacity = $state(1);

	let _rafId = 0;
	let _timerId: ReturnType<typeof setTimeout> | number = 0;
	let _navGeneration = 0; // 현재 항번 navigation의 고유 ID

	function startProgress() {
		cancelAnimationFrame(_rafId);
		clearTimeout(_timerId);
		_navGeneration++; // 새 navigation 시작 — 이전 complete 콜백 무효화
		navProgress = 0;
		navOpacity = 1;
		navVisible = true;

		const gen = _navGeneration;
		const start = performance.now();
		const phase1Duration = 400;

		function phase1(now: number) {
			if (gen !== _navGeneration) return; // 뒤늘린 navigation이면 중단
			const elapsed = now - start;
			const t = Math.min(elapsed / phase1Duration, 1);
			navProgress = 80 * (1 - Math.pow(1 - t, 3));
			if (t < 1) {
				_rafId = requestAnimationFrame(phase1);
			} else {
				startCrawl(gen);
			}
		}
		_rafId = requestAnimationFrame(phase1);
	}

	function startCrawl(gen: number) {
		function crawl() {
			if (gen !== _navGeneration) return;
			if (navProgress < 90) navProgress += (90 - navProgress) * 0.03;
			_rafId = requestAnimationFrame(crawl);
		}
		_rafId = requestAnimationFrame(crawl);
	}

	function completeProgress() {
		const gen = _navGeneration; // 이 시점의 generation 고정
		cancelAnimationFrame(_rafId);
		clearTimeout(_timerId);
		navProgress = 100;
		_timerId = setTimeout(() => {
			if (gen !== _navGeneration) return; // 그 사이 또 navigate 시작되면 콜백 무시
			navOpacity = 0;
			_timerId = setTimeout(() => {
				if (gen !== _navGeneration) return;
				navVisible = false;
				navProgress = 0;
				navOpacity = 1;
			}, 300);
		}, 150);
	}

	afterNavigate(() => {
		completeProgress();
		window.scrollTo({ top: 0 });
		sidebarOpen = false;
	});

	beforeNavigate(() => {
		startProgress();
	});

	import Icon from '@iconify/svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';
	import { logout } from '$lib/api/auth';
	import type { LayoutData } from './$types';

	type FactoryItem = { id: string; name: string };
	type Props = {
		children: import('svelte').Snippet;
		data: LayoutData & {
			factories: FactoryItem[];
			role: string;
			user: { email?: string } | null;
			memoCount: number;
		};
	};
	let { children, data }: Props = $props();

	const role = $derived(data.role as 'super_admin' | 'factory_admin');
	const roleLabel = $derived(role === 'super_admin' ? '최고관리자' : '공장관리자');
	const roleBadgeClass = $derived(role === 'super_admin' ? 'badge-warning' : 'badge-primary');

	// 서버에서 받은 공장 목록
	const factories = $derived(data.factories);
	let selectedFactoryId = $state<string | null>(null);

	// 첫 로드 시 첫 번째 공장 자동 선택
	$effect(() => {
		if (!selectedFactoryId && factories.length > 0) {
			selectedFactoryId = factories[0].id;
		}
	});

	const selectedFactory = $derived(
		factories.find((f) => f.id === selectedFactoryId) ?? factories[0] ?? null
	);

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const apply = (dark: boolean) =>
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		apply(mq.matches);
		mq.addEventListener('change', (e) => apply(e.matches));
	});

	async function handleLogout() {
		showLogoutModal = false;
		await logout();
		goto('/');
	}

	const navItems = $derived([
		{ icon: 'lucide:building-2', label: '거래처 관리', path: '/clients', exact: true },
		{ icon: 'lucide:users', label: '사용자 관리', path: '/users', exact: false },
		...(role === 'super_admin'
			? [{ icon: 'lucide:factory', label: '세탁공장 관리', path: '/factories', exact: false }]
			: []),
		{ icon: 'lucide:package', label: '상품 관리', path: '/products', exact: false },
		{ icon: 'lucide:receipt', label: '청구서 관리', path: '/billing', exact: false },
		{ icon: 'lucide:bar-chart-2', label: '입출고 · 통계', path: '/stats', exact: false },
		{ icon: 'lucide:message-square', label: '메모 확인', path: '/memos', exact: false, badge: true }
	]);

	function isActive(nav: { path: string; exact: boolean }): boolean {
		const pathname = page.url.pathname;
		if (nav.exact) return pathname === '/clients' || pathname === nav.path;
		return pathname === nav.path || pathname.startsWith(nav.path + '/');
	}

	const unreadMemoCount = $derived(data.memoCount ?? 0);

	let factoryOpen = $state(false);
	let sidebarOpen = $state(false);
	const currentNav = $derived(navItems.find((n) => isActive(n)));
	let showLogoutModal = $state(false);

	function confirmLogout() {
		handleLogout();
	}
</script>

<svelte:head><link rel="icon" href="/favicon.svg" /></svelte:head>

<div class="flex h-screen overflow-hidden">
	<!-- ── 사이드바 (lg 이상 항상 표시 / lg 미만 오버레이) ── -->

	<!-- 모바일 오버레이 배경 -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-30 bg-black/40 lg:hidden"
			role="presentation"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<aside
		class="bg-base-200 border-base-300 fixed inset-y-0 left-0 z-40 flex
			w-56 shrink-0 flex-col
			border-r transition-transform duration-300 lg:relative lg:flex lg:translate-x-0
			{sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
	>
		<!-- 공장 셀렉터 -->
		<div class="border-base-300 shrink-0 border-b px-3 py-3">
			{#if role === 'super_admin'}
				<button
					class="btn btn-ghost w-full justify-start gap-2.5 rounded-xl px-3 py-2.5 text-left normal-case"
					onclick={() => {
						factoryOpen = true;
					}}
				>
					<div class="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Icon icon="lucide:factory" class="text-primary-content h-4 w-4" />
					</div>
					<div class="min-w-0 flex-1">
						<p
							class="text-base-content/50 mb-0.5 truncate text-[10px] leading-none font-bold tracking-wider uppercase"
						>
							FACTORY
						</p>
						<p class="text-base-content truncate text-sm leading-tight font-bold">
							{selectedFactory?.name ?? '공장 선택'}
						</p>
					</div>
					<Icon icon="lucide:chevrons-up-down" class="text-base-content/50 h-4 w-4 shrink-0" />
				</button>
			{:else}
				<div class="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
					<div class="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Icon icon="lucide:factory" class="text-primary-content h-4 w-4" />
					</div>
					<div class="min-w-0 flex-1">
						<p
							class="text-base-content/50 mb-0.5 truncate text-[10px] leading-none font-bold tracking-wider uppercase"
						>
							FACTORY
						</p>
						<p class="text-base-content truncate text-sm leading-tight font-bold">
							{selectedFactory?.name ?? '—'}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- 네비게이션 메뉴 -->
		<nav class="flex-1 overflow-y-auto">
			<ul class="flex w-full flex-col gap-0.5 px-2 py-2">
				{#each navItems as nav (nav.path)}
					<li>
						<a
							href={nav.path}
							class="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150
								{isActive(nav)
								? 'bg-primary text-primary-content'
								: 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}"
						>
							<Icon icon={nav.icon} class="h-5 w-5 shrink-0" />
							<span class="flex-1 text-left">{nav.label}</span>
							{#if nav.badge && unreadMemoCount > 0}
								<span class="badge badge-error badge-sm font-bold">{unreadMemoCount}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- 접속자 정보 -->
		<div class="border-base-300 shrink-0 border-t px-3 py-3">
			<div class="flex items-center gap-2.5 px-1">
				<div
					class="bg-base-content/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
				>
					<Icon icon="lucide:user" class="text-base-content/50 h-4 w-4" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-base-content/70 truncate text-xs leading-tight font-semibold">
						{data.user?.email?.replace('@mail.com', '') ?? '—'}
					</p>
					<span class="badge badge-xs mt-0.5 font-bold {roleBadgeClass}">{roleLabel}</span>
				</div>
			</div>
		</div>

		<!-- 로그아웃 버튼 -->
		<div class="border-base-300 shrink-0 border-t px-2 py-2">
			<button
				type="button"
				onclick={() => (showLogoutModal = true)}
				class="text-base-content/60 hover:bg-base-content/5 hover:text-base-content flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150"
			>
				<Icon icon="lucide:log-out" class="h-5 w-5 shrink-0" />
				<span class="flex-1 text-left">로그아웃</span>
			</button>
		</div>
	</aside>

	<!-- 공장 선택 모달 -->
	{#if factoryOpen}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			role="presentation"
			onclick={() => (factoryOpen = false)}
		>
			<div
				class="bg-base-100 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
				style="width: 340px; height: 420px;"
				role="dialog"
				aria-modal="true"
				aria-label="공장 선택"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && (factoryOpen = false)}
			>
				<!-- 헤더 -->
				<div class="border-base-300 flex shrink-0 items-center justify-between border-b px-5 py-4">
					<div>
						<h2 class="text-base-content text-sm font-bold">공장 선택</h2>
						<p class="text-base-content/40 mt-0.5 text-xs">사용할 공장을 선택하세요</p>
					</div>
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-square"
						onclick={() => (factoryOpen = false)}
					>
						<Icon icon="lucide:x" class="h-4 w-4" />
					</button>
				</div>

				<!-- 검색바 -->
				<div class="shrink-0 px-4 py-3">
					<SearchBar
						placeholder="공장 검색..."
						items={factories.map((f) => ({ id: f.id, label: f.name }))}
						onselect={(id) => {
							if (id) {
								selectedFactoryId = id;
								factoryOpen = false;
							}
						}}
					/>
				</div>

				<!-- 공장 리스트 (고정 높이 스크롤) -->
				<ul class="flex-1 overflow-y-auto px-3 pb-3">
					{#each factories as factory (factory.id)}
						<li>
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors
									{factory.id === selectedFactoryId
									? 'bg-primary/10 text-primary font-semibold'
									: 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'}"
								onclick={() => {
									selectedFactoryId = factory.id;
									factoryOpen = false;
								}}
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
									{factory.id === selectedFactoryId
										? 'bg-primary/20 text-primary'
										: 'bg-base-content/5 text-base-content/40'}"
								>
									<Icon icon="lucide:factory" class="h-4 w-4" />
								</div>
								<span class="flex-1 truncate text-left">{factory.name}</span>
								{#if factory.id === selectedFactoryId}
									<Icon icon="lucide:check" class="text-primary h-4 w-4 shrink-0" />
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- 로그아웃 확인 모달 -->
	{#if showLogoutModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			role="presentation"
			onclick={() => (showLogoutModal = false)}
		>
			<div
				class="bg-base-100 flex w-80 flex-col gap-4 rounded-2xl p-6 shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="logout-title"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && (showLogoutModal = false)}
			>
				<div class="flex flex-col gap-1">
					<h2 id="logout-title" class="text-base-content text-base font-bold">로그아웃</h2>
					<p class="text-base-content/60 text-sm">정말 로그아웃 하시겠습니까?</p>
				</div>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => (showLogoutModal = false)}>취소</button
					>
					<button type="button" class="btn btn-error btn-sm" onclick={confirmLogout}
						>로그아웃</button
					>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── 페이지 전환 로딩 바 (NProgress 스타일) ── -->
	{#if navVisible}
		<div class="nav-progress-bar">
			<div class="bar bg-primary" style="width: {navProgress}%; opacity: {navOpacity};"></div>
		</div>
	{/if}

	<!-- ── 우측 영역 ── -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- 모바일 topbar (lg 미만에서만) -->
		<header
			class="bg-base-200 border-base-300 flex shrink-0 items-center gap-3 border-b px-4 py-3 lg:hidden"
		>
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="btn btn-ghost btn-sm btn-square"
				aria-label="메뉴 열기"
			>
				<Icon icon="lucide:menu" class="h-5 w-5" />
			</button>

			<!-- 공장 아이콘 + 현재 페이지명 -->
			<div class="flex min-w-0 items-center gap-2">
				<div class="bg-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
					<Icon icon="lucide:factory" class="text-primary-content h-3.5 w-3.5" />
				</div>
				<span class="text-base-content/50 truncate text-xs font-bold"
					>{selectedFactory?.name ?? ''}</span
				>
				<span class="text-base-content/30 text-xs">/</span>
				<span class="text-base-content truncate text-sm font-bold">{currentNav?.label ?? ''}</span>
			</div>

			<div class="flex-1"></div>

			<!-- 미읽음 메모 배지 -->
			{#if unreadMemoCount > 0}
				<a href="/memos" class="btn btn-ghost btn-sm btn-square relative" aria-label="메모 확인">
					<Icon icon="lucide:message-square" class="h-5 w-5" />
					<span class="badge badge-error badge-xs absolute -top-0.5 -right-0.5 font-bold"
						>{unreadMemoCount}</span
					>
				</a>
			{/if}
		</header>

		<!-- 콘텐츠 -->
		<main class="bg-base-200 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>

<!-- 전역 모달 렌더러 (항상 하나만 렌더링) -->
<ModalShell />
