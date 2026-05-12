<script lang="ts">
  import LineChart from '../_components/LineChart.svelte';
  import StackBarChart from '../_components/StackBarChart.svelte';
  import type { MonthlyRow, Stats } from '../_lib/stats';
  import { diff, fmtQty, fmtAmt, calcMonthlyCategoryStack } from '../_lib/stats';
  import { CATEGORY_KEYS, CATEGORY_COLORS, CATEGORY_LABELS, shipments } from '../_lib/data';

  interface Props {
    trend: MonthlyRow[];
    prevTrend: MonthlyRow[];
    year: number;
    prevYear: number;
    clientId?: string;
    yearStats: Stats;
    prevYearStats: Stats;
  }

  let { trend, prevTrend, year, prevYear, clientId, yearStats, prevYearStats }: Props = $props();

  const yearAmtDiff = $derived(diff(yearStats.amount, prevYearStats.amount));
  const yearQtyDiff = $derived(diff(yearStats.qty,    prevYearStats.qty));
  const monthLabels = ['1','2','3','4','5','6','7','8','9','10','11','12'];

  const lineQtySeries = $derived([
    { label: `${year}년`,     color: '#6366f1', dash: false, data: trend.map(r => r.qty) },
    { label: `${prevYear}년`, color: '#94a3b8', dash: true,  data: prevTrend.map(r => r.qty) },
  ]);
  const lineAmtSeries = $derived([
    { label: `${year}년`,     color: '#10b981', dash: false, data: trend.map(r => r.amount) },
    { label: `${prevYear}년`, color: '#94a3b8', dash: true,  data: prevTrend.map(r => r.amount) },
  ]);

  const stackData   = $derived(calcMonthlyCategoryStack(shipments, year, clientId));
  const stackSeries = $derived(
    CATEGORY_KEYS.map(k => ({
      label: CATEGORY_LABELS[k],
      color: CATEGORY_COLORS[k],
      data: stackData[k] ?? Array(12).fill(0),
    }))
  );

  const totalQty     = $derived(trend.reduce((s,r) => s+r.qty, 0));
  const totalAmt     = $derived(trend.reduce((s,r) => s+r.amount, 0));
  const prevTotalQty = $derived(prevTrend.reduce((s,r) => s+r.qty, 0));
  const prevTotalAmt = $derived(prevTrend.reduce((s,r) => s+r.amount, 0));

  function dcls(cls: string) {
    return cls === 'up' ? 'text-success' : cls === 'down' ? 'text-error' : 'text-base-content/40';
  }
</script>

<!-- 3행: KPI shrink-0 | 차트2열 flex-1 | 표+스택 flex-1 -->
<div class="flex flex-col gap-3 h-full min-h-0">

  <!-- 행1: KPI 4칸 -->
  <div class="grid grid-cols-4 gap-3 shrink-0">
    {#each [
      { label: '연간 처리건수', val: fmtQty(yearStats.count),  unit: '건', cls: 'text-base-content', d: diff(yearStats.count, prevYearStats.count),  prev: `${prevYear}년 ${fmtQty(prevYearStats.count)}건` },
      { label: '연간 출고량',   val: fmtQty(yearStats.qty),    unit: '개', cls: 'text-primary',      d: yearQtyDiff, prev: `${prevYear}년 ${fmtQty(prevYearStats.qty)}개` },
      { label: '연간 매출',     val: fmtAmt(yearStats.amount), unit: '',   cls: 'text-success',      d: yearAmtDiff, prev: `${prevYear}년 ${fmtAmt(prevYearStats.amount)}` },
      { label: '월평균 출고',   val: fmtQty(trend.filter(r=>r.qty>0).length ? Math.round(yearStats.qty/trend.filter(r=>r.qty>0).length) : 0), unit: '개', cls: 'text-accent', d: diff(0,0), prev: '' },
    ] as k (k.label)}
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-3">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">{k.label}</p>
          <p class="text-lg font-bold {k.cls} mt-0.5 truncate leading-tight">{k.val}<span class="text-xs font-normal opacity-50 ml-0.5">{k.unit}</span></p>
          <p class="text-[10px] mt-0.5 {dcls(k.d.cls)}">{k.d.sign}{k.d.pct} <span class="text-base-content/30">{k.prev}</span></p>
        </div>
      </div>
    {/each}
  </div>

  <!-- 행2: 라인차트(출고) | 라인차트(매출) | 스택바 -->
  <div class="grid grid-cols-3 gap-3 flex-1 min-h-0">

    <!-- 출고량 전년비교 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col min-h-0">
        <div class="flex items-center justify-between mb-1 shrink-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">월별 출고량</p>
          <div class="flex gap-3 text-[10px] text-base-content/50">
            <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-3 rounded bg-indigo-500"></span>{year}년</span>
            <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-3 rounded bg-slate-300"></span>{prevYear}년</span>
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-hidden">
          <LineChart series={lineQtySeries} labels={monthLabels} showArea={true} />
        </div>
      </div>
    </div>

    <!-- 매출 전년비교 -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col min-h-0">
        <div class="flex items-center justify-between mb-1 shrink-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">월별 매출</p>
          <div class="flex gap-3 text-[10px] text-base-content/50">
            <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-3 rounded bg-emerald-500"></span>{year}년</span>
            <span class="flex items-center gap-1"><span class="inline-block h-1.5 w-3 rounded bg-slate-300"></span>{prevYear}년</span>
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-hidden">
          <LineChart series={lineAmtSeries} labels={monthLabels} showArea={true} />
        </div>
      </div>
    </div>

    <!-- 스택바 (카테고리 구성) -->
    <div class="card bg-base-100 shadow-sm flex flex-col min-h-0">
      <div class="card-body p-3 flex flex-col min-h-0">
        <div class="flex items-center justify-between mb-1 shrink-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">카테고리 구성</p>
          <div class="flex flex-wrap gap-x-2 gap-y-0.5">
            {#each CATEGORY_KEYS as k (k)}
              <span class="flex items-center gap-1 text-[9px] text-base-content/50">
                <span class="h-1.5 w-1.5 rounded-sm" style="background:{CATEGORY_COLORS[k]}"></span>
                {CATEGORY_LABELS[k]}
              </span>
            {/each}
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-hidden">
          <StackBarChart months={[1,2,3,4,5,6,7,8,9,10,11,12]} series={stackSeries} />
        </div>
      </div>
    </div>
  </div>

  <!-- 행3: 월별 상세 테이블 -->
  <div class="card bg-base-100 shadow-sm flex flex-col min-h-0 flex-1">
    <div class="card-body p-0 flex flex-col min-h-0">
      <div class="px-3 pt-3 pb-2 border-b border-base-200 shrink-0 flex items-center justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/40">월별 상세</p>
        <span class="text-[10px] text-base-content/30">{year}년 vs {prevYear}년</span>
      </div>
      <div class="overflow-y-auto flex-1 min-h-0">
        <table class="table table-xs w-full">
          <thead class="sticky top-0 bg-base-100 z-10 text-[10px] text-base-content/40">
            <tr>
              <th class="w-10">월</th>
              <th class="text-right">{year} 출고</th>
              <th class="text-right text-base-content/30">{prevYear} 출고</th>
              <th class="text-right">{year} 매출</th>
              <th class="text-right text-base-content/30">{prevYear} 매출</th>
              <th class="text-right">출고△</th>
              <th class="text-right">매출△</th>
            </tr>
          </thead>
          <tbody>
            {#each trend as r, idx (r.month)}
              {@const pr = prevTrend[idx]}
              {@const qd = diff(r.qty, pr?.qty ?? 0)}
              {@const ad = diff(r.amount, pr?.amount ?? 0)}
              <tr class="hover:bg-base-200/40">
                <td class="font-semibold text-xs">{r.month}월</td>
                <td class="text-right text-xs">{fmtQty(r.qty)}</td>
                <td class="text-right text-[10px] text-base-content/40">{fmtQty(pr?.qty ?? 0)}</td>
                <td class="text-right text-xs">{fmtAmt(r.amount)}</td>
                <td class="text-right text-[10px] text-base-content/40">{fmtAmt(pr?.amount ?? 0)}</td>
                <td class="text-right text-[10px] font-bold {dcls(qd.cls)}">{qd.sign}{qd.pct}</td>
                <td class="text-right text-[10px] font-bold {dcls(ad.cls)}">{ad.sign}{ad.pct}</td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-base-300 bg-base-200/50 font-bold text-xs">
              <td>합계</td>
              <td class="text-right">{fmtQty(totalQty)}</td>
              <td class="text-right text-base-content/40">{fmtQty(prevTotalQty)}</td>
              <td class="text-right">{fmtAmt(totalAmt)}</td>
              <td class="text-right text-base-content/40">{fmtAmt(prevTotalAmt)}</td>
              <td class="text-right text-[10px] {dcls(yearQtyDiff.cls)}">{yearQtyDiff.sign}{yearQtyDiff.pct}</td>
              <td class="text-right text-[10px] {dcls(yearAmtDiff.cls)}">{yearAmtDiff.sign}{yearAmtDiff.pct}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>

</div>
