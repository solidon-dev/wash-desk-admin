<script lang="ts">
  import DonutChart from '../_components/DonutChart.svelte';
  import BarChart from '../_components/BarChart.svelte';
  import type { Stats } from '../_lib/stats';
  import { fmtQty, fmtAmt } from '../_lib/stats';

  interface Props {
    stats: Stats;
    fromDate: string;
    toDate: string;
  }

  let { stats, fromDate, toDate }: Props = $props();

  const catTotal = $derived(stats.byCategory.reduce((s, r) => s + r.qty, 0));

  const donutSegments = $derived(
    stats.byCategory.map((r) => ({ label: r.label, value: r.qty, color: r.color }))
  );
  const categoryBars = $derived(
    stats.byCategory.map((r) => ({ label: r.label, value: r.qty, color: r.color }))
  );
</script>

<!-- h-full 2행: KPI shrink-0 + 콘텐츠 flex-1 -->
<div class="flex flex-col gap-3 h-full min-h-0">

  <!-- 행1: KPI 3칸 -->
  <div class="grid grid-cols-3 gap-3 shrink-0">
    {#each [
      { label: '처리건수', val: fmtQty(stats.count), unit: '건', cls: 'text-base-content' },
      { label: '출고량',   val: fmtQty(stats.qty),   unit: '개', cls: 'text-primary' },
      { label: '매출',     val: fmtAmt(stats.amount), unit: '',   cls: 'text-success' },
    ] as k (k.label)}
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">{k.label}</p>
          <p class="text-lg font-bold {k.cls} mt-0.5 truncate leading-tight">
            {k.val}<span class="text-xs font-normal opacity-50 ml-0.5">{k.unit}</span>
          </p>
          <p class="text-[10px] mt-0.5 text-base-content/30">{fromDate} ~ {toDate}</p>
        </div>
      </div>
    {/each}
  </div>

  <!-- 행2: 3열 그리드 (도넛 | 카테고리바 | 품목순위) -->
  <div class="grid grid-cols-3 gap-3 flex-1 min-h-0">

    <!-- 도넛 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col gap-2 min-h-0">
        <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 shrink-0">카테고리 구성</p>
        {#if catTotal === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="flex flex-col items-center gap-2 flex-1 min-h-0">
            <DonutChart segments={donutSegments} size={110} centerLabel="총" centerValue={fmtQty(catTotal)} />
            <div class="w-full flex flex-col gap-1 overflow-y-auto min-h-0">
              {#each stats.byCategory as row (row.cat)}
                {@const pct = catTotal > 0 ? (row.qty / catTotal) * 100 : 0}
                <div class="flex items-center gap-1.5">
                  <span class="h-2 w-2 rounded-full shrink-0" style="background:{row.color}"></span>
                  <span class="text-[10px] font-semibold flex-1 truncate text-base-content/60">{row.label}</span>
                  <span class="text-[10px] font-bold text-right w-7">{pct.toFixed(0)}%</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- 카테고리 바 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col gap-2 min-h-0">
        <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 shrink-0">카테고리별 출고량</p>
        {#if categoryBars.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="flex-1 min-h-0 overflow-hidden">
            <BarChart bars={categoryBars} showValue={true} />
          </div>
        {/if}
      </div>
    </div>

    <!-- 품목 순위 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-0 flex flex-col min-h-0">
        <div class="px-3 pt-3 pb-2 border-b border-base-200 shrink-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">품목 순위</p>
        </div>
        {#if stats.byItem.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="overflow-y-auto flex-1 min-h-0">
            <table class="table table-xs w-full">
              <thead class="sticky top-0 bg-base-100 z-10">
                <tr class="text-[10px] text-base-content/40">
                  <th class="w-6 text-center">#</th>
                  <th>품목</th>
                  <th class="text-right">수량</th>
                  <th class="text-right">비중</th>
                </tr>
              </thead>
              <tbody>
                {#each stats.byItem as item, i (item.name)}
                  {@const pct = stats.qty > 0 ? (item.qty / stats.qty) * 100 : 0}
                  <tr class="hover:bg-base-200/40">
                    <td class="text-center text-[10px]">
                      {#if i === 0}<span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[9px] font-black text-warning-content">1</span>
                      {:else if i === 1}<span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-base-300 text-[9px] font-black">2</span>
                      {:else if i === 2}<span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-200 text-[9px] font-black text-orange-800">3</span>
                      {:else}<span class="text-[10px] text-base-content/30">{i+1}</span>{/if}
                    </td>
                    <td>
                      <div class="text-xs font-semibold leading-tight">{item.name}</div>
                      <div class="text-[10px] text-base-content/40" style="color:{stats.byCategory.find(c=>c.cat===item.cat)?.color}">{stats.byCategory.find(c=>c.cat===item.cat)?.label ?? item.cat}</div>
                    </td>
                    <td class="text-right text-xs font-bold">{fmtQty(item.qty)}</td>
                    <td class="text-right text-[10px] text-base-content/50">{pct.toFixed(0)}%</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>

  </div>
</div>
