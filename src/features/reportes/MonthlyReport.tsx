import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DonutChart } from '@/components/charts/DonutChart'
import { GroupedBars } from '@/components/charts/FlowChart'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/Button'
import { useTransactions } from '@/hooks/useFinance'
import { useMoney } from '@/hooks/useMoney'
import { downloadCSV } from '@/utils/csv'
import { monthLabel, monthRange, shiftMonth, todayISO } from '@/utils/dates'
import { buildSeries, computeBudgetStatuses, computeTotals, filterRange, groupByCategory, groupByConcept, variation } from '@/utils/finance'
import { formatPercent } from '@/utils/format'
import { BarChart3 } from 'lucide-react'
import { LegendDots, ReportSummary } from './reportParts'

export function MonthlyReport() {
  const { data, active } = useTransactions()
  const money = useMoney()
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month0: now.getMonth() })
  const isCurrent = ym.year === now.getFullYear() && ym.month0 === now.getMonth()

  const r = useMemo(() => {
    const full = monthRange(ym.year, ym.month0)
    const range = { from: full.from, to: isCurrent ? todayISO() : full.to }
    const prev = shiftMonth(ym.year, ym.month0, -1)
    const prevFull = monthRange(prev.year, prev.month0)
    const txs = filterRange(active, range)
    const prevTxs = filterRange(active, prevFull)
    const totals = computeTotals(txs)
    const previous = computeTotals(prevTxs)
    return {
      range, txs, totals, previous,
      changes: { ingresos: variation(totals.ingresos, previous.ingresos), egresos: variation(totals.egresos, previous.egresos), neto: variation(totals.neto, previous.neto) },
      series: buildSeries(active, range, 'day'),
      expense: groupByCategory(txs, 'EGRESO'),
      concepts: groupByConcept(txs, 'EGRESO').slice(0, 8),
      budgets: new Map(computeBudgetStatuses(data, active, ym.year, ym.month0).map((b) => [b.category.id, b])),
    }
  }, [active, data, ym, isCurrent])

  function exportCsv(): void {
    downloadCSV(`moniq-reporte-${ym.year}-${String(ym.month0 + 1).padStart(2, '0')}.csv`, [
      ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Importe'],
      ...r.txs.map((t) => [t.date, t.type === 'INGRESO' ? 'Ingreso' : 'Egreso', t.category.name, t.concept.name, t.amount.toFixed(2)]),
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-line bg-surface p-1">
          <Button variant="ghost" size="iconSm" aria-label="Mes anterior" onClick={() => setYm((v) => shiftMonth(v.year, v.month0, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[150px] text-center text-[13.5px] font-bold text-ink">{monthLabel(ym.year, ym.month0)}</span>
          <Button variant="ghost" size="iconSm" aria-label="Mes siguiente" disabled={isCurrent} onClick={() => setYm((v) => shiftMonth(v.year, v.month0, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!r.txs.length}><Download className="h-4 w-4" /> Exportar CSV</Button>
      </div>

      {r.txs.length === 0 ? (
        <section className="panel"><EmptyState icon={BarChart3} title="Sin movimientos en este mes" description="Elige otro mes o registra movimientos para generar el reporte." /></section>
      ) : (
        <>
          <ReportSummary totals={r.totals} previous={r.previous} compareLabel="vs. mes anterior" changes={r.changes} />
          <section className="panel p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Flujo diario</h2><p className="text-[13px] text-ink-2">Ingresos, egresos y saldo acumulado día a día</p></div><LegendDots balance /></div>
            <GroupedBars data={r.series} height={300} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section className="panel p-5 sm:p-6">
              <h2 className="text-lg font-bold">Distribución de gastos</h2>
              <p className="mb-4 text-[13px] text-ink-2">Participación por categoría</p>
              {r.expense.length === 0 ? <p className="rounded-xl bg-surface-2 p-4 text-center text-[13px] text-ink-2">Sin egresos este mes.</p> : <DonutChart size={200} centerLabel="Egresos" centerValue={r.totals.egresos} data={r.expense.map((c) => ({ name: c.category.name, value: c.total, color: c.category.color }))} />}
            </section>
            <section className="panel overflow-hidden">
              <div className="p-5 pb-3 sm:px-6"><h2 className="text-lg font-bold">Categorías principales</h2><p className="text-[13px] text-ink-2">Gasto del mes frente a su presupuesto</p></div>
              <div className="scroll-x">
                <table className="w-full min-w-[520px] text-left text-[13.5px]">
                  <thead className="border-y border-line text-[12px] uppercase tracking-wider text-ink-3"><tr><th className="px-5 py-2.5 font-semibold sm:px-6">Categoría</th><th className="px-3 py-2.5 text-right font-semibold">Gasto</th><th className="px-3 py-2.5 text-right font-semibold">%</th><th className="px-5 py-2.5 text-right font-semibold sm:px-6">Presupuesto</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.expense.map((c) => {
                      const b = r.budgets.get(c.category.id)
                      return (
                        <tr key={c.category.id}>
                          <td className="px-5 py-3 sm:px-6"><span className="flex items-center gap-3"><CategoryIcon category={c.category} size="xs" /><span className="font-semibold text-ink">{c.category.name}</span></span></td>
                          <td className="num px-3 py-3 text-right font-semibold text-ink">{money(c.total, { compact: false })}</td>
                          <td className="num px-3 py-3 text-right text-ink-2">{formatPercent(c.share)}</td>
                          <td className="num px-5 py-3 text-right sm:px-6">{b ? <span className={b.state === 'over' ? 'font-bold text-expense' : b.state === 'warning' ? 'font-bold text-warn' : 'text-ink-2'}>{Math.round(b.percent)}%</span> : <span className="text-ink-3">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="panel p-5 sm:p-6">
            <h2 className="text-lg font-bold">Conceptos con mayor gasto</h2>
            <ul className="mt-3 grid gap-x-10 divide-y divide-line md:grid-cols-2 md:divide-y-0">
              {r.concepts.map((c) => (
                <li key={c.concept.id} className="flex items-center gap-3 border-line py-3 md:border-b">
                  <CategoryIcon category={c.category} size="sm" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold text-ink">{c.concept.name}</p><p className="text-[12px] text-ink-2">{c.category.name} · {c.count} mov.</p></div>
                  <span className="num text-[13.5px] font-semibold text-ink">{money(c.total, { compact: false })}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
