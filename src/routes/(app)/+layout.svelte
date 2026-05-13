<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { session, authReady, logout } from '$lib/api/auth';

	let { children } = $props();

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const apply = (dark: boolean) =>
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		apply(mq.matches);
		mq.addEventListener('change', e => apply(e.matches));
	});

	// 세션 없으면 로그인 페이지로
	$effect(() => {
		if (authReady && !session) goto('/');
	});

	async function handleLogout() {
		showLogoutModal = false;
		await logout();
		goto('/');
	}

	afterNavigate(() => {
		window.scrollTo({ top: 0 });
		sidebarOpen = false; // 페이지 이동 시 모바일 사이드바 닫기
	});

	const navItems = [
		{ icon: 'lucide:building-2', label: '거래처 관리', path: '/clients', exact: true },
		{ icon: 'lucide:users', label: '사용자 관리', path: '/users', exact: false },
		{ icon: 'lucide:factory', label: '세탁공장 관리', path: '/factories', exact: false },
		{ icon: 'lucide:package', label: '상품 관리', path: '/products', exact: false },
		{ icon: 'lucide:receipt', label: '청구서 관리', path: '/billing', exact: false },
		{ icon: 'lucide:bar-chart-2', label: '입출고 · 통계', path: '/stats', exact: false },
		{ icon: 'lucide:message-square', label: '메모 확인', path: '/memos', exact: false, badge: true },
	];

	function isActive(nav: { path: string; exact: boolean }): boolean {
		const pathname = page.url.pathname;
		if (nav.exact) return pathname === '/clients' || pathname === nav.path;
		return pathname === nav.path || pathname.startsWith(nav.path + '/');
	}

	let factories = $state([
		{ id: 'factory-001', name: '본사 세탁공장', isHidden: false },
		{ id: 'factory-002', name: '부산 세탁공장', isHidden: false },
		{ id: 'factory-003', name: '제주 세탁공장', isHidden: false },
	]);
	let selectedFactoryId = $state('factory-001');
	const unreadMemoCount = 2;

	let factoryOpen   = $state(false);
	let sidebarOpen   = $state(false);

	const selectedFactory = $derived(
		factories.find(f => f.id === selectedFactoryId && !f.isHidden)
			?? factories.find(f => !f.isHidden)
			?? factories[0]
	);

	const currentNav = $derived(navItems.find(n => isActive(n)));

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
		class="bg-base-200 flex w-56 shrink-0 flex-col border-r border-base-300
			lg:relative lg:translate-x-0 lg:flex
			fixed inset-y-0 left-0 z-40 transition-transform duration-300
			{sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
	>
		<!-- 공장 셀렉터 -->
		<div class="border-base-300 shrink-0 border-b px-3 py-3">
			<button
				class="btn btn-ghost w-full justify-start gap-2.5 rounded-xl px-3 py-2.5 text-left normal-case"
				onclick={() => { factoryOpen = true; }}
			>
				<div class="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
					<Icon icon="lucide:factory" class="text-primary-content h-4 w-4" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-base-content/50 mb-0.5 truncate text-[10px] font-bold uppercase leading-none tracking-wider">FACTORY</p>
					<p class="text-base-content truncate text-sm font-bold leading-tight">{selectedFactory?.name ?? '공장 선택'}</p>
				</div>
				<Icon icon="lucide:chevrons-up-down" class="text-base-content/50 h-4 w-4 shrink-0" />
			</button>
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

		<!-- 로그아웃 버튼 -->
		<div class="shrink-0 border-t border-base-300 px-2 py-2">
			<button
				type="button"
				onclick={() => (showLogoutModal = true)}
				class="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-base-content/60 transition-colors duration-150 hover:bg-base-content/5 hover:text-base-content"
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
				class="bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
				style="width: 340px; height: 420px;"
				role="dialog"
				aria-modal="true"
				aria-label="공장 선택"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && (factoryOpen = false)}
			>
				<!-- 헤더 -->
				<div class="flex shrink-0 items-center justify-between border-b border-base-300 px-5 py-4">
					<div>
						<h2 class="text-sm font-bold text-base-content">공장 선택</h2>
						<p class="mt-0.5 text-xs text-base-content/40">사용할 공장을 선택하세요</p>
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
						items={factories.filter(f => !f.isHidden).map(f => ({ id: f.id, label: f.name }))}
						onselect={(id) => { if (id) { selectedFactoryId = id; factoryOpen = false; } }}
					/>
				</div>

				<!-- 공장 리스트 (고정 높이 스크롤) -->
				<ul class="flex-1 overflow-y-auto px-3 pb-3">
					{#each factories.filter(f => !f.isHidden) as factory (factory.id)}
						<li>
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors
									{factory.id === selectedFactoryId
										? 'bg-primary/10 text-primary font-semibold'
										: 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'}"
								onclick={() => { selectedFactoryId = factory.id; factoryOpen = false; }}
							>
								<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
									{factory.id === selectedFactoryId ? 'bg-primary/20 text-primary' : 'bg-base-content/5 text-base-content/40'}">
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
				class="bg-base-100 rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4"
				role="dialog"
				aria-modal="true"
				aria-labelledby="logout-title"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && (showLogoutModal = false)}
			>
				<div class="flex flex-col gap-1">
					<h2 id="logout-title" class="text-base font-bold text-base-content">로그아웃</h2>
					<p class="text-sm text-base-content/60">정말 로그아웃 하시겠습니까?</p>
				</div>
				<div class="flex gap-2 justify-end">
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => (showLogoutModal = false)}
					>취소</button>
					<button
						type="button"
						class="btn btn-error btn-sm"
						onclick={confirmLogout}
					>로그아웃</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── 우측 영역 ── -->
	<div class="flex flex-1 flex-col overflow-hidden">

		<!-- 모바일 topbar (lg 미만에서만) -->
		<header class="bg-base-200 border-b border-base-300 flex items-center gap-3 px-4 py-3 lg:hidden shrink-0">
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="btn btn-ghost btn-sm btn-square"
				aria-label="메뉴 열기"
			>
				<Icon icon="lucide:menu" class="h-5 w-5" />
			</button>

			<!-- 공장 아이콘 + 현재 페이지명 -->
			<div class="flex items-center gap-2 min-w-0">
				<div class="bg-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
					<Icon icon="lucide:factory" class="text-primary-content h-3.5 w-3.5" />
				</div>
				<span class="text-xs font-bold text-base-content/50 truncate">{selectedFactory?.name ?? ''}</span>
				<span class="text-base-content/30 text-xs">/</span>
				<span class="text-sm font-bold text-base-content truncate">{currentNav?.label ?? ''}</span>
			</div>

			<div class="flex-1"></div>

			<!-- 미읽음 메모 배지 -->
			{#if unreadMemoCount > 0}
				<a
					href="/memos"
					class="btn btn-ghost btn-sm btn-square relative"
					aria-label="메모 확인"
				>
					<Icon icon="lucide:message-square" class="h-5 w-5" />
					<span class="badge badge-error badge-xs absolute -top-0.5 -right-0.5 font-bold">{unreadMemoCount}</span>
				</a>
			{/if}
		</header>

		<!-- 콘텐츠 -->
		<main class="bg-base-200 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
