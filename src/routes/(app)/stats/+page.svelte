<script lang="ts">
	import Icon from '@iconify/svelte';
	import DatePicker from './_components/DatePicker.svelte';
	import SummaryTab from './_tabs/SummaryTab.svelte';
	import MonthlyTab from './_tabs/MonthlyTab.svelte';
	import ClientsTab from './_tabs/ClientsTab.svelte';

	import { shipments, clients } from './_lib/data';
	import { calcStats, calcMonthly, pad } from './_lib/stats';

	const NOW       = new Date('2026-05-12T00:00:00');
	const THIS_YEAR  = NOW.getFullYear();
	const THIS_MONTH = NOW.getMonth() + 1;
	const PREV_YEAR  = THIS_YEAR - 1;

	const defaultFrom = `${THIS_YEAR}-${pad(THIS_MONTH)}-01`;
	const defaultTo   = `${THIS_YEAR}-${pad(THIS_MONTH)}-${pad(new Date(THIS_YEAR, THIS_MONTH, 0).getDate())}`;

	let fromDate = $state(defaultFrom);
	let toDate   = $state(defaultTo);

	type PickerTarget = 'from' | 'to';
	let pickerOpen   = $state(false);
	let pickerTarget = $state<PickerTarget>('from');

	function openPicker(t: PickerTarget) { pickerTarget = t; pickerOpen = true; }

	function handlePickerSelect(_t: 'from' | 'to' | 'single', ymd: string) {
		if      (pickerTarget === 'from') { fromDate = ymd; if (ymd > toDate)   toDate   = ymd; }
		else if (pickerTarget === 'to')   { toDate   = ymd; if (ymd < fromDate) fromDate = ymd; }
		pickerOpen = false;
	}

	type Tab = 'summary' | 'monthly' | 'clients';
	let activeTab = $state<Tab>('summary');

	let filterClientId = $state('');
	const cid = $derived(filterClientId || undefined);

	const periodStats   = $derived(calcStats(shipments, fromDate, toDate, cid));
	const yearStats     = $derived(calcStats(shipments, `${THIS_YEAR}-01-01`, `${THIS_YEAR}-12-31`, cid));
	const prevYearStats = $derived(calcStats(shipments, `${PREV_YEAR}-01-01`, `${PREV_YEAR}-12-31`, cid));
	const trend         = $derived(calcMonthly(shipments, THIS_YEAR, cid));
	const prevTrend     = $derived(calcMonthly(shipments, PREV_YEAR, cid));
</script>

<svelte:head><title>출고 통계 | 워시데스크</title></svelte:head>

<DatePicker
	show={pickerOpen}
	target={pickerTarget === 'from' ? 'from' : 'to'}
	{fromDate}
	{toDate}
	onselect={handlePickerSelect}
	onclose={() => (pickerOpen = false)}
/>

<div class="h-full flex flex-col bg-base-200 overflow-hidden">
	<div class="shrink-0 px-5 pt-4 pb-3 bg-base-200 border-b border-base-300 flex items-center gap-4 flex-wrap">
		<div class="flex-1 min-w-0">
			<h2 class="text-sm font-extrabold text-base-content leading-tight">출고 통계</h2>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="text-[11px] text-base-content/40 font-semibold shrink-0">조회</span>
			<button type="button"
				class="btn btn-xs btn-ghost h-7 min-h-0 font-mono text-[11px] border border-base-300 px-2"
				onclick={() => openPicker('from')}>
				<Icon icon="heroicons:calendar" class="w-3.5 h-3.5 mr-1 opacity-50" />{fromDate}
			</button>
			<span class="text-base-content/30 text-xs">~</span>
			<button type="button"
				class="btn btn-xs btn-ghost h-7 min-h-0 font-mono text-[11px] border border-base-300 px-2"
				onclick={() => openPicker('to')}>
				{toDate}
			</button>
		</div>
		<select bind:value={filterClientId}
			class="select select-bordered select-sm h-7 min-h-0 text-xs w-32">
			<option value="">전체 거래처</option>
			{#each clients as c (c.id)}
				<option value={c.id}>{c.name}</option>
			{/each}
		</select>
		<div class="tabs tabs-boxed gap-0.5 p-0.5 bg-base-300 h-7">
			{#each ([['summary','요약'],['monthly','월별'],['clients','거래처']] as const) as [t, label] (t)}
				<button type="button"
					class="tab tab-xs h-6 text-xs font-semibold px-3 {activeTab === t ? 'tab-active' : ''}"
					onclick={() => (activeTab = t as Tab)}>{label}</button>
			{/each}
		</div>
	</div>
	<div class="flex-1 min-h-0 px-5 py-4 overflow-hidden">
		{#if activeTab === 'summary'}
			<SummaryTab stats={periodStats} {fromDate} {toDate} />
		{:else if activeTab === 'monthly'}
			<MonthlyTab {trend} prevTrend={prevTrend} year={THIS_YEAR} prevYear={PREV_YEAR} clientId={cid} {yearStats} {prevYearStats} />
		{:else if activeTab === 'clients'}
			<ClientsTab monthStats={periodStats} {yearStats} {fromDate} {toDate} year={THIS_YEAR} />
		{/if}
	</div>
</div>
