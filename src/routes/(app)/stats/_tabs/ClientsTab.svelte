<script lang="ts">
  import DonutChart from '../_components/DonutChart.svelte';
  import BarChart from '../_components/BarChart.svelte';
  import type { Stats } from '../_lib/stats';
  import { fmtQty, fmtAmt } from '../_lib/stats';

  interface Props {
    monthStats: Stats;
    yearStats: Stats;
    fromDate: string;
    toDate: string;
    year: number;
  }

  let { monthStats, yearStats, fromDate, toDate, year }: Props = $props();

  const CC = ['#0ea5e9','#a855f7','#f97316','#10b981','#f59e0b','#ec4899'];

  const activeCount    = $derived(monthStats.byClient.length);
  const avgQtyPerOrder = $derived(monthStats.count > 0 ? Math.round(monthStats.qty / monthStats.count) : 0);
  const avgAmtPerClient = $derived(activeCount > 0 ? Math.round(monthStats.amount / activeCount) : 0);

  const monthQtyBars = $derived(monthStats.byClient.map((c,i) => ({ label: c.name, value: c.qty,    color: CC[i%6] })));
  const monthAmtBars = $derived(monthStats.byClient.map((c,i) => ({ label: c.name, value: c.amount, color: CC[i%6] })));
  const yearQtyBars  = $derived(yearStats.byClient.map((c,i)  => ({ label: c.name, value: c.qty,    color: CC[i%6] })));
  const clientDonut  = $derived(yearStats.byClient.map((c,i)  => ({ label: c.name, value: c.qty,    color: CC[i%6] })));

  const yearTotal    = $derived(yearStats.qty);
  const monthMaxQty  = $derived(Math.max(...monthStats.byClient.map(c=>c.qty), 1));
  const yearMaxQty   = $derived(Math.max(...yearStats.byClient.map(c=>c.qty), 1));
</script>

<!-- 3행: KPI | 차트2열 | 테이블2열 -->
<div class="flex flex-col gap-3 h-full min-h-0">

  <!-- 행1: KPI 3칸 -->
  <div class="grid grid-cols-3 gap-3 shrink-0">
    {#each [
      { label: '활성 거래처',       val: String(activeCount),        unit: '개사', cls: 'text-base-content', sub: `${fromDate}~${toDate} 출고 발생` },
      { label: '건당 평균 출고량',  val: fmtQty(avgQtyPerOrder),     unit: '개',   cls: 'text-primary',      sub: '처리건수 기준' },
      { label: '거래처 평균 매출',  val: fmtAmt(avgAmtPerClient),    unit: '',     cls: 'text-success',      sub: '선택 기간 평균' },
    ] as k (k.label)}
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">{k.label}</p>
          <p class="text-lg font-bold {k.cls} mt-0.5 truncate">{k.val}<span class="text-xs font-normal opacity-50 ml-0.5">{k.unit}</span></p>
          <p class="text-[10px] text-base-content/30 mt-0.5">{k.sub}</p>
        </div>
      </div>
    {/each}
  </div>

  <!-- 행2: 출고량바 | 매출바 | 도넛+연간바 -->
  <div class="grid grid-cols-3 gap-3 flex-1 min-h-0">

    <!-- 기간 출고량 바차트 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col min-h-0">
        <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 shrink-0 mb-1">기간 출고량</p>
        {#if monthQtyBars.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="flex-1 min-h-0 overflow-hidden">
            <BarChart bars={monthQtyBars} height={999} showValue={true} />
          </div>
        {/if}
      </div>
    </div>

    <!-- 기간 매출 바차트 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col min-h-0">
        <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 shrink-0 mb-1">기간 매출</p>
        {#if monthAmtBars.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="flex-1 min-h-0 overflow-hidden">
            <BarChart bars={monthAmtBars} height={999} showValue={true} />
          </div>
        {/if}
      </div>
    </div>

    <!-- 연간 점유율 도넛 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col min-h-0">
        <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40 shrink-0 mb-1">연간 점유율</p>
        {#if clientDonut.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="flex flex-col items-center gap-2 flex-1 min-h-0">
            <DonutChart segments={clientDonut} size={100} centerLabel="연간" centerValue={fmtQty(yearTotal)} />
            <div class="w-full flex flex-col gap-1 overflow-y-auto min-h-0">
              {#each clientDonut as seg, i (seg.label)}
                {@const pct = yearTotal > 0 ? (seg.value / yearTotal) * 100 : 0}
                <div class="flex items-center gap-1.5 text-[10px]">
                  <span class="h-2 w-2 rounded-full shrink-0" style="background:{seg.color}"></span>
                  <span class="flex-1 truncate text-base-content/60">{seg.label}</span>
                  <span class="font-bold">{pct.toFixed(0)}%</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- 행3: 기간 테이블 | 연간 테이블 -->
  <div class="grid grid-cols-2 gap-3 flex-1 min-h-0">

    <!-- 기간 거래처 테이블 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-0 flex flex-col min-h-0">
        <div class="px-3 pt-3 pb-2 border-b border-base-200 shrink-0 flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">기간 거래처 현황</p>
          <span class="text-[10px] text-base-content/30">{fromDate}~{toDate}</span>
        </div>
        {#if monthStats.byClient.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="overflow-y-auto flex-1 min-h-0">
            <table class="table table-xs w-full">
              <thead class="sticky top-0 bg-base-100 z-10 text-[10px] text-base-content/40">
                <tr>
                  <th>거래처</th>
                  <th class="text-right">건수</th>
                  <th class="text-right">출고량</th>
                  <th class="text-right">매출</th>
                  <th class="w-20">비중</th>
                </tr>
              </thead>
              <tbody>
                {#each monthStats.byClient as row, i (row.id)}
                  {@const pct = monthStats.qty > 0 ? (row.qty / monthStats.qty) * 100 : 0}
                  <tr class="hover:bg-base-200/40">
                    <td class="text-xs font-semibold">
                      <span class="flex items-center gap-1.5">
                        <span class="h-2 w-2 rounded-full shrink-0" style="background:{CC[i%6]}"></span>
                        {row.name}
                      </span>
                    </td>
                    <td class="text-right text-[10px] text-base-content/50">{row.count}건</td>
                    <td class="text-right text-xs font-bold">{fmtQty(row.qty)}</td>
                    <td class="text-right text-xs text-success font-semibold">{fmtAmt(row.amount)}</td>
                    <td>
                      <div class="flex items-center gap-1">
                        <progress class="progress h-1.5 flex-1" style="--value:{row.qty};--max:{monthMaxQty}" value={row.qty} max={monthMaxQty}></progress>
                        <span class="text-[9px] text-base-content/40 w-6 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-base-300 bg-base-200/50 font-bold text-xs">
                  <td>합계</td>
                  <td class="text-right text-[10px]">{monthStats.count}건</td>
                  <td class="text-right">{fmtQty(monthStats.qty)}</td>
                  <td class="text-right text-success">{fmtAmt(monthStats.amount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        {/if}
      </div>
    </div>

    <!-- 연간 거래처 테이블 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-0 flex flex-col min-h-0">
        <div class="px-3 pt-3 pb-2 border-b border-base-200 shrink-0 flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">연간 거래처 현황</p>
          <span class="text-[10px] text-base-content/30">{year}년 누적</span>
        </div>
        {#if yearStats.byClient.length === 0}
          <div class="flex-1 flex items-center justify-center text-xs text-base-content/30">데이터 없음</div>
        {:else}
          <div class="overflow-y-auto flex-1 min-h-0">
            <table class="table table-xs w-full">
              <thead class="sticky top-0 bg-base-100 z-10 text-[10px] text-base-content/40">
                <tr>
                  <th class="w-5">#</th>
                  <th>거래처</th>
                  <th class="text-right">출고량</th>
                  <th class="text-right">매출</th>
                  <th class="w-20">점유율</th>
                </tr>
              </thead>
              <tbody>
                {#each yearStats.byClient as row, i (row.id)}
                  {@const pct = yearStats.qty > 0 ? (row.qty / yearStats.qty) * 100 : 0}
                  <tr class="hover:bg-base-200/40">
                    <td class="text-[10px] text-base-content/30">{i+1}</td>
                    <td class="text-xs font-semibold">
                      <span class="flex items-center gap-1.5">
                        <span class="h-2 w-2 rounded-full shrink-0" style="background:{CC[i%6]}"></span>
                        {row.name}
                      </span>
                    </td>
                    <td class="text-right text-xs font-bold">{fmtQty(row.qty)}</td>
                    <td class="text-right text-xs text-success font-semibold">{fmtAmt(row.amount)}</td>
                    <td>
                      <div class="flex items-center gap-1">
                        <progress class="progress h-1.5 flex-1" value={row.qty} max={yearMaxQty}></progress>
                        <span class="text-[9px] text-base-content/40 w-6 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-base-300 bg-base-200/50 font-bold text-xs">
                  <td></td>
                  <td class="text-[10px] text-base-content/60">합계</td>
                  <td class="text-right">{fmtQty(yearStats.qty)}</td>
                  <td class="text-right text-success">{fmtAmt(yearStats.amount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        {/if}
      </div>
    </div>

  </div>
</div>
