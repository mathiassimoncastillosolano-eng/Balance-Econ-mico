import { Check, Plus, Search, X } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Button } from '@/components/ui/Button'
import { useTransactions } from '@/hooks/useFinance'
import { useDataStore } from '@/stores/dataStore'
import type { Category, Concept, MovementType } from '@/types/domain'
import { cn } from '@/utils/cn'
import { notify } from '@/utils/notify'

interface ConceptPickerProps {
  type: MovementType
  value: string
  /** Importe escrito hasta ahora; se usa como importe habitual de un concepto nuevo. */
  amount: number
  onSelect: (concept: Concept) => void
  onClear: () => void
  invalid?: boolean
}

/**
 * Selector de concepto en un solo paso: busca, elige entre los más usados o crea uno nuevo
 * dentro de la misma interfaz (eligiendo su categoría), sin salir del registro.
 */
export function ConceptPicker({ type, value, amount, onSelect, onClear, invalid }: ConceptPickerProps) {
  const { data, withDeleted, active } = useTransactions()
  const createConcept = useDataStore((s) => s.createConcept)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(
    () => data.categories.filter((c) => !c.deletedAt && c.status === 'ACTIVO' && c.type === type),
    [data.categories, type],
  )
  const categoryById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories])
  const usage = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of active) map.set(t.conceptId, (map.get(t.conceptId) ?? 0) + 1)
    return map
  }, [active])

  const candidates = useMemo(
    () =>
      data.concepts
        .filter((c) => !c.deletedAt && c.status === 'ACTIVO')
        .filter((c) => categories.some((cat) => cat.id === c.categoryId))
        .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name)),
    [data.concepts, categories, usage],
  )

  const q = query.trim().toLowerCase()
  const filtered = q
    ? candidates.filter((c) => c.name.toLowerCase().includes(q) || (categoryById.get(c.categoryId)?.name ?? '').toLowerCase().includes(q))
    : candidates
  const frequent = candidates.filter((c) => (usage.get(c.id) ?? 0) > 0).slice(0, 5)
  const exact = candidates.some((c) => c.name.toLowerCase() === q)
  const canCreate = q.length > 0 && !exact
  const total = filtered.length + (canCreate ? 1 : 0)

  const selected = value ? withDeleted.find((t) => t.conceptId === value)?.concept ?? data.concepts.find((c) => c.id === value) : undefined
  const selectedCategory: Category | undefined = selected ? categoryById.get(selected.categoryId) : undefined

  function pick(concept: Concept): void {
    onSelect(concept)
    setQuery('')
    setCreating(false)
  }

  async function createIn(category: Category): Promise<void> {
    setBusy(true)
    try {
      const name = query.trim().replace(/\s+/g, ' ')
      const concept = await createConcept({ categoryId: category.id, name: name.charAt(0).toUpperCase() + name.slice(1), baseAmount: amount > 0 ? amount : 0, status: 'ACTIVO' })
      notify.success('Concepto creado', `«${concept.name}» en ${category.name}`)
      pick(concept)
    } catch (e) {
      notify.error(e)
    } finally {
      setBusy(false)
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(total - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[cursor]
      if (item) pick(item)
      else if (canCreate) setCreating(true)
    }
  }

  if (selected && selectedCategory) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border bg-surface-2 p-2.5', invalid ? 'border-expense/60' : 'border-line')}>
        <CategoryIcon category={selectedCategory} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{selected.name}</p>
          <p className="truncate text-[12.5px] text-ink-2">{selectedCategory.name}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { onClear(); setTimeout(() => inputRef.current?.focus(), 30) }}>
          <X className="h-3.5 w-3.5" /> Cambiar
        </Button>
      </div>
    )
  }

  if (creating) {
    return (
      <div className="rounded-xl border border-brand/40 bg-brand-soft/40 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">Nuevo concepto <span className="text-brand-ink">«{query.trim()}»</span></p>
          <button type="button" onClick={() => setCreating(false)} className="text-[12.5px] font-semibold text-ink-2 hover:text-ink">Volver</button>
        </div>
        <p className="mb-2.5 mt-1 text-[12.5px] text-ink-2">¿En qué categoría va?</p>
        {categories.length === 0 ? (
          <p className="rounded-lg bg-warn-soft p-3 text-[12.5px] text-ink-2">No tienes categorías activas de este tipo. Créalas en la sección Categorías.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id} type="button" disabled={busy} onClick={() => void createIn(c)}
                className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink transition-all hover:border-brand hover:shadow-soft disabled:opacity-60"
              >
                <CategoryIcon category={c} size="xs" className="!rounded-full" /> {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border bg-surface-2 transition-colors focus-within:border-brand focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand/15', invalid ? 'border-expense/60' : 'border-line')}>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setCursor(0) }} onKeyDown={onKey}
          role="combobox" aria-expanded aria-controls="concept-options" aria-label="Concepto" autoComplete="off"
          placeholder={type === 'INGRESO' ? 'Busca o escribe un ingreso: Sueldo, Freelance…' : 'Busca o escribe un gasto: Alquiler, Súper…'}
          className="h-11 w-full bg-transparent pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
        />
      </div>
      {!q && frequent.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
          <span className="eyebrow mr-1 self-center">Frecuentes</span>
          {frequent.map((c) => {
            const cat = categoryById.get(c.categoryId)
            return (
              <button key={c.id} type="button" onClick={() => pick(c)} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[12.5px] font-semibold text-ink transition-colors hover:border-brand">
                {cat && <CategoryIcon category={cat} size="xs" className="!h-5 !w-5 !rounded-full" />}{c.name}
              </button>
            )
          })}
        </div>
      )}
      <ul id="concept-options" role="listbox" className="max-h-[188px] overflow-y-auto border-t border-line p-1">
        {filtered.map((c, i) => {
          const cat = categoryById.get(c.categoryId)
          return (
            <li key={c.id} role="option" aria-selected={i === cursor}>
              <button
                type="button" onClick={() => pick(c)} onMouseEnter={() => setCursor(i)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors', i === cursor ? 'bg-surface-3' : 'hover:bg-surface-3')}
              >
                {cat && <CategoryIcon category={cat} size="xs" />}
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{c.name}</span>
                <span className="truncate text-[12px] text-ink-3">{cat?.name}</span>
                {i === cursor && <Check className="h-3.5 w-3.5 text-brand" />}
              </button>
            </li>
          )
        })}
        {canCreate && (
          <li role="option" aria-selected={cursor === filtered.length}>
            <button
              type="button" onClick={() => setCreating(true)} onMouseEnter={() => setCursor(filtered.length)}
              className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-brand-ink transition-colors', cursor === filtered.length ? 'bg-brand-soft' : 'hover:bg-brand-soft')}
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15"><Plus className="h-4 w-4" /></span>
              <span className="text-[13.5px] font-semibold">Crear concepto «{query.trim()}»</span>
            </button>
          </li>
        )}
        {total === 0 && <li className="px-3 py-4 text-center text-[13px] text-ink-3">Escribe para buscar o crear un concepto.</li>}
      </ul>
    </div>
  )
}
