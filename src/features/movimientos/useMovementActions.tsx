import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import type { ResolvedTransaction } from '@/types/domain'
import { formatDate } from '@/utils/format'
import { notify } from '@/utils/notify'
import { useMoney } from '@/hooks/useMoney'
import { MovementDetailModal } from './MovementDetailModal'

interface MovementActions {
  view: (tx: ResolvedTransaction) => void
  edit: (tx: ResolvedTransaction) => void
  remove: (tx: ResolvedTransaction) => void
  restore: (tx: ResolvedTransaction) => Promise<void>
  /** Diálogos de detalle y eliminación: renderizar una vez en la página. */
  element: ReactNode
}

/** Acciones compartidas sobre un movimiento (ver, editar, eliminar con deshacer, restaurar). */
export function useMovementActions(): MovementActions {
  const openEdit = useUiStore((s) => s.openEditMovement)
  const removeTransaction = useDataStore((s) => s.removeTransaction)
  const restoreTransaction = useDataStore((s) => s.restoreTransaction)
  const money = useMoney()
  const [detail, setDetail] = useState<ResolvedTransaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [target, setTarget] = useState<ResolvedTransaction | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const view = (tx: ResolvedTransaction): void => { setDetail(tx); setDetailOpen(true) }
  const edit = (tx: ResolvedTransaction): void => { setDetailOpen(false); openEdit(tx) }
  const remove = (tx: ResolvedTransaction): void => { setDetailOpen(false); setTarget(tx); setConfirmOpen(true) }

  const restore = async (tx: ResolvedTransaction): Promise<void> => {
    try {
      await restoreTransaction(tx.id)
      setDetailOpen(false)
      notify.success('Movimiento restaurado', 'Volvió a contar en tus indicadores.')
    } catch (e) {
      notify.error(e)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!target) return
    try {
      await removeTransaction(target.id)
      const id = target.id
      notify.undo('Movimiento eliminado', () => { void restoreTransaction(id).then(() => notify.success('Movimiento restaurado')) })
    } catch (e) {
      notify.error(e)
      throw e
    }
  }

  const element = (
    <>
      <MovementDetailModal tx={detail} open={detailOpen} onClose={() => setDetailOpen(false)} onEdit={edit} onDelete={remove} onRestore={(tx) => void restore(tx)} />
      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen} title="¿Eliminar este movimiento?"
        confirmLabel="Eliminar"
        description={target && (
          <>
            <strong className="text-ink">{target.concept.name}</strong> por <strong className="num text-ink">{money(target.amount, { compact: false })}</strong> del {formatDate(target.date)}.
            Dejará de contar en tus indicadores; podrás restaurarlo desde el historial.
          </>
        )}
        onConfirm={confirmDelete}
      />
    </>
  )

  return { view, edit, remove, restore, element }
}
