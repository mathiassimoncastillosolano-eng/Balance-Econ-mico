import { VariationChip } from '@/components/common/VariationChip'
import { useMoney } from '@/hooks/useMoney'
import type { Totals } from '@/utils/finance'
import { formatPercent } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  totals: Totals
  previous: Totals
  compareLabel: string
  changes: { ingresos: number | null; egresos: number | null; neto: number | null }
}

/** Franja de indicadores clave de un reporte (sin tarjetas: separadores finos). */
export function ReportSummary({ totals, previous, compareLabel, changes }: Props) {
  const money = useMoney()
  const items = [
    { k: 'Ingresos', v: money(totals.ingresos, { compact: false }), c: 'text-income', ch: changes.ingresos, inverse: false },
    { k: 'Egresos', v: money(totals.egresos, { compact: false }), c: 'text-expense', ch: changes.egresos, inverse: true },
    { k: 'Balance neto', v: money(totals.neto, { compact: false, signed: true }), c: totals.neto >= 0 ? 'text-ink' : 'text-expense', ch: changes.neto, inverse: false },
  ]
  return (
    <section className="panel grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x" aria-label="Resumen del reporte">
      {items.map((i) => (
        <div key={i.k} className="p-5 sm:p-6 sm:[&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-line lg:[&:nth-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-line lg:border-r-0">
          <p className="eyebrow">{i.k}</p>
          <p className={cn('num mt-2 truncate font-display text-[1.7rem] font-extrabold leading-none', i.c)}>{i.v}</p>
          <div className="mt-3 flex items-center gap-2"><VariationChip value={i.ch} inverse={i.inverse} /><span className="text-[12px] text-ink-3">{compareLabel}</span></div>
        </div>
      ))}
      <div className="p-5 sm:p-6">
        <p className="eyebrow">Tasa de ahorro</p>
        <p className={cn('num mt-2 font-display text-[1.7rem] font-extrabold leading-none', totals.ahorro >= 20 ? 'text-income' : totals.ahorro < 0 ? 'text-expense' : 'text-ink')}>{totals.ingresos > 0 ? formatPercent(totals.ahorro, 1) : '—'}</p>
        <div className="mt-3 text-[12px] text-ink-3">Antes: {previous.ingresos > 0 ? formatPercent(previous.ahorro, 1) : '—'}</div>
      </div>
    </section>
  )
}

export function LegendDots({ balance }: { balance?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-ink-2">
      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-income" />Ingresos</span>
      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-expense" />Egresos</span>
      {balance && <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded bg-brand" />Saldo acumulado</span>}
    </div>
  )
}
