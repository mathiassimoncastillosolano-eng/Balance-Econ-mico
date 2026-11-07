import { ArrowRight, Lightbulb, Receipt, ShieldCheck, TriangleAlert, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DonutChart } from '@/components/charts/DonutChart'
import { IncomeExpenseArea, Sparkline } from '@/components/charts/FlowChart'
import { useChartTheme } from '@/components/charts/useChartTheme'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { PeriodSelect } from '@/components/common/PeriodSelect'
import { VariationChip } from '@/components/common/VariationChip'
import { Button } from '@/components/ui/Button'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { usePeriodStats } from '@/hooks/useFinance'
import { useMoney } from '@/hooks/useMoney'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { periodLabel } from '@/utils/dates'
import { formatDate, formatPercent } from '@/utils/format'
import { MovementRow } from '../movimientos/MovementRow'
import { useMovementActions } from '../movimientos/useMovementActions'
import { buildInsights } from './insights'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

function HeroStat({ label, value, change, inverse, tone, icon: Icon }: {
  label: string; value: string; change: number | null; inverse?: boolean; tone: 'income' | 'expense' | 'neutral'; icon: typeof Wallet
}) {
  return (
    <div className="min-w-0 flex-1 px-1 py-4 sm:px-4 sm:py-1">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-white/55">
        <span className={cn('grid h-6 w-6 place-items-center rounded-md', tone === 'income' ? 'bg-[#19D3A2]/15 text-[#19D3A2]' : tone === 'expense' ? 'bg-[#FF7568]/15 text-[#FF8A7C]' : 'bg-white/10 text-white')}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <p className="num mt-2 whitespace-nowrap font-display text-[1.3rem] font-extrabold leading-none text-white xl:text-[1.45rem]">{value}</p>
      <div className="mt-2.5 flex items-center gap-2"><VariationChip value={change} inverse={inverse} /><span className="text-[11.5px] text-white/40">vs. anterior</span></div>
    </div>
  )
}

export default function DashboardPage() {
  const stats = usePeriodStats()
  const money = useMoney()
  const user = useAuthStore((s) => s.user)
  const openCreate = useUiStore((s) => s.openCreateMovement)
  const { all: budgets } = useBudgetAlerts()
  const actions = useMovementActions()
  const chart = useChartTheme()
  const { totals, changes, series, expenseByCategory, txs } = stats

  const insights = useMemo(() => buildInsights(stats, budgets, (n) => money(n, { compact: false })), [stats, budgets, money])
  const spark = useMemo(() => series.map((p) => ({ v: p.acumulado })), [series])
  const recent = txs.slice(0, 6)
  const topCats = expenseByCategory.slice(0, 5)
  const riskyBudgets = budgets.filter((b) => b.state !== 'ok').slice(0, 3)

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow={formatDate(new Date().toISOString().slice(0, 10), "EEEE d 'de' MMMM")}
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description={`Resumen del periodo · ${periodLabel(stats.range)}`}
        actions={<div className="w-full sm:w-auto"><PeriodSelect /></div>}
      />

      {/* Hero: saldo disponible + indicadores del periodo */}
      <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0B2250_0%,#0A1B3D_55%,#071331_100%)] p-5 text-white shadow-lift sm:p-8" aria-label="Resumen financiero">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2F6BFF]/30 blur-[90px]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] xl:items-center">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">Dinero disponible</p>
            <p className="num mt-2 break-words font-display text-[2.6rem] font-extrabold leading-none tracking-tight sm:text-[3.2rem]">{money(stats.availableBalance, { compact: false })}</p>
            <p className="mt-2 text-[13px] text-white/50">Saldo acumulado hasta hoy</p>
            <div className="-mx-1 mt-3 h-[64px]"><Sparkline data={spark.length > 1 ? spark : [{ v: 0 }, { v: 0 }]} color="#7DB4FF" /></div>
          </div>
          <div className="grid divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-2 sm:py-5">
            <HeroStat label="Balance neto" value={money(totals.neto, { signed: true })} change={changes.neto} tone="neutral" icon={Wallet} />
            <HeroStat label="Ingresos" value={money(totals.ingresos)} change={changes.ingresos} tone="income" icon={TrendingUp} />
            <HeroStat label="Egresos" value={money(totals.egresos)} change={changes.egresos} inverse tone="expense" icon={TrendingDown} />
          </div>
        </div>
      </section>

      {txs.length === 0 ? (
        <section className="panel">
          <EmptyState icon={Receipt} title="Sin movimientos en este periodo" description="Registra un ingreso o un egreso, o cambia el periodo para ver tu actividad." action={<Button variant="primary" onClick={() => openCreate()}>Registrar movimiento</Button>} />
        </section>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section className="panel p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-lg font-bold">Ingresos y egresos</h2><p className="text-[13px] text-ink-2">Evolución dentro del periodo seleccionado</p></div>
                <div className="flex items-center gap-4 text-[12.5px] font-medium text-ink-2">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chart.income }} />Ingresos</span>
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: chart.expense }} />Egresos</span>
                </div>
              </div>
              <IncomeExpenseArea data={series} height={296} />
            </section>

            <section className="panel p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div><h2 className="text-lg font-bold">Gastos por categoría</h2><p className="text-[13px] text-ink-2">Dónde se concentra tu dinero</p></div>
              </div>
              {topCats.length === 0 ? (
                <EmptyState compact icon={Wallet} title="Sin egresos" description="Aún no hay gastos en este periodo." />
              ) : (
                <>
                  <DonutChart size={190} centerLabel="Egresos" centerValue={totals.egresos} data={expenseByCategory.map((c) => ({ name: c.category.name, value: c.total, color: c.category.color }))} />
                  <ul className="mt-5 space-y-3">
                    {topCats.map((c) => (
                      <li key={c.category.id} className="flex items-center gap-3">
                        <CategoryIcon category={c.category} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{c.category.name}</span>
                        <span className="num text-[12.5px] text-ink-2">{formatPercent(c.share)}</span>
                        <span className="num w-[84px] text-right text-[13.5px] font-semibold text-ink">{money(c.total)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section className="panel p-3 sm:p-4">
              <div className="flex items-center justify-between px-2 pb-2 pt-2 sm:px-3">
                <h2 className="text-lg font-bold">Últimos movimientos</h2>
                <Link to="/movimientos" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-ink hover:underline">Ver historial <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
              <ul>{recent.map((t) => <MovementRow key={t.id} tx={t} onClick={actions.view} />)}</ul>
            </section>

            <section className="panel space-y-5 p-5 sm:p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold"><Lightbulb className="h-[18px] w-[18px] text-brand" /> Lecturas de MONIQ</h2>
                <ul className="mt-4 space-y-3.5">
                  {insights.length === 0 && <li className="text-[13px] text-ink-2">Registra más movimientos para recibir lecturas.</li>}
                  {insights.map((i) => (
                    <li key={i.id} className="flex gap-3">
                      <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', i.tone === 'positive' && 'bg-income-soft text-income', i.tone === 'negative' && 'bg-expense-soft text-expense', i.tone === 'warning' && 'bg-warn-soft text-warn', i.tone === 'neutral' && 'bg-brand-soft text-brand-ink')}>
                        {i.tone === 'positive' ? <ShieldCheck className="h-4 w-4" /> : i.tone === 'neutral' ? <Lightbulb className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0"><p className="text-[13.5px] font-semibold leading-snug text-ink">{i.title}</p><p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{i.body}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
              {riskyBudgets.length > 0 && (
                <div className="border-t border-line pt-4">
                  <div className="mb-2.5 flex items-center justify-between"><p className="eyebrow">Presupuestos en riesgo</p><Link to="/presupuestos" className="text-[12px] font-semibold text-brand-ink hover:underline">Gestionar</Link></div>
                  <ul className="space-y-3">
                    {riskyBudgets.map((b) => (
                      <li key={b.budget.id}>
                        <div className="mb-1.5 flex items-center justify-between text-[13px]"><span className="font-semibold text-ink">{b.category.name}</span><span className={cn('num font-bold', b.state === 'over' ? 'text-expense' : 'text-warn')}>{Math.round(b.percent)}%</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className={cn('h-full rounded-full', b.state === 'over' ? 'bg-expense' : 'bg-warn')} style={{ width: `${Math.min(100, b.percent)}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </>
      )}
      {actions.element}
    </div>
  )
}
