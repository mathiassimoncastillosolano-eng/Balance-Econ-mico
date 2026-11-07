import { CalendarDays, Plus, Receipt, Repeat, Trophy, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DonutChart } from '@/components/charts/DonutChart'
import { SingleFlowBars } from '@/components/charts/FlowChart'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { PeriodSelect } from '@/components/common/PeriodSelect'
import { VariationChip } from '@/components/common/VariationChip'
import { Button } from '@/components/ui/Button'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { usePeriodStats } from '@/hooks/useFinance'
import { useMoney } from '@/hooks/useMoney'
import { useUiStore } from '@/stores/uiStore'
import type { MovementType } from '@/types/domain'
import { cn } from '@/utils/cn'
import { periodLabel } from '@/utils/dates'
import { flowInsights, groupByConcept } from '@/utils/finance'
import { formatDate, formatPercent } from '@/utils/format'
import { MovementRow } from '../movimientos/MovementRow'
import { useMovementActions } from '../movimientos/useMovementActions'

const COPY = {
  INGRESO: { title: 'Ingresos', eyebrow: 'Entradas de dinero', desc: 'De dónde viene tu dinero y cómo evoluciona.', cta: 'Nuevo ingreso', empty: 'Aún no registras ingresos en este periodo.', accent: 'text-income', bar: 'bg-income' },
  EGRESO: { title: 'Egresos', eyebrow: 'Salidas de dinero', desc: 'En qué se va tu dinero y qué categorías pesan más.', cta: 'Nuevo egreso', empty: 'Aún no registras egresos en este periodo.', accent: 'text-expense', bar: 'bg-expense' },
} as const

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Wallet; label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 px-1 py-4 sm:px-5 sm:py-0">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2"><Icon className="h-3.5 w-3.5 text-ink-3" />{label}</div>
      <p className="num mt-1.5 truncate font-display text-[1.25rem] font-extrabold text-ink">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[12px] text-ink-3">{sub}</p>}
    </div>
  )
}

export default function FlowPage({ type }: { type: MovementType }) {
  const copy = COPY[type]
  const stats = usePeriodStats()
  const money = useMoney()
  const openCreate = useUiStore((s) => s.openCreateMovement)
  const { all: budgets } = useBudgetAlerts()
  const actions = useMovementActions()
  const kind = type === 'INGRESO' ? 'ingresos' : 'egresos'

  const scoped = useMemo(() => stats.txs.filter((t) => t.type === type), [stats.txs, type])
  const info = useMemo(() => flowInsights(stats.txs, type, stats.range), [stats.txs, stats.range, type])
  const byCategory = type === 'INGRESO' ? stats.incomeByCategory : stats.expenseByCategory
  const concepts = useMemo(() => groupByConcept(stats.txs, type).slice(0, 6), [stats.txs, type])
  const total = stats.totals[kind]
  const change = stats.changes[kind]
  const budgetByCategory = new Map(budgets.map((b) => [b.category.id, b]))

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow={copy.eyebrow} title={copy.title} description={copy.desc}
        actions={
          <>
            <div className="w-full sm:w-auto"><PeriodSelect /></div>
            <Button variant="primary" onClick={() => openCreate({ type })} className="hidden sm:inline-flex"><Plus className="h-4 w-4" strokeWidth={2.6} /> {copy.cta}</Button>
          </>
        }
      />

      {scoped.length === 0 ? (
        <section className="panel">
          <EmptyState icon={Receipt} title={copy.empty} description="Registra uno nuevo o prueba con otro periodo." action={<Button variant="primary" onClick={() => openCreate({ type })}><Plus className="h-4 w-4" /> {copy.cta}</Button>} />
        </section>
      ) : (
        <>
          <section className="panel overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <div className="border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <p className="eyebrow">Total del periodo · {periodLabel(stats.range)}</p>
                <p className={cn('num mt-2 break-words font-display text-[2.5rem] font-extrabold leading-none sm:text-[3rem]', copy.accent)}>{money(total, { compact: false })}</p>
                <div className="mt-3 flex items-center gap-2"><VariationChip value={change} inverse={type === 'EGRESO'} /><span className="text-[12.5px] text-ink-3">frente al periodo anterior</span></div>
              </div>
              <div className="grid divide-y divide-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-2 sm:py-7">
                <Stat icon={CalendarDays} label="Promedio diario" value={money(info.dailyAverage, { compact: false })} sub="durante el periodo" />
                <Stat icon={Trophy} label={type === 'INGRESO' ? 'Mayor ingreso' : 'Mayor gasto'} value={info.largest ? money(info.largest.amount, { compact: false }) : '—'} sub={info.largest?.concept.name} />
                <Stat icon={Repeat} label="Frecuencia" value={`${info.frequency} mov.`} sub={info.busiestDay ? `Pico: ${formatDate(info.busiestDay.date, 'd MMM')}` : undefined} />
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section className="panel p-5 sm:p-6">
              <h2 className="text-lg font-bold">Evolución de {copy.title.toLowerCase()}</h2>
              <p className="mb-4 text-[13px] text-ink-2">Importe acumulado por intervalo</p>
              <SingleFlowBars data={stats.series} kind={kind} />
            </section>

            <section className="panel p-5 sm:p-6">
              <h2 className="text-lg font-bold">{type === 'INGRESO' ? 'Fuentes de ingreso' : 'Por categoría'}</h2>
              <p className="mb-4 text-[13px] text-ink-2">Participación sobre el total</p>
              <DonutChart size={176} centerLabel="Total" centerValue={total} data={byCategory.map((c) => ({ name: c.category.name, value: c.total, color: c.category.color }))} />
              <ul className="mt-5 space-y-4">
                {byCategory.slice(0, 5).map((c) => {
                  const b = budgetByCategory.get(c.category.id)
                  return (
                    <li key={c.category.id}>
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={c.category} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{c.category.name}</span>
                        <span className="num text-[13.5px] font-semibold text-ink">{money(c.total)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 pl-10">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${c.share}%`, background: c.category.color }} /></div>
                        <span className="num w-10 text-right text-[12px] text-ink-2">{formatPercent(c.share)}</span>
                      </div>
                      {type === 'EGRESO' && b && b.state !== 'ok' && (
                        <p className={cn('mt-1 pl-10 text-[11.5px] font-semibold', b.state === 'over' ? 'text-expense' : 'text-warn')}>
                          {b.state === 'over' ? 'Superó su presupuesto mensual' : 'Cerca del límite'} ({Math.round(b.percent)}%) · <Link to="/presupuestos" className="underline">ver</Link>
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="panel p-5 sm:p-6">
              <h2 className="text-lg font-bold">Conceptos principales</h2>
              <p className="mb-3 text-[13px] text-ink-2">Los que más pesan en el periodo</p>
              <ul className="divide-y divide-line">
                {concepts.map((c, i) => (
                  <li key={c.concept.id} className="flex items-center gap-3 py-3">
                    <span className="num w-5 text-[12px] font-bold text-ink-3">{i + 1}</span>
                    <CategoryIcon category={c.category} size="sm" />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold text-ink">{c.concept.name}</p><p className="text-[12px] text-ink-2">{c.count} movimiento{c.count === 1 ? '' : 's'}</p></div>
                    <span className="num text-[13.5px] font-semibold text-ink">{money(c.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-3 sm:p-4">
              <div className="flex items-center justify-between px-2 pb-2 pt-2 sm:px-3">
                <h2 className="text-lg font-bold">Recientes</h2>
                <Link to="/movimientos" className="text-[13px] font-semibold text-brand-ink hover:underline">Ver historial</Link>
              </div>
              <ul>{scoped.slice(0, 6).map((t) => <MovementRow key={t.id} tx={t} onClick={actions.view} />)}</ul>
            </section>
          </div>
        </>
      )}
      {actions.element}
    </div>
  )
}
