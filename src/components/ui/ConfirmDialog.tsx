import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => Promise<void> | void
}

/** Confirmación para acciones destructivas o relevantes. Mantiene el diálogo abierto mientras procesa. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, cancelLabel = 'Cancelar', tone = 'danger', onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const Icon = tone === 'danger' ? AlertTriangle : HelpCircle

  async function handleConfirm(): Promise<void> {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="modal-overlay" />
        <AlertDialog.Content className="modal-content sm:max-w-[440px]">
          <div className="px-5 pb-2 pt-6 sm:px-6">
            <div className={cn('mb-4 grid h-11 w-11 place-items-center rounded-xl', tone === 'danger' ? 'bg-expense-soft text-expense' : 'bg-brand-soft text-brand-ink')}>
              <Icon className="h-5 w-5" />
            </div>
            <AlertDialog.Title className="font-display text-lg font-bold text-ink">{title}</AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div className="mt-2 text-sm leading-relaxed text-ink-2">{description}</div>
            </AlertDialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={busy}>{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={() => void handleConfirm()}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
