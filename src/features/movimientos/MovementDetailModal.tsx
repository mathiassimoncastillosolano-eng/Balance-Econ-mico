import { ArchiveRestore, Pencil, Trash2 } from 'lucide-react'
import { Amount } from '@/components/common/Amount'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { ResolvedTransaction } from '@/types/domain'
import { formatDate } from '@/utils/format'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function movementStatus(tx: ResolvedTransaction): { label: string; tone: 'brand' | 'neutral' | 'expense' } {
  if (tx.deletedAt) return { label: 'Eliminado', tone: 'expense' }
  if (tx.updatedAt !== tx.createdAt) return { label: 'Editado', tone: 'brand' }
  return { label: 'Registrado', tone: 'neutral' }
}

const stamp = (iso: string): string => format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: es })

interface Props {
  tx: ResolvedTransaction | null
  open: boolean
  onClose: () => void
  onEdit: (tx: ResolvedTransaction) => void
  onDelete: (tx: ResolvedTransaction) => void
  onRestore: (tx: ResolvedTransaction) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="text-right text-[13.5px] font-semibold text-ink">{children}</dd>
    </div>
  )
}

export function MovementDetailModal({ tx, open, onClose, onEdit, onDelete, onRestore }: Props) {
  const status = tx ? movementStatus(tx) : null
  return (
    <Modal
      open={open} onOpenChange={(o) => { if (!o) onClose() }} size="sm" title="Detalle del movimiento"
      footer={tx && (
        tx.deletedAt ? (
          <Button variant="primary" onClick={() => onRestore(tx)}><ArchiveRestore className="h-4 w-4" /> Restaurar movimiento</Button>
        ) : (
          <>
            <Button variant="dangerSoft" onClick={() => onDelete(tx)}><Trash2 className="h-4 w-4" /> Eliminar</Button>
            <Button variant="primary" onClick={() => onEdit(tx)}><Pencil className="h-4 w-4" /> Editar</Button>
          </>
        )
      )}
    >
      {tx && status && (
        <div>
          <div className="flex flex-col items-center rounded-2xl bg-surface-2 px-4 py-6 text-center">
            <CategoryIcon category={tx.category} size="lg" />
            <p className="mt-3 text-[13px] font-medium text-ink-2">{tx.concept.name}</p>
            <Amount value={tx.amount} type={tx.type} compact={false} className="mt-1 font-display text-[2rem] font-extrabold" />
          </div>
          <dl className="mt-3 divide-y divide-line">
            <Row label="Tipo"><Badge tone={tx.type === 'INGRESO' ? 'income' : 'expense'} dot>{tx.type === 'INGRESO' ? 'Ingreso' : 'Egreso'}</Badge></Row>
            <Row label="Categoría">{tx.category.name}</Row>
            <Row label="Fecha">{formatDate(tx.date)}</Row>
            <Row label="Estado"><Badge tone={status.tone}>{status.label}</Badge></Row>
            <Row label="Nota"><span className="font-normal text-ink-2">{tx.note || 'Sin nota'}</span></Row>
            <Row label="Registrado"><span className="font-normal text-ink-2">{stamp(tx.createdAt)}</span></Row>
            {tx.updatedAt !== tx.createdAt && <Row label="Última edición"><span className="font-normal text-ink-2">{stamp(tx.updatedAt)}</span></Row>}
          </dl>
        </div>
      )}
    </Modal>
  )
}
