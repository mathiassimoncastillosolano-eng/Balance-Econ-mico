import { ArrowLeft, Layers, Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SingleFlowBars } from '@/components/charts/FlowChart'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { Switch } from '@/components/ui/Switch'
import { useTransactions } from '@/hooks/useFinance'
import { useMoney } from '@/hooks/useMoney'
import { useDataStore } from '@/stores/dataStore'
import type { Category, Concept, MovementType, SeriesPoint } from '@/types/domain'
import { cn } from '@/utils/cn'
import { buildBuckets, monthKey, todayISO } from '@/utils/dates'
import { round2, sum } from '@/utils/finance'
import { pluralize } from '@/utils/format'
import { notify } from '@/utils/notify'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { CategoryModal } from './CategoryModal'
import { ConceptModal } from './ConceptModal'
import { DeleteCategoryModal } from './DeleteCategoryModal'

export default function CategoriesPage() {
  const { data, active } = useTransactions()
  const money = useMoney()
  const updateCategory = useDataStore((s) => s.updateCategory)
  const updateConcept = useDataStore((s) => s.updateConcept)
  const deleteConcept = useDataStore((s) => s.deleteConcept)

  const [type, setType] = useState<MovementType>('EGRESO')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [catModal, setCatModal] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null })
  const [conModal, setConModal] = useState<{ open: boolean; concept: Concept | null }>({ open: false, concept: null })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [conceptToDelete, setConceptToDelete] = useState<Concept | null>(null)
  const [conceptConfirm, setConceptConfirm] = useState(false)

  const thisMonth = monthKey(todayISO())
  const stats = useMemo(() => {
    const map = new Map<string, { month: number; total: number; count: number }>()
    for (const t of active) {
      const s = map.get(t.category.id) ?? { month: 0, total: 0, count: 0 }
      s.total = round2(s.total + t.amount)
      s.count += 1
      if (monthKey(t.date) === thisMonth) s.month = round2(s.month + t.amount)
      map.set(t.category.id, s)
    }
    return map
  }, [active, thisMonth])

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.categories
      .filter((c) => !c.deletedAt && c.type === type && (!q || c.name.toLowerCase().includes(q)))
      .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'ACTIVO' ? -1 : 1))
  }, [data.categories, type, query])

  const selected = categories.find((c) => c.id === selectedId) ?? categories[0] ?? null
  const conceptsOf = (id: string): Concept[] => data.concepts.filter((c) => c.categoryId === id && !c.deletedAt)
  const selectedConcepts = selected ? conceptsOf(selected.id) : []
  const selStats = selected ? stats.get(selected.id) ?? { month: 0, total: 0, count: 0 } : { month: 0, total: 0, count: 0 }
  const conceptStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const t of active) {
      const s = map.get(t.conceptId) ?? { total: 0, count: 0 }
      s.total = round2(s.total + t.amount); s.count += 1
      map.set(t.conceptId, s)
    }
    return map
  }, [active])

  const trend = useMemo<SeriesPoint[]>(() => {
    if (!selected) return []
    const now = new Date()
    const range = { from: format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd'), to: format(addMonths(startOfMonth(now), 1), 'yyyy-MM-dd') }
    const mine = active.filter((t) => t.category.id === selected.id)
    return buildBuckets({ from: range.from, to: todayISO() }, 'month').map((b) => {
      const v = sum(mine.filter((t) => t.date >= b.from && t.date <= b.to).map((t) => t.amount))
      return { key: b.key, label: b.label, ingresos: selected.type === 'INGRESO' ? v : 0, egresos: selected.type === 'EGRESO' ? v : 0, neto: v, acumulado: v }
    })
  }, [active, selected])

  const budgetCount = selected ? data.budgets.filter((b) => b.categoryId === selected.id && !b.deletedAt).length : 0

  async function toggleCategory(c: Category, on: boolean): Promise<void> {
    try { await updateCategory(c.id, { status: on ? 'ACTIVO' : 'INACTIVO' }); notify.success(on ? 'Categoría activada' : 'Categoría desactivada') } catch (e) { notify.error(e) }
  }
  async function toggleConcept(c: Concept, on: boolean): Promise<void> {
    try { await updateConcept(c.id, { status: on ? 'ACTIVO' : 'INACTIVO' }) } catch (e) { notify.error(e) }
  }

  const list = (
    <section className={cn('panel flex min-h-0 flex-col overflow-hidden', mobileDetail && 'hidden lg:flex')}>
      <div className="space-y-3 border-b border-line p-4">
        <Segmented ariaLabel="Tipo" fullWidth value={type} onChange={(t) => { setType(t); setSelectedId(null) }} options={[{ value: 'EGRESO', label: 'Egresos', tone: 'expense' }, { value: 'INGRESO', label: 'Ingresos', tone: 'income' }]} />
        <Input aria-label="Buscar categoría" placeholder="Buscar categoría…" leading={<Search className="h-4 w-4" />} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {categories.length === 0 ? (
        <EmptyState compact icon={Layers} title="Sin categorías" description={query ? 'No hay coincidencias.' : 'Crea tu primera categoría de este tipo.'} />
      ) : (
        <ul className="max-h-[640px] flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Categorías">
          {categories.map((c) => {
            const s = stats.get(c.id)
            const isSel = selected?.id === c.id
            return (
              <li key={c.id}>
                <button
                  onClick={() => { setSelectedId(c.id); setMobileDetail(true) }} aria-current={isSel}
                  className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors', isSel ? 'bg-brand-soft/70' : 'hover:bg-surface-2', c.status === 'INACTIVO' && 'opacity-60')}
                >
                  <CategoryIcon category={c} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold text-ink">{c.name}</span>{c.status === 'INACTIVO' && <Badge>Inactiva</Badge>}</span>
                    <span className="block truncate text-[12.5px] text-ink-2">{pluralize(conceptsOf(c.id).length, 'concepto', 'conceptos')}</span>
                  </span>
                  <span className="num text-[13px] font-semibold text-ink">{money(s?.month ?? 0)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="border-t border-line p-3"><Button variant="soft" className="w-full" onClick={() => setCatModal({ open: true, category: null })}><Plus className="h-4 w-4" /> Nueva categoría</Button></div>
    </section>
  )

  const detail = selected ? (
    <section className={cn('space-y-6', !mobileDetail && 'hidden lg:block')}>
      <div className="panel p-5 sm:p-6">
        <button onClick={() => setMobileDetail(false)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink lg:hidden"><ArrowLeft className="h-4 w-4" /> Categorías</button>
        <div className="flex flex-wrap items-start gap-4">
          <CategoryIcon category={selected} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold text-ink">{selected.name}</h2><Badge tone={selected.type === 'INGRESO' ? 'income' : 'expense'} dot>{selected.type === 'INGRESO' ? 'Ingresos' : 'Egresos'}</Badge></div>
            <div className="mt-2 flex items-center gap-2.5 text-[13px] text-ink-2"><Switch checked={selected.status === 'ACTIVO'} onChange={(on) => void toggleCategory(selected, on)} label="Categoría activa" />{selected.status === 'ACTIVO' ? 'Activa' : 'Inactiva'}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCatModal({ open: true, category: selected })}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
            <Button variant="dangerSoft" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" /> Eliminar</Button>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-y-5 border-t border-line pt-5 sm:grid-cols-4">
          {[['Este mes', money(selStats.month, { compact: false })], ['Histórico', money(selStats.total, { compact: false })], ['Movimientos', String(selStats.count)], ['Conceptos', String(selectedConcepts.length)]].map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd className="num mt-1 font-display text-lg font-extrabold text-ink">{v}</dd></div>
          ))}
        </dl>
      </div>

      <div className="panel p-5 sm:p-6">
        <h3 className="text-base font-bold">Últimos 6 meses</h3>
        <p className="mb-3 text-[13px] text-ink-2">Importe mensual de esta categoría</p>
        {selStats.count === 0 ? <p className="rounded-xl bg-surface-2 p-4 text-center text-[13px] text-ink-2">Aún no hay movimientos en esta categoría.</p> : <SingleFlowBars data={trend} kind={selected.type === 'INGRESO' ? 'ingresos' : 'egresos'} height={190} />}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 pb-3 sm:px-6">
          <div><h3 className="text-base font-bold">Conceptos</h3><p className="text-[13px] text-ink-2">Elementos específicos dentro de «{selected.name}»</p></div>
          <Button variant="primary" size="sm" onClick={() => setConModal({ open: true, concept: null })}><Plus className="h-4 w-4" /> Nuevo</Button>
        </div>
        {selectedConcepts.length === 0 ? (
          <EmptyState compact icon={Tag} title="Sin conceptos" description="Los conceptos son lo que realmente registras: Alquiler, Sueldo, Transporte…" action={<Button variant="soft" onClick={() => setConModal({ open: true, concept: null })}>Crear concepto</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {selectedConcepts.map((c) => {
              const cs = conceptStats.get(c.id)
              return (
                <li key={c.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6', c.status === 'INACTIVO' && 'opacity-60')}>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-[14px] font-semibold text-ink">{c.name}</p>
                    <p className="num text-[12.5px] text-ink-2">{c.baseAmount > 0 ? `Habitual ${money(c.baseAmount, { compact: false })}` : 'Sin importe habitual'} · {cs ? pluralize(cs.count, 'uso', 'usos') : 'Sin usos'}</p>
                  </div>
                  {cs && <span className="num text-[13.5px] font-semibold text-ink">{money(cs.total)}</span>}
                  <Switch checked={c.status === 'ACTIVO'} onChange={(on) => void toggleConcept(c, on)} label={`Concepto ${c.name} activo`} />
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="iconSm" aria-label={`Editar ${c.name}`} onClick={() => setConModal({ open: true, concept: c })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="iconSm" aria-label={`Eliminar ${c.name}`} className="hover:!bg-expense-soft hover:!text-expense" onClick={() => { setConceptToDelete(c); setConceptConfirm(true) }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  ) : (
    <section className="panel"><EmptyState icon={Layers} title="Selecciona una categoría" description="Elige una de la lista para ver sus conceptos y estadísticas." /></section>
  )

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Organización" title="Categorías y conceptos" description="Las categorías clasifican; los conceptos son los elementos específicos que registras en cada movimiento." />
      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">{list}{detail}</div>

      <CategoryModal
        key={`c-${catModal.category?.id ?? 'new'}-${catModal.open}`} open={catModal.open} onOpenChange={(o) => setCatModal((s) => ({ ...s, open: o }))}
        category={catModal.category} defaultType={type} typeLocked={!!catModal.category && conceptsOf(catModal.category.id).length > 0}
        onSaved={(c) => { setType(c.type); setSelectedId(c.id) }}
      />
      {selected && (
        <ConceptModal
          key={`k-${conModal.concept?.id ?? 'new'}-${conModal.open}`} open={conModal.open} onOpenChange={(o) => setConModal((s) => ({ ...s, open: o }))}
          concept={conModal.concept} categoryId={selected.id} type={selected.type}
        />
      )}
      <DeleteCategoryModal
        open={deleteOpen} onOpenChange={setDeleteOpen} category={selected} conceptCount={selectedConcepts.length} movementCount={selStats.count} budgetCount={budgetCount}
        onDeleted={() => { setSelectedId(null); setMobileDetail(false) }}
      />
      <ConfirmDialog
        open={conceptConfirm} onOpenChange={setConceptConfirm} title={`¿Eliminar «${conceptToDelete?.name ?? ''}»?`} confirmLabel="Eliminar concepto"
        description={conceptToDelete && (conceptStats.get(conceptToDelete.id)?.count ?? 0) > 0
          ? `Tiene ${pluralize(conceptStats.get(conceptToDelete.id)?.count ?? 0, 'movimiento', 'movimientos')}. Se conservarán en el historial y los reportes, pero el concepto ya no estará disponible para nuevos registros.`
          : 'No tiene movimientos asociados. Podrás volver a crearlo cuando quieras.'}
        onConfirm={async () => { if (conceptToDelete) { try { await deleteConcept(conceptToDelete.id); notify.success('Concepto eliminado') } catch (e) { notify.error(e); throw e } } }}
      />
    </div>
  )
}
