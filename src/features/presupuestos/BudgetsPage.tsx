import { format, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Gauge, Pencil, Plus, Trash2, TriangleAlert, CircleCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTransactions } from '@/hooks/useFinance'
import { useMoney } from '@/hooks/useMoney'
import { useDataStore } from '@/stores/dataStore'
import type { Budget } from '@/types/domain'
import { cn } from '@/utils/cn'
import { inRange, monthKey, monthLabel, monthRange, shiftMonth } from '@/utils/dates'
import { computeBudgetStatuses, round2, sum, type BudgetStatus } from '@/utils/finance'
import { formatPercent } from '@/utils/format'
import { notify } from '@/utils/notify'
import { BudgetModal } from './BudgetModal'

const STATE_STYLE = {
  ok: { bar: 'bg-brand', pill: 'bg-brand-soft text-brand-ink', label: 'En ritmo' },
  warning: { bar: 'bg-warn', pill: 'bg-warn-soft text-warn', label: 'Cerca del límite' },
  over: { bar: 'bg-expense', pill: 'bg-expense-soft text-expense', label: 'Superado' },
} as const

function BudgetRow({ s, onEdit, onDelete }: { s: BudgetStatus; onEdit: () => void; onDelete: () => void }) {
  const money = useMoney()
  const style = STATE_STYLE[s.state]
  return (
    <li className="panel p-5">
      <div className="flex items-center gap-3.5">
        <CategoryIcon category={s.category} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{s.category.name}</p>
          <p className="num text-[13px] text-ink-2"><span className="font-semibold text-ink">{money(s.spent, { compact: false })}</span> de {money(s.budget.limit, { compact: false })}</p>
        </div>
        <span className={cn('num rounded-full px-2.5 py-1 text-[12px] font-bold', style.pill)}>{formatPercent(s.percent)}</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(s.percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`Consumo de ${s.category.name}`}>
        <div className={cn('h-full rounded-full transition-all duration-700', style.bar)} style={{ width: `${Math.min(100, s.percent)}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={cn('flex items-center gap-1.5 text-[12.5px] font-semibold', s.state === 'over' ? 'text-expense' : s.state === 'warning' ? 'text-warn' : 'text-ink-2')}>
          {s.state !== 'ok' && <TriangleAlert className="h-3.5 w-3.5" />}
          {s.remaining >= 0 ? `Quedan ${money(s.remaining, { compact: false })}` : `Excedido por ${money(-s.remaining, { compact: false })}`}
        </p>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="iconSm" aria-label={`Editar presupuesto de ${s.category.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="iconSm" aria-label={`Eliminar presupuesto de ${s.category.name}`} className="hover:!bg-expense-soft hover:!text-expense" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </li>
  )
}

export default function BudgetsPage() {
  const { data, active } = useTransactions()
  const money = useMoney()
  const createBudget = useDataStore((s) => s.createBudget)
  const removeBudget = useDataStore((s) => s.removeBudget)
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month0: now.getMonth() })
  const [modal, setModal] = useState<{ open: boolean; budget: Budget | null; categoryId?: string; limit?: number }>({ open: false, budget: null })
  const [toDelete, setToDelete] = useState<BudgetStatus | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isCurrent = ym.year === now.getFullYear() && ym.month0 === now.getMonth()
  const statuses = useMemo(() => computeBudgetStatuses(data, active, ym.year, ym.month0), [data, active, ym])
  const range = monthRange(ym.year, ym.month0)

  const expenseCategories = useMemo(() => data.categories.filter((c) => !c.deletedAt && c.type === 'EGRESO' && c.status === 'ACTIVO'), [data.categories])
  const budgeted = new Set(statuses.map((s) => s.category.id))
  const available = expenseCategories.filter((c) => !budgeted.has(c.id))

  const averages = useMemo(() => {
    const map = new Map<string, number>()
    const months = [1, 2, 3].map((i) => monthKey(format(subMonths(new Date(), i), 'yyyy-MM-dd')))
    for (const c of expenseCategories) {
      const total = sum(active.filter((t) => t.category.id === c.id && months.includes(monthKey(t.date))).map((t) => t.amount))
      if (total > 0) map.set(c.id, round2(total / 3))
    }
    return map
  }, [active, expenseCategories])

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of active) if (t.type === 'EGRESO' && inRange(t.date, range)) map.set(t.category.id, round2((map.get(t.category.id) ?? 0) + t.amount))
    return map
  }, [active, range])

  const totalLimit = sum(statuses.map((s) => s.budget.limit))
  const totalSpent = sum(statuses.map((s) => s.spent))
  const totalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
  const over = statuses.filter((s) => s.state === 'over').length
  const warning = statuses.filter((s) => s.state === 'warning').length
  const unbudgetedSpend = sum([...spentByCategory.entries()].filter(([id]) => !budgeted.has(id)).map(([, v]) => v))

  async function quickCreate(categoryId: string, limit: number): Promise<void> {
    try { await createBudget({ categoryId, limit }); notify.success('Presupuesto creado', `Límite sugerido de ${money(limit, { compact: false })}`) } catch (e) { notify.error(e) }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Organización" title="Presupuestos" description="Define límites mensuales por categoría y recibe alertas antes de superarlos."
        actions={
          <>
            <div className="flex items-center rounded-xl border border-line bg-surface p-1">
              <Button variant="ghost" size="iconSm" aria-label="Mes anterior" onClick={() => setYm((v) => shiftMonth(v.year, v.month0, -1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-[132px] text-center text-[13.5px] font-bold text-ink">{monthLabel(ym.year, ym.month0)}</span>
              <Button variant="ghost" size="iconSm" aria-label="Mes siguiente" disabled={isCurrent} onClick={() => setYm((v) => shiftMonth(v.year, v.month0, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="primary" disabled={available.length === 0} onClick={() => setModal({ open: true, budget: null })}><Plus className="h-4 w-4" strokeWidth={2.6} /> Nuevo presupuesto</Button>
          </>
        }
      />

      {statuses.length === 0 ? (
        <section className="panel"><EmptyState icon={Gauge} title="Aún no tienes presupuestos" description="Crea un límite mensual para tus categorías de egreso y MONIQ te avisará cuando te acerques." action={available.length > 0 ? <Button variant="primary" onClick={() => setModal({ open: true, budget: null })}><Plus className="h-4 w-4" /> Crear presupuesto</Button> : undefined} /></section>
      ) : (
        <>
          <section className="panel overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="p-5 sm:p-7">
                <p className="eyebrow">Gastado en categorías presupuestadas</p>
                <p className="num mt-2 font-display text-[2.4rem] font-extrabold leading-none text-ink sm:text-[2.9rem]">{money(totalSpent, { compact: false })}<span className="ml-2 inline-block whitespace-nowrap text-lg font-bold text-ink-3">/ {money(totalLimit)}</span></p>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-3"><div className={cn('h-full rounded-full transition-all duration-700', totalPct >= 100 ? 'bg-expense' : totalPct >= 80 ? 'bg-warn' : 'bg-brand')} style={{ width: `${Math.min(100, totalPct)}%` }} /></div>
                <p className="mt-2.5 text-[13px] text-ink-2">{formatPercent(totalPct)} del total presupuestado{totalLimit - totalSpent >= 0 ? ` · quedan ${money(totalLimit - totalSpent, { compact: false })}` : ` · excedido por ${money(totalSpent - totalLimit, { compact: false })}`}</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line border-t border-line lg:border-l lg:border-t-0">
                {[
                  { k: 'En ritmo', v: statuses.length - over - warning, c: 'text-ink', i: <CircleCheck className="h-4 w-4 text-brand" /> },
                  { k: 'Cerca', v: warning, c: warning ? 'text-warn' : 'text-ink', i: <TriangleAlert className="h-4 w-4 text-warn" /> },
                  { k: 'Superados', v: over, c: over ? 'text-expense' : 'text-ink', i: <TriangleAlert className="h-4 w-4 text-expense" /> },
                ].map((x) => (
                  <div key={x.k} className="flex flex-col items-center justify-center gap-1 p-4 text-center">{x.i}<p className={cn('num font-display text-3xl font-extrabold', x.c)}>{x.v}</p><p className="text-[12px] font-medium text-ink-2">{x.k}</p></div>
                ))}
              </div>
            </div>
            {unbudgetedSpend > 0 && <p className="border-t border-line bg-surface-2/60 px-5 py-3 text-[12.5px] text-ink-2 sm:px-7">Además gastaste <strong className="num text-ink">{money(unbudgetedSpend, { compact: false })}</strong> en categorías sin presupuesto.</p>}
          </section>

          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {statuses.map((s) => <BudgetRow key={s.budget.id} s={s} onEdit={() => setModal({ open: true, budget: s.budget })} onDelete={() => { setToDelete(s); setDeleteOpen(true) }} />)}
          </ul>
        </>
      )}

      {available.length > 0 && (
        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-bold">Categorías sin presupuesto</h2>
          <p className="mb-4 text-[13px] text-ink-2">Crea un límite con un clic usando tu promedio de los últimos 3 meses, o defínelo a tu medida.</p>
          <ul className="divide-y divide-line">
            {available.map((c) => {
              const avg = averages.get(c.id) ?? 0
              const suggested = Math.ceil(avg / 10) * 10
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <CategoryIcon category={c} size="sm" />
                  <div className="min-w-0 flex-1 basis-40"><p className="truncate text-[14px] font-semibold text-ink">{c.name}</p><p className="num text-[12.5px] text-ink-2">{avg > 0 ? `Promedio mensual ${money(avg, { compact: false })}` : 'Sin gasto reciente'} · este mes {money(spentByCategory.get(c.id) ?? 0, { compact: false })}</p></div>
                  {suggested > 0 && isCurrent && <Button size="sm" variant="soft" onClick={() => void quickCreate(c.id, suggested)}>Sugerido {money(suggested, { compact: false })}</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setModal({ open: true, budget: null, categoryId: c.id, limit: suggested || undefined })}>Definir</Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <BudgetModal
        key={`b-${modal.budget?.id ?? modal.categoryId ?? 'new'}-${modal.open}`} open={modal.open} onOpenChange={(o) => setModal((m) => ({ ...m, open: o }))}
        budget={modal.budget} presetCategoryId={modal.categoryId} presetLimit={modal.limit} averages={averages}
        categories={modal.budget ? expenseCategories.filter((c) => c.id === modal.budget?.categoryId).concat(data.categories.filter((c) => c.id === modal.budget?.categoryId && !expenseCategories.some((e) => e.id === c.id))) : available}
      />
      <ConfirmDialog
        open={deleteOpen} onOpenChange={setDeleteOpen} title={`¿Eliminar el presupuesto de ${toDelete?.category.name ?? ''}?`} confirmLabel="Eliminar presupuesto"
        description="La categoría y sus movimientos no se ven afectados; solo dejarás de recibir alertas de este límite."
        onConfirm={async () => { if (toDelete) { try { await removeBudget(toDelete.budget.id); notify.success('Presupuesto eliminado') } catch (e) { notify.error(e); throw e } } }}
      />
    </div>
  )
}

