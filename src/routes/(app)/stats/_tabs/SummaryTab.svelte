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
  const donutSegments = $derived(stats.byCategory.map((r) => ({ label: r.label, value: r.qty, color: r.color })));
  const categoryBars  = $derived(stats.byCategory.map((r) => ({ label: r.label, value: r.qty, color: r.color })));
</script>

<!--
  전체 레이아웃:
  - 상단 KPI 카드 행 (고정 높이)
  - 하단 차트/테이블 행 (나머지 공간)
-->
<div class="h-full flex flex-col gap-3">

  <!-- KPI 행 -->
  <div class="grid grid-cols-3 gap-3 shrink-0">
    {#each [
      { label: '처리건수', val: fmtQty(stats.count), unit: '건', cls: 'text-base-content' },
      { label: '출고량',   val: fmtQty(stats.qty),   unit: '개', cls: 'text-primary' },
      { label: '매출',     val: fmtAmt(stats.amount), unit: '',   cls: 'text-success' },
    ] as k (k.label)}
      <div class="bg-base-100 rounded-xl p-4 shadow-sm">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40 mb-1">{k.label}</p>
        <p class="text-2xl font-extrabold {k.cls} leading-none">
          {k.val}<span class="text-sm font-normal opacity-50 ml-1">{k.unit}</span>
        </p>
        <p class="text-[11px] text-base-content/30 mt-1">{fromDate} ~ {toDate}</p>
      </div>
    {/each}
  </div>

  <!-- 콘텐츠 행: 도넛 | 카테고리 바 | 품목순위 -->
  <div class="grid grid-cols-3 gap-3 flex-1 min-h-0">

    <!-- 카테고리 구성 도넛 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">카테고리 구성</p>
      </div>
      {#if catTotal === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center gap-3 p-4 overflow-hidden">
          <DonutChart segments={donutSegments} size={120} centerLabel="총" centerValue={fmtQty(catTotal)} />
          <div class="w-full flex flex-col gap-1.5 overflow-y-auto">
            {#each stats.byCategory as row (row.cat)}
              {@const pct = catTotal > 0 ? (row.qty / catTotal) * 100 : 0}
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full shrink-0" style="background:{row.color}"></span>
                <span class="text-xs font-semibold flex-1 truncate text-base-content/60">{row.label}</span>
                <span class="text-xs font-bold tabular-nums">{pct.toFixed(0)}%</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- 카테고리별 출고량 바 차트 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">카테고리별 출고량</p>
      </div>
      {#if categoryBars.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <!-- BarChart는 CSS flex 기반이라 h-full이 잘 동작함 -->
        <div class="flex-1 px-3 py-3 overflow-hidden">
          <BarChart bars={categoryBars} showValue={true} />
        </div>
      {/if}
    </div>

    <!-- 품목 순위 테이블 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">품목 순위</p>
      </div>
      {#if stats.byItem.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 overflow-y-auto">
          <table class="table table-xs w-full">
            <thead class="sticky top-0 bg-base-100 z-10">
              <tr class="text-[11px] text-base-content/40">
                <th class="w-7 text-center">#</th>
                <th>품목</th>
                <th class="text-right">수량</th>
                <th class="text-right">비중</th>
              </tr>
            </thead>
            <tbody>
              {#each stats.byItem as item, i (item.name)}
                {@const pct = stats.qty > 0 ? (item.qty / stats.qty) * 100 : 0}
                {@const catColor = stats.byCategory.find(c => c.cat === item.cat)?.color ?? '#94a3b8'}
                {@const catLabel = stats.byCategory.find(c => c.cat === item.cat)?.label ?? item.cat}
                <tr class="hover:bg-base-200/40">
                  <td class="text-center">
                    {#if i === 0}
                      <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[9px] font-black text-warning-content">1</span>
                    {:else if i === 1}
                      <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-base-300 text-[9px] font-black">2</span>
                    {:else if i === 2}
                      <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-200 text-[9px] font-black text-orange-800">3</span>
                    {:else}
                      <span class="text-[10px] text-base-content/30">{i + 1}</span>
                    {/if}
                  </td>
                  <td>
                    <p class="text-xs font-semibold leading-tight">{item.name}</p>
                    <p class="text-[10px]" style="color:{catColor}">{catLabel}</p>
                  </td>
                  <td class="text-right text-xs font-bold tabular-nums">{fmtQty(item.qty)}</td>
                  <td class="text-right text-[11px] text-base-content/50 tabular-nums">{pct.toFixed(0)}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>
