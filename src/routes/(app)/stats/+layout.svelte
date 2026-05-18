<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	let { data, children } = $props<{
		data: import('./$types').LayoutData;
		children: import('svelte').Snippet;
	}>();

	const tabs = [
		{ href: '/stats/overview', label: '개요', icon: 'heroicons:squares-2x2' },
		{ href: '/stats/trend', label: '추세', icon: 'heroicons:arrow-trending-up' },
		{ href: '/stats/compare', label: '비교', icon: 'heroicons:scale' },
		{ href: '/stats/clients', label: '거래처', icon: 'heroicons:building-storefront' }
	] as const;

	const currentPath = $derived(page.url.pathname);
	const currentClientId = $derived(page.url.searchParams.get('clientId') ?? '');

	function handleClientChange(e: Event) {
		const select = e.currentTarget as HTMLSelectElement;
		const clientId = select.value;
		const url = new URL(page.url);
		if (clientId) {
			url.searchParams.set('clientId', clientId);
		} else {
			url.searchParams.delete('clientId');
		}
		goto(url.pathname + url.search, { replaceState: true });
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- 헤더 -->
	<div class="bg-base-200 border-base-300 shrink-0 border-b px-5 pt-4 pb-0">
		<div class="mb-3 flex items-center justify-between gap-3">
			<!-- 타이틀 -->
			<div class="flex items-center gap-2">
				<div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
					<Icon icon="heroicons:chart-bar-square" class="text-primary h-5 w-5" />
				</div>
				<h2 class="text-base-content text-sm leading-tight font-extrabold">통계</h2>
			</div>

			<!-- 거래처 필터 -->
			<select
				class="select select-bordered select-sm h-8 min-h-0 w-40 text-xs"
				value={currentClientId}
				onchange={handleClientChange}
			>
				<option value="">전체 거래처</option>
				{#each data.clients as client (client.id)}
					<option value={client.id}>{client.name}</option>
				{/each}
			</select>
		</div>

		<!-- 탭 네비게이션 -->
		<div role="tablist" class="tabs tabs-bordered tabs-sm">
			{#each tabs as tab (tab.href)}
				{@const isActive = currentPath.startsWith(tab.href)}
				<a
					href={tab.href}
					role="tab"
					class="tab gap-1.5 text-xs font-semibold {isActive
						? 'tab-active'
						: 'text-base-content/50 hover:text-base-content/80'}"
				>
					<Icon icon={tab.icon} class="h-3.5 w-3.5" />
					{tab.label}
				</a>
			{/each}
		</div>
	</div>

	<!-- 콘텐츠 -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</div>
</div>
