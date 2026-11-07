import { Archive, ArrowRightLeft, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CategorySelect } from '@/components/common/CategorySelect'
import { Modal } from '@/components/ui/Modal'
import { useDataStore } from '@/stores/dataStore'
import type { Category } from '@/types/domain'
import { cn } from '@/utils/cn'
import { pluralize } from '@/utils/format'
import { notify } from '@/utils/notify'

type Strategy = 'archive' | 'reassign' | 'deactivate'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  conceptCount: number
  movementCount: number
  budgetCount: number
  onDeleted: () => void
}

/** Estrategia explícita para no dejar movimientos huérfanos al eliminar una categoría. */
export function DeleteCategoryModal({ open, onOpenChange, category, conceptCount, movementCount, budgetCount, onDeleted }: Props) {
  const categories = useDataStore((s) => s.data.categories)
  const deleteCategory = useDataStore((s) => s.deleteCategory)
  const updateCategory = useDataStore((s) => s.updateCategory)
  const [strategy, setStrategy] = useState<Strategy>('archive')
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)

  const targets = categories.filter((c) => !c.deletedAt && c.status === 'ACTIVO' && c.type === category?.type && c.id !== category?.id)
  // Reinicia la selección cada vez que el modal se abre (patrón recomendado: ajustar estado durante el render).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setStrategy('archive'); setTargetId(targets[0]?.id ?? '') }
  }

  if (!category) return null
  const hasLinks = conceptCount > 0 || movementCount > 0

  async function confirm(): Promise<void> {
    if (!category) return
    setBusy(true)
    try {
      if (strategy === 'deactivate') {
        await updateCategory(category.id, { status: 'INACTIVO' })
        notify.success('Categoría desactivada', 'Se conserva todo su historial.')
      } else {
        await deleteCategory(category.id, strategy === 'reassign' ? { strategy: 'reassign', targetId } : { strategy: 'archive' })
        notify.success('Categoría eliminada', strategy === 'reassign' ? 'Sus conceptos y movimientos se movieron.' : 'Su historial se conserva.')
      }
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      notify.error(e)
    } finally {
      setBusy(false)
    }
  }

  const options: { value: Strategy; icon: typeof Archive; title: string; text: string; disabled?: boolean }[] = [
    { value: 'archive', icon: Archive, title: 'Eliminar y conservar el historial', text: 'Deja de estar disponible. Los movimientos pasados siguen visibles y cuentan en los reportes.' },
    { value: 'reassign', icon: ArrowRightLeft, title: 'Mover a otra categoría', text: 'Sus conceptos y movimientos pasan a la categoría que elijas. Los reportes se recalculan.', disabled: targets.length === 0 },
    { value: 'deactivate', icon: PowerOff, title: 'Solo desactivar', text: 'No se elimina nada; simplemente no se ofrecerá en nuevos registros.' },
  ]

  return (
    <Modal
      open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }} size="md"
      title={`Eliminar «${category.name}»`}
      description={hasLinks ? `Esta categoría tiene ${pluralize(conceptCount, 'concepto', 'conceptos')} y ${pluralize(movementCount, 'movimiento', 'movimientos')}${budgetCount ? ' y un presupuesto asociado' : ''}. Elige qué hacer con ellos.` : 'No tiene conceptos ni movimientos asociados.'}
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button><Button variant={strategy === 'deactivate' ? 'primary' : 'danger'} loading={busy} onClick={() => void confirm()} disabled={strategy === 'reassign' && !targetId}>{strategy === 'deactivate' ? 'Desactivar' : strategy === 'reassign' ? 'Mover y eliminar' : 'Eliminar categoría'}</Button></>}
    >
      {hasLinks ? (
        <div role="radiogroup" aria-label="Estrategia" className="space-y-2.5 pt-1">
          {options.map((o) => (
            <label key={o.value} className={cn('flex cursor-pointer gap-3.5 rounded-xl border p-3.5 transition-colors', strategy === o.value ? 'border-brand bg-brand-soft/50' : 'border-line hover:border-line-strong', o.disabled && 'pointer-events-none opacity-50')}>
              <input type="radio" name="strategy" className="sr-only" checked={strategy === o.value} onChange={() => setStrategy(o.value)} disabled={o.disabled} />
              <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg', strategy === o.value ? 'bg-brand text-white' : 'bg-surface-3 text-ink-2')}><o.icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{o.text}</span>
                {o.value === 'reassign' && strategy === 'reassign' && (
                  <CategorySelect aria-label="Categoría de destino" className="mt-3" categories={targets} value={targetId} onChange={setTargetId} />
                )}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="pt-1 text-sm text-ink-2">Se eliminará de forma lógica; podrás volver a crearla cuando quieras.</p>
      )}
    </Modal>
  )
}
