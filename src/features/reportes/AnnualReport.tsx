import { BarChart3, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BalanceArea, GroupedBars } from '@/components/charts/FlowChart'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { VariationChip } from '@/components/common/VariationChip'
import { Button } from '@/components/ui/Button'
import { useTransactions } from '@/hooks/useFinance'
import { useMoney } from '@/hooks/useMoney'
import { cn } from '@/utils/cn'
import { downloadCSV } from '@/utils/csv'
import { todayISO, yearRange } from '@/utils/dates'
import { buildSeries, computeTotals, filterRange, groupByCategory, variation } from '@/utils/finance'
import { formatPercent } from '@/utils/format'
import { LegendDots, ReportSummary } from './reportParts'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function AnnualReport() {
  const { active } = useTransactions()
  const money = useMoney()
  const nowYear = new Date().getFullYear()
  const [year, setYear] = useState(nowYear)

  const r = useMemo(() => {
    const full = yearRange(year)
    const range = { from: full.from, to: year === nowYear ? todayISO() : full.to }
    const txs = filterRange(active, range)
    // Mismo tramo del año anterior (p. ej. 1 ene – 6 nov), para comparar periodos equivalentes.
    const prevTxs = filterRange(active, { from: yearRange(year - 1).from, to: `${year - 1}${range.to.slice(4)}` })
    const totals = computeTotals(txs)
    const previous = computeTotals(prevTxs)
    const series = buildSeries(active, range, 'month')
    const rows = series.map((p, i) => ({
      ...p, name: MONTHS[i] ?? p.label, ahorro: p.ingresos > 0 ? (p.neto / p.ingresos) * 100 : 0,
      egresosVar: i > 0 ? variation(p.egresos, series[i - 1]?.egresos ?? 0) : null,
    }))
    const withData = rows.filter((x) => x.ingresos > 0 || x.egresos > 0)
    return {
      range, txs, totals, previous, series, rows,
      best: withData.reduce<typeof rows[number] | null>((m, x) => (!m || x.neto > m.neto ? x : m), null),
      priciest: withData.reduce<typeof rows[number] | null>((m, x) => (!m || x.egresos > m.egresos ? x : m), null),
      changes: { ingresos: variation(totals.ingresos, previous.ingresos), egresos: variation(totals.egresos, previous.egresos), neto: variation(totals.neto, previous.neto) },
      expense: groupByCategory(txs, 'EGRESO').slice(0, 6),
      income: groupByCategory(txs, 'INGRESO').slice(0, 4),
    }
  }, [active, year, nowYear])

  function exportCsv(): void {
    downloadCSV(`moniq-reporte-anual-${year}.csv`, [
      ['Mes', 'Ingresos', 'Egresos', 'Neto', 'Saldo acumulado'],
      ...r.rows.map((x) => [x.name, x.ingresos.toFixed(2), x.egresos.toFixed(2), x.neto.toFixed(2), x.acumulado.toFixed(2)]),
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-line bg-surface p-1">
          <Button variant="ghost" size="iconSm" aria-label="Año anterior" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="num min-w-[96px] text-center text-[13.5px] font-bold text-ink">{year}</span>
          <Button variant="ghost" size="iconSm" aria-label="Año siguiente" disabled={year >= nowYear} onClick={() => setYear((y) => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={!r.txs.length}><Download className="h-4 w-4" /> Exportar CSV</Button>
      </div>

      {r.txs.length === 0 ? (
        <section className="panel"><EmptyState icon={BarChart3} title={`Sin movimientos en ${year}`} description="Elige otro año para ver su informe." /></section>
      ) : (
        <>
          <ReportSummary totals={r.totals} previous={r.previous} compareLabel={`vs. mismo tramo de ${year - 1}`} changes={r.changes} />
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Ingresos vs. egresos</h2><p className="text-[13px] text-ink-2">Comparativa mensual</p></div><LegendDots /></div>
              <GroupedBars data={r.series} showBalance={false} height={280} />
            </section>
            <section className="panel p-5 sm:p-6">
              <h2 className="text-lg font-bold">Balance acumulado</h2>
              <p className="mb-4 text-[13px] text-ink-2">Evolución de tu saldo a lo largo del año</p>
              <BalanceArea data={r.series} height={280} />
            </section>
          </div>

          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3 sm:px-6">
              <div><h2 className="text-lg font-bold">Resumen mes a mes</h2><p className="text-[13px] text-ink-2">Comparación entre periodos consecutivos</p></div>
              {r.best && r.priciest && <p className="text-[12.5px] text-ink-2">Mejor mes: <strong className="text-income">{r.best.name}</strong> · Mayor gasto: <strong className="text-expense">{r.priciest.name}</strong></p>}
            </div>
            <div className="scroll-x">
              <table className="w-full min-w-[680px] text-left text-[13.5px]">
                <thead className="border-y border-line text-[12px] uppercase tracking-wider text-ink-3"><tr><th className="px-5 py-2.5 font-semibold sm:px-6">Mes</th><th className="px-3 py-2.5 text-right font-semibold">Ingresos</th><th className="px-3 py-2.5 text-right font-semibold">Egresos</th><th className="px-3 py-2.5 text-right font-semibold">Neto</th><th className="px-3 py-2.5 text-right font-semibold">Ahorro</th><th className="px-5 py-2.5 text-right font-semibold sm:px-6">Egresos vs. mes previo</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.rows.map((x) => (
                    <tr key={x.key} className={cn(x.key === r.best?.key && 'bg-income-soft/40')}>
                      <td className="px-5 py-3 font-semibold text-ink sm:px-6">{x.name}</td>
                      <td className="num px-3 py-3 text-right text-income">{money(x.ingresos, { compact: false })}</td>
                      <td className="num px-3 py-3 text-right text-expense">{money(x.egresos, { compact: false })}</td>
                      <td className={cn('num px-3 py-3 text-right font-semibold', x.neto >= 0 ? 'text-ink' : 'text-expense')}>{money(x.neto, { compact: false, signed: true })}</td>
                      <td className="num px-3 py-3 text-right text-ink-2">{x.ingresos > 0 ? formatPercent(x.ahorro) : '—'}</td>
                      <td className="px-5 py-3 text-right sm:px-6">{x.egresosVar === null && x.egresos === 0 ? <span className="text-ink-3">—</span> : <VariationChip value={x.egresosVar} inverse />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {[{ t: 'Categorías de egreso', d: r.expense }, { t: 'Fuentes de ingreso', d: r.income }].map(({ t, d }) => (
              <section key={t} className="panel p-5 sm:p-6">
                <h2 className="text-lg font-bold">{t}</h2>
                <ul className="mt-4 space-y-4">
                  {d.map((c) => (
                    <li key={c.category.id}>
                      <div className="flex items-center gap-3"><CategoryIcon category={c.category} size="xs" /><span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{c.category.name}</span><span className="num text-[13.5px] font-semibold text-ink">{money(c.total, { compact: false })}</span></div>
                      <div className="mt-1.5 flex items-center gap-3 pl-10"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${c.share}%`, background: c.category.color }} /></div><span className="num w-10 text-right text-[12px] text-ink-2">{formatPercent(c.share)}</span></div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
