<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	let { children } = $props();

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const apply = (dark: boolean) =>
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		apply(mq.matches);
		mq.addEventListener('change', e => apply(e.matches));
	});

	afterNavigate(() => {
		window.scrollTo({ top: 0 });
	});

	const navItems = [
		{ icon: 'lucide:building-2', label: '거래처 관리', path: '/', exact: true },
		{ icon: 'lucide:users', label: '사용자 관리', path: '/users', exact: false },
		{ icon: 'lucide:package', label: '상품 관리', path: '/products', exact: false },
		{ icon: 'lucide:bar-chart-2', label: '입출고 · 통계', path: '/stats', exact: false },
		{ icon: 'lucide:receipt', label: '청구서 관리', path: '/billing', exact: false },
		{ icon: 'lucide:message-square', label: '메모 확인', path: '/memos', exact: false, badge: true },
		{ icon: 'lucide:factory', label: '세탁공장 관리', path: '/factories', exact: false },
	];

	function isActive(nav: { path: string; exact: boolean }): boolean {
		const pathname = $page.url.pathname;
		if (nav.exact) return pathname === nav.path;
		return pathname === nav.path || pathname.startsWith(nav.path + '/');
	}

	let factories = $state([
		{ id: 'factory-001', name: '본사 세탁공장', isHidden: false },
		{ id: 'factory-002', name: '부산 세탁공장', isHidden: false },
		{ id: 'factory-003', name: '제주 세탁공장', isHidden: false },
	]);
	let selectedFactoryId = $state('factory-001');
	const unreadMemoCount = 2;

	let factoryOpen = $state(false);

	const selectedFactory = $derived(
		factories.find(f => f.id === selectedFactoryId && !f.isHidden)
			?? factories.find(f => !f.isHidden)
			?? factories[0]
	);
</script>

<svelte:head><link rel="icon" href="/favicon.svg" /></svelte:head>

<div class="flex h-screen overflow-hidden">
	<!-- 사이드바 -->
	<aside class="bg-base-200 flex w-56 shrink-0 flex-col border-r border-base-300">

		<!-- 공장 셀렉터 -->
		<div class="border-base-300 relative shrink-0 border-b px-3 py-3">
			<button
				class="btn btn-ghost w-full justify-start gap-2.5 rounded-xl px-3 py-2.5 text-left normal-case"
				onclick={() => (factoryOpen = !factoryOpen)}
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

			{#if factoryOpen}
				<!-- 외부 클릭 닫기 오버레이 -->
				<div
					class="fixed inset-0 z-10"
					role="presentation"
					onclick={() => (factoryOpen = false)}
				></div>
				<!-- 드롭다운 목록 -->
				<div class="border-base-300 bg-base-100 absolute left-3 right-3 top-full z-20 mt-1 overflow-hidden rounded-xl border shadow-2xl">
					{#each factories.filter(f => !f.isHidden) as factory (factory.id)}
						<button
							class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors
								{factory.id === selectedFactoryId
									? 'bg-primary/20 text-primary'
									: 'text-base-content/70 hover:bg-base-content/10'}"
							onclick={() => { selectedFactoryId = factory.id; factoryOpen = false; }}
						>
							<Icon icon="lucide:factory" class="h-4 w-4 shrink-0 opacity-60" />
							<span class="flex-1 truncate font-medium">{factory.name}</span>
							{#if factory.id === selectedFactoryId}
								<Icon icon="lucide:check" class="text-primary h-3.5 w-3.5 shrink-0" />
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- 네비게이션 메뉴 -->
		<nav class="flex-1 overflow-y-auto">
			<ul class="menu menu-lg w-full gap-0.5 px-2 py-2">
				{#each navItems as nav (nav.path)}
					<li>
						<button
							class="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150
								{isActive(nav)
									? 'bg-base-content/10 text-base-content active'
									: 'text-base-content/50 hover:bg-base-content/5 hover:text-base-content'}"
							onclick={() => void goto(nav.path)}
						>
							<Icon icon={nav.icon} class="h-5 w-5 shrink-0" />
							<span class="flex-1 text-left">{nav.label}</span>
							{#if nav.badge && unreadMemoCount > 0}
								<span class="badge badge-error badge-sm font-bold">
									{unreadMemoCount}
								</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<!-- 우측 콘텐츠 -->
	<main class="bg-base-200 flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>
