import { addDays, endOfMonth, startOfMonth, startOfYear, subMonths } from 'date-fns'
import {
  ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, History, Pencil, Plus, Search, SlidersHorizontal, Trash2, X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Amount } from '@/components/common/Amount'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { Tooltip } from '@/components/ui/Tooltip'
import { useMoney } from '@/hooks/useMoney'
import { useTransactions } from '@/hooks/useFinance'
import { useUiStore } from '@/stores/uiStore'
import type { MovementType, ResolvedTransaction } from '@/types/domain'
import { cn } from '@/utils/cn'
import { downloadCSV } from '@/utils/csv'
import { toISO, todayISO } from '@/utils/dates'
import { computeTotals } from '@/utils/finance'
import { formatShortDate, pluralize } from '@/utils/format'
import { movementStatus } from './MovementDetailModal'
import { useMovementActions } from './useMovementActions'

type SortKey = 'date' | 'amount' | 'concept'
interface Filters {
  q: string
  type: 'ALL' | MovementType
  categoryId: string
  from: string
  to: string
  view: 'active' | 'deleted'
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
}

const INITIAL: Filters = { q: '', type: 'ALL', categoryId: '', from: '', to: '', view: 'active', sortKey: 'date', sortDir: 'desc' }
const PAGE_SIZE = 12

type Preset = 'all' | 'month' | 'prev' | '90' | 'year'
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date()
  switch (p) {
    case 'month': return { from: toISO(startOfMonth(now)), to: toISO(now) }
    case 'prev': { const m = subMonths(now, 1); return { from: toISO(startOfMonth(m)), to: toISO(endOfMonth(m)) } }
    case '90': return { from: toISO(addDays(now, -89)), to: toISO(now) }
    case 'year': return { from: toISO(startOfYear(now)), to: toISO(now) }
    default: return { from: '', to: '' }
  }
}

function FilterFields({ filters, set, categories, showSort }: {
  filters: Filters
  set: (patch: Partial<Filters>) => void
  categories: { id: string; name: string }[]
  showSort: boolean
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
      <Field label="Tipo" className="sm:col-span-2 lg:col-span-1">
        <Segmented
          ariaLabel="Tipo" fullWidth size="sm" value={filters.type} onChange={(type) => set({ type })}
          options={[{ value: 'ALL', label: 'Todos' }, { value: 'INGRESO', label: 'Ingresos', tone: 'income' }, { value: 'EGRESO', label: 'Egresos', tone: 'expense' }]}
        />
      </Field>
      <Field label="Categoría" htmlFor="f-cat">
        <Select id="f-cat" value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
          <option value="">Todas</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Atajo de fechas" htmlFor="f-preset">
        <Select id="f-preset" value="" onChange={(e) => { if (e.target.value) set(presetRange(e.target.value as Preset)) }}>
          <option value="">Elegir…</option>
          <option value="all">Todo el historial</option>
          <option value="month">Este mes</option>
          <option value="prev">Mes anterior</option>
          <option value="90">Últimos 90 días</option>
          <option value="year">Este año</option>
        </Select>
      </Field>
      <Field label="Desde" htmlFor="f-from"><Input id="f-from" type="date" max={filters.to || todayISO()} value={filters.from} onChange={(e) => set({ from: e.target.value })} /></Field>
      <Field label="Hasta" htmlFor="f-to"><Input id="f-to" type="date" min={filters.from} max={todayISO()} value={filters.to} onChange={(e) => set({ to: e.target.value })} /></Field>
      {showSort && (
        <Field label="Ordenar por" htmlFor="f-sort" className="sm:col-span-2">
          <Select
            id="f-sort" value={`${filters.sortKey}:${filters.sortDir}`}
            onChange={(e) => { const [k, d] = e.target.value.split(':'); set({ sortKey: k as SortKey, sortDir: d as 'asc' | 'desc' }) }}
          >
            <option value="date:desc">Fecha: más reciente</option>
            <option value="date:asc">Fecha: más antigua</option>
            <option value="amount:desc">Importe: mayor a menor</option>
            <option value="amount:asc">Importe: menor a mayor</option>
            <option value="concept:asc">Concepto: A–Z</option>
          </Select>
        </Field>
      )}
    </div>
  )
}

function SortHeader({ label, k, filters, onSort, align = 'left' }: { label: string; k: SortKey; filters: Filters; onSort: (k: SortKey) => void; align?: 'left' | 'right' }) {
  const active = filters.sortKey === k
  const Icon = !active ? ArrowUpDown : filters.sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (filters.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('px-4 py-3 font-semibold', align === 'right' && 'text-right')}>
      <button onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1.5 transition-colors hover:text-ink', active && 'text-ink', align === 'right' && 'flex-row-reverse')}>
        {label}<Icon className={cn('h-3.5 w-3.5', !active && 'opacity-50')} />
      </button>
    </th>
  )
}

export default function HistoryPage() {
  const { data, active, withDeleted } = useTransactions()
  const money = useMoney()
  const openCreate = useUiStore((s) => s.openCreateMovement)
  const actions = useMovementActions()
  const [filters, setFilters] = useState<Filters>(INITIAL)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const set = (patch: Partial<Filters>): void => { setFilters((f) => ({ ...f, ...patch })); setPage(1) }
  const onSort = (k: SortKey): void => set({ sortKey: k, sortDir: filters.sortKey === k && filters.sortDir === 'desc' ? 'asc' : 'desc' })

  const source = filters.view === 'active' ? active : withDeleted.filter((t) => t.deletedAt)
  const categories = useMemo(
    () => data.categories.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [data.categories],
  )

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const list = source.filter((t) => {
      if (filters.type !== 'ALL' && t.type !== filters.type) return false
      if (filters.categoryId && t.category.id !== filters.categoryId) return false
      if (filters.from && t.date < filters.from) return false
      if (filters.to && t.date > filters.to) return false
      if (q && !`${t.concept.name} ${t.category.name} ${t.note}`.toLowerCase().includes(q)) return false
      return true
    })
    const dir = filters.sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (filters.sortKey === 'amount') return (a.amount - b.amount) * dir
      if (filters.sortKey === 'concept') return a.concept.name.localeCompare(b.concept.name) * dir
      return (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)) * dir
    })
  }, [source, filters])

  const totals = computeTotals(filtered)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const activeFilters = [filters.type !== 'ALL', !!filters.categoryId, !!filters.from, !!filters.to].filter(Boolean).length

  function exportCsv(): void {
    downloadCSV(`moniq-movimientos-${todayISO()}.csv`, [
      ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Nota', 'Importe', 'Estado'],
      ...filtered.map((t) => [t.date, t.type === 'INGRESO' ? 'Ingreso' : 'Egreso', t.category.name, t.concept.name, t.note, t.amount.toFixed(2), movementStatus(t).label]),
    ])
  }

  const rowActions = (t: ResolvedTransaction) => (
    <div className="flex items-center justify-end gap-0.5">
      <Tooltip content="Ver detalle"><Button variant="ghost" size="iconSm" aria-label="Ver detalle" onClick={() => actions.view(t)}><Eye className="h-4 w-4" /></Button></Tooltip>
      {t.deletedAt ? (
        <Tooltip content="Restaurar"><Button variant="ghost" size="iconSm" aria-label="Restaurar" onClick={() => void actions.restore(t)}><ArchiveRestore className="h-4 w-4" /></Button></Tooltip>
      ) : (
        <>
          <Tooltip content="Editar"><Button variant="ghost" size="iconSm" aria-label="Editar" onClick={() => actions.edit(t)}><Pencil className="h-4 w-4" /></Button></Tooltip>
          <Tooltip content="Eliminar"><Button variant="ghost" size="iconSm" aria-label="Eliminar" className="hover:!bg-expense-soft hover:!text-expense" onClick={() => actions.remove(t)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trazabilidad" title="Historial de movimientos"
        description="Cada operación registrada, con búsqueda, filtros y la posibilidad de editar, eliminar o restaurar."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4" /> Exportar CSV</Button>
            <Button variant="primary" onClick={() => openCreate()} className="sm:hidden"><Plus className="h-4 w-4" /> Nuevo</Button>
          </>
        }
      />

      <section className="panel overflow-hidden">
        <div className="space-y-4 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input aria-label="Buscar movimientos" placeholder="Buscar por concepto, categoría o nota…" leading={<Search className="h-4 w-4" />} value={filters.q} onChange={(e) => set({ q: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Segmented ariaLabel="Vista" size="sm" value={filters.view} onChange={(view) => set({ view })} options={[{ value: 'active', label: 'Activos' }, { value: 'deleted', label: 'Eliminados' }]} />
              <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Filtros{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] text-white">{activeFilters}</span>}
              </Button>
            </div>
          </div>
          <div className="hidden lg:block"><FilterFields filters={filters} set={set} categories={categories} showSort={false} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-surface-2/60 px-4 py-3 text-[13px] sm:px-5">
          <span className="font-semibold text-ink">{pluralize(filtered.length, 'movimiento', 'movimientos')}</span>
          {filters.view === 'active' && (
            <>
              <span className="text-ink-2">Ingresos <strong className="num text-income">{money(totals.ingresos, { compact: false })}</strong></span>
              <span className="text-ink-2">Egresos <strong className="num text-expense">{money(totals.egresos, { compact: false })}</strong></span>
              <span className="text-ink-2">Neto <strong className={cn('num', totals.neto >= 0 ? 'text-income' : 'text-expense')}>{money(totals.neto, { compact: false, signed: true })}</strong></span>
            </>
          )}
          {(activeFilters > 0 || filters.q) && (
            <button onClick={() => set({ ...INITIAL, view: filters.view })} className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-ink hover:underline"><X className="h-3.5 w-3.5" /> Limpiar filtros</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title={filters.view === 'deleted' ? 'No hay movimientos eliminados' : source.length === 0 ? 'Aún no hay movimientos' : 'Sin resultados'}
            description={filters.view === 'deleted' ? 'Los movimientos que elimines aparecerán aquí y podrás restaurarlos.' : source.length === 0 ? 'Registra tu primer ingreso o egreso para empezar a construir tu historial.' : 'Prueba con otros filtros o una búsqueda distinta.'}
            action={source.length === 0 && filters.view === 'active' ? <Button variant="primary" onClick={() => openCreate()}><Plus className="h-4 w-4" /> Registrar movimiento</Button> : undefined}
          />
        ) : (
          <>
            {/* Tabla (≥ md) */}
            <div className="scroll-x hidden md:block">
              <table className="w-full min-w-[820px] text-left text-[13.5px]">
                <thead className="border-b border-line text-[12px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <SortHeader label="Fecha" k="date" filters={filters} onSort={onSort} />
                    <SortHeader label="Concepto" k="concept" filters={filters} onSort={onSort} />
                    <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                    <SortHeader label="Importe" k="amount" filters={filters} onSort={onSort} align="right" />
                    <th scope="col" className="w-[132px] px-4 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((t) => {
                    const st = movementStatus(t)
                    return (
                      <tr key={t.id} className={cn('group transition-colors hover:bg-surface-2/70', t.deletedAt && 'opacity-70')}>
                        <td className="num whitespace-nowrap px-4 py-3 text-ink-2">{formatShortDate(t.date)} <span className="text-ink-3">{t.date.slice(0, 4)}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={() => actions.view(t)} className="flex max-w-[360px] items-center gap-3 text-left">
                            <CategoryIcon category={t.category} size="sm" />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">{t.concept.name}</span>
                              <span className="block truncate text-[12.5px] text-ink-2">{t.category.name}{t.note ? ` · ${t.note}` : ''}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3"><Badge tone={t.type === 'INGRESO' ? 'income' : 'expense'} dot>{t.type === 'INGRESO' ? 'Ingreso' : 'Egreso'}</Badge></td>
                        <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                        <td className="px-4 py-3 text-right"><Amount value={t.amount} type={t.type} compact={false} /></td>
                        <td className="px-3 py-3">{rowActions(t)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (< md) */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((t) => (
                <li key={t.id} className={cn('p-4', t.deletedAt && 'opacity-70')}>
                  <button onClick={() => actions.view(t)} className="flex w-full items-center gap-3 text-left">
                    <CategoryIcon category={t.category} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-ink">{t.concept.name}</span>
                      <span className="block truncate text-[12.5px] text-ink-2">{t.category.name} · {formatShortDate(t.date)}</span>
                    </span>
                    <Amount value={t.amount} type={t.type} className="text-[14.5px]" />
                  </button>
                  <div className="mt-2.5 flex items-center justify-between">
                    <Badge tone={movementStatus(t).tone}>{movementStatus(t).label}</Badge>
                    {rowActions(t)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-ink-2 sm:px-5">
              <span className="num">{(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>Anterior</Button>
                <span className="num min-w-[56px] text-center font-semibold text-ink">{current} / {pages}</span>
                <Button size="sm" variant="secondary" disabled={current >= pages} onClick={() => setPage(current + 1)}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        open={filtersOpen} onOpenChange={setFiltersOpen} title="Filtros" description="Los resultados se actualizan al instante." size="md"
        footer={<><Button variant="secondary" onClick={() => set({ ...INITIAL, q: filters.q, view: filters.view })}>Limpiar</Button><Button variant="primary" onClick={() => setFiltersOpen(false)}>Ver {pluralize(filtered.length, 'resultado', 'resultados')}</Button></>}
      >
        <FilterFields filters={filters} set={set} categories={categories} showSort />
      </Modal>
      {actions.element}
    </div>
  )
}

