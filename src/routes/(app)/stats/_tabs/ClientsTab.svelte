<script lang="ts">
  import BarChart from '../_components/BarChart.svelte';
  import DonutChart from '../_components/DonutChart.svelte';
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

  const CC = ['#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#a855f7'];

  const activeCount     = $derived(monthStats.byClient.length);
  const avgAmtPerClient = $derived(activeCount > 0 ? Math.round(monthStats.amount / activeCount) : 0);

  const monthQtyBars = $derived(monthStats.byClient.map((c, i) => ({ label: c.name, value: c.qty,    color: CC[i % 6] })));
  const monthAmtBars = $derived(monthStats.byClient.map((c, i) => ({ label: c.name, value: c.amount, color: CC[i % 6] })));
  const clientDonut  = $derived(yearStats.byClient.map((c, i)  => ({ label: c.name, value: c.qty,    color: CC[i % 6] })));

  const yearTotal   = $derived(yearStats.qty);
  const monthMaxQty = $derived(Math.max(...monthStats.byClient.map(c => c.qty), 1));
  const yearMaxQty  = $derived(Math.max(...yearStats.byClient.map(c => c.qty), 1));
</script>

<div class="h-full flex flex-col gap-3">

  <!-- KPI 행 -->
  <div class="grid grid-cols-3 gap-3 shrink-0">
    {#each [
      { label: '활성 거래처',      val: String(activeCount),     unit: '개사', cls: 'text-base-content', sub: `${fromDate}~${toDate} 출고 발생` },
      { label: '건당 평균 출고량', val: fmtQty(monthStats.count > 0 ? Math.round(monthStats.qty / monthStats.count) : 0), unit: '개', cls: 'text-primary', sub: '처리건수 기준' },
      { label: '거래처 평균 매출', val: fmtAmt(avgAmtPerClient), unit: '',     cls: 'text-success',      sub: '선택 기간 평균' },
    ] as k (k.label)}
      <div class="bg-base-100 rounded-xl p-4 shadow-sm">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40 mb-1">{k.label}</p>
        <p class="text-2xl font-extrabold {k.cls} leading-none">
          {k.val}<span class="text-sm font-normal opacity-50 ml-1">{k.unit}</span>
        </p>
        <p class="text-[11px] text-base-content/30 mt-1">{k.sub}</p>
      </div>
    {/each}
  </div>

  <!-- 차트+테이블 행: 기간출고바 | 기간매출바 | 연간도넛 -->
  <div class="grid grid-cols-3 gap-3 flex-1 min-h-0">

    <!-- 기간 출고량 바 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">기간 출고량</p>
        <p class="text-[10px] text-base-content/30 mt-0.5">{fromDate} ~ {toDate}</p>
      </div>
      {#if monthQtyBars.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 px-3 py-3 overflow-hidden">
          <BarChart bars={monthQtyBars} showValue={true} />
        </div>
      {/if}
    </div>

    <!-- 기간 매출 바 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">기간 매출</p>
        <p class="text-[10px] text-base-content/30 mt-0.5">{fromDate} ~ {toDate}</p>
      </div>
      {#if monthAmtBars.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 px-3 py-3 overflow-hidden">
          <BarChart bars={monthAmtBars} showValue={true} />
        </div>
      {/if}
    </div>

    <!-- 연간 점유율 도넛 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">연간 점유율</p>
        <p class="text-[10px] text-base-content/30 mt-0.5">{year}년 누적</p>
      </div>
      {#if clientDonut.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center gap-3 p-4 overflow-hidden">
          <DonutChart segments={clientDonut} size={110} centerLabel="연간" centerValue={fmtQty(yearTotal)} />
          <div class="w-full flex flex-col gap-1.5 overflow-y-auto">
            {#each clientDonut as seg (seg.label)}
              {@const pct = yearTotal > 0 ? (seg.value / yearTotal) * 100 : 0}
              <div class="flex items-center gap-2 text-xs">
                <span class="h-2.5 w-2.5 rounded-full shrink-0" style="background:{seg.color}"></span>
                <span class="flex-1 truncate text-base-content/60">{seg.label}</span>
                <span class="font-bold tabular-nums">{pct.toFixed(0)}%</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- 테이블 행: 기간 거래처 | 연간 거래처 -->
  <div class="grid grid-cols-2 gap-3 flex-1 min-h-0">

    <!-- 기간 거래처 테이블 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0 flex items-center justify-between">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">기간 거래처 현황</p>
        <span class="text-[11px] text-base-content/30">{fromDate}~{toDate}</span>
      </div>
      {#if monthStats.byClient.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 overflow-y-auto">
          <table class="table table-xs w-full">
            <thead class="sticky top-0 bg-base-100 z-10 text-[11px] text-base-content/40">
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
                  <td class="text-right text-[11px] text-base-content/50 tabular-nums">{row.count}건</td>
                  <td class="text-right text-xs font-bold tabular-nums">{fmtQty(row.qty)}</td>
                  <td class="text-right text-xs text-success font-semibold tabular-nums">{fmtAmt(row.amount)}</td>
                  <td>
                    <div class="flex items-center gap-1">
                      <progress class="progress h-1.5 flex-1" value={row.qty} max={monthMaxQty}></progress>
                      <span class="text-[9px] text-base-content/40 w-6 text-right tabular-nums">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-base-300 bg-base-200/50 font-bold text-xs">
                <td>합계</td>
                <td class="text-right text-[11px] tabular-nums">{monthStats.count}건</td>
                <td class="text-right tabular-nums">{fmtQty(monthStats.qty)}</td>
                <td class="text-right text-success tabular-nums">{fmtAmt(monthStats.amount)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      {/if}
    </div>

    <!-- 연간 거래처 테이블 -->
    <div class="bg-base-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div class="px-4 pt-3 pb-2 border-b border-base-200 shrink-0 flex items-center justify-between">
        <p class="text-[11px] font-bold uppercase tracking-widest text-base-content/40">연간 거래처 현황</p>
        <span class="text-[11px] text-base-content/30">{year}년 누적</span>
      </div>
      {#if yearStats.byClient.length === 0}
        <div class="flex-1 flex items-center justify-center text-sm text-base-content/30">데이터 없음</div>
      {:else}
        <div class="flex-1 overflow-y-auto">
          <table class="table table-xs w-full">
            <thead class="sticky top-0 bg-base-100 z-10 text-[11px] text-base-content/40">
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
                  <td class="text-[11px] text-base-content/30">{i + 1}</td>
                  <td class="text-xs font-semibold">
                    <span class="flex items-center gap-1.5">
                      <span class="h-2 w-2 rounded-full shrink-0" style="background:{CC[i%6]}"></span>
                      {row.name}
                    </span>
                  </td>
                  <td class="text-right text-xs font-bold tabular-nums">{fmtQty(row.qty)}</td>
                  <td class="text-right text-xs text-success font-semibold tabular-nums">{fmtAmt(row.amount)}</td>
                  <td>
                    <div class="flex items-center gap-1">
                      <progress class="progress h-1.5 flex-1" value={row.qty} max={yearMaxQty}></progress>
                      <span class="text-[9px] text-base-content/40 w-6 text-right tabular-nums">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-base-300 bg-base-200/50 font-bold text-xs">
                <td></td>
                <td class="text-[11px] text-base-content/60">합계</td>
                <td class="text-right tabular-nums">{fmtQty(yearStats.qty)}</td>
                <td class="text-right text-success tabular-nums">{fmtAmt(yearStats.amount)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>
