import {
  ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, History, Pencil, Plus, Search, SlidersHorizontal, Trash2, X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Amount } from '@/components/common/Amount'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { CategorySelect } from '@/components/common/CategorySelect'
import { DateShortcutSelect } from '@/components/common/DateShortcutSelect'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { useCurrencySymbol, useMoney } from '@/hooks/useMoney'
import { useTransactions } from '@/hooks/useFinance'
import { useUiStore } from '@/stores/uiStore'
import type { MovementType, ResolvedTransaction } from '@/types/domain'
import { cn } from '@/utils/cn'
import { todayISO } from '@/utils/dates'
import { applyFrom, applyTo } from '@/utils/datePresets'
import { buildExportDataset } from '@/utils/export/dataset'
import type { ExportDataset } from '@/utils/export/types'
import { computeTotals } from '@/utils/finance'
import { formatNumericDate } from '@/utils/calendar'
import { formatShortDate, pluralize } from '@/utils/format'
import { ExportModal } from './ExportModal'
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

interface CategoryOption { id: string; name: string; color: string; icon: string; type: MovementType }

const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Fecha: más reciente' },
  { value: 'date:asc', label: 'Fecha: más antigua' },
  { value: 'amount:desc', label: 'Importe: mayor a menor' },
  { value: 'amount:asc', label: 'Importe: menor a mayor' },
  { value: 'concept:asc', label: 'Concepto: A–Z' },
]

function FilterFields({ filters, set, categories, showSort }: {
  filters: Filters
  set: (patch: Partial<Filters>) => void
  categories: CategoryOption[]
  showSort: boolean
}) {
  const today = todayISO()
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  /** «Personalizado» abre Desde y, al elegirlo, encadena Hasta. */
  const customFlow = useRef(false)
  const range = { from: filters.from, to: filters.to }

  function changeFrom(from: string): void {
    const { range: next, resetTo } = applyFrom(range, from)
    set(next)
    // Rango invertido → «Hasta» se restablece y se pide uno nuevo; en el flujo personalizado se encadena.
    if (from && !next.to && (resetTo || customFlow.current)) setToOpen(true)
    customFlow.current = false
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Field label="Tipo" className="sm:col-span-2 lg:col-span-1">
        <Segmented
          ariaLabel="Tipo" fullWidth size="sm" value={filters.type} onChange={(type) => set({ type })}
          options={[{ value: 'ALL', label: 'Todos' }, { value: 'INGRESO', label: 'Ingresos', tone: 'income' }, { value: 'EGRESO', label: 'Egresos', tone: 'expense' }]}
        />
      </Field>
      <Field label="Categoría" htmlFor="f-cat">
        <CategorySelect id="f-cat" categories={categories} value={filters.categoryId} onChange={(categoryId) => set({ categoryId })} allLabel="Todas" showType />
      </Field>
      <Field label="Atajo de fechas" htmlFor="f-preset">
        <DateShortcutSelect id="f-preset" range={range} onApply={(r) => set(r)} onCustom={() => { customFlow.current = true; setFromOpen(true) }} />
      </Field>
      <Field label="Desde" htmlFor="f-from">
        <DatePicker
          id="f-from" label="Desde" placeholder="Sin límite" clearable max={today} value={filters.from} onChange={changeFrom}
          rangeFrom={filters.from} rangeTo={filters.to} open={fromOpen} onOpenChange={setFromOpen}
        />
      </Field>
      <Field label="Hasta" htmlFor="f-to">
        <DatePicker
          id="f-to" label="Hasta" placeholder="Sin límite" clearable min={filters.from || undefined} max={today} value={filters.to}
          onChange={(to) => set(applyTo(range, to))} defaultFocus={filters.from || undefined}
          rangeFrom={filters.from} rangeTo={filters.to} open={toOpen} onOpenChange={setToOpen} align="end"
        />
      </Field>
      {showSort && (
        <Field label="Ordenar por" htmlFor="f-sort" className="sm:col-span-2">
          <SelectMenu
            id="f-sort" value={`${filters.sortKey}:${filters.sortDir}`} options={SORT_OPTIONS}
            onChange={(v) => { const [k, d] = v.split(':'); set({ sortKey: k as SortKey, sortDir: d as 'asc' | 'desc' }) }}
          />
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
  const [exportOpen, setExportOpen] = useState(false)
  const currencySymbol = useCurrencySymbol()

  const set = (patch: Partial<Filters>): void => { setFilters((f) => ({ ...f, ...patch })); setPage(1) }
  const onSort = (k: SortKey): void => set({ sortKey: k, sortDir: filters.sortKey === k && filters.sortDir === 'desc' ? 'asc' : 'desc' })

  const source = filters.view === 'active' ? active : withDeleted.filter((t) => t.deletedAt)
  const categories = useMemo(
    () => data.categories.filter((c) => !c.deletedAt).map((c): CategoryOption => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, type: c.type })).sort((a, b) => a.name.localeCompare(b.name)),
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

  /** Dataset del conjunto COMPLETO filtrado (no solo la página visible), con totales calculados de esas mismas filas. */
  function buildDataset(): ExportDataset {
    return buildExportDataset({
      transactions: filtered, view: filters.view, q: filters.q, type: filters.type,
      categoryName: categories.find((c) => c.id === filters.categoryId)?.name,
      from: filters.from, to: filters.to, statusLabel: (t) => movementStatus(t).label,
      currencySymbol, formatMoney: (v, o) => money(v, { compact: false, signed: o?.signed }),
    })
  }
  const filterChips = [
    filters.view === 'deleted' ? 'Eliminados' : 'Activos',
    ...(filters.type !== 'ALL' ? [filters.type === 'INGRESO' ? 'Ingresos' : 'Egresos'] : []),
    ...(filters.categoryId ? [categories.find((c) => c.id === filters.categoryId)?.name ?? 'Categoría'] : []),
    ...(filters.from || filters.to ? [filters.from && filters.to ? `${formatNumericDate(filters.from)} – ${formatNumericDate(filters.to)}` : filters.from ? `Desde ${formatNumericDate(filters.from)}` : `Hasta ${formatNumericDate(filters.to)}`] : []),
    ...(filters.q.trim() ? [`«${filters.q.trim()}»`] : []),
  ]

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
            <Button variant="secondary" onClick={() => setExportOpen(true)} disabled={!filtered.length}><Download className="h-4 w-4" /> Exportar</Button>
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
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} count={filtered.length} filterChips={filterChips} buildDataset={buildDataset} />
      {actions.element}
    </div>
  )
}

