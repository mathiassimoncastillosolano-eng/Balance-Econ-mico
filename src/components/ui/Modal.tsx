import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Elemento visual junto al título (icono, indicador de tipo…). */
  icon?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  bodyClassName?: string
}

const WIDTH = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[520px]', lg: 'sm:max-w-[640px]', xl: 'sm:max-w-[760px]' } as const

/**
 * Modal accesible (focus trap, Escape, restauración de foco vía Radix).
 * En móvil se presenta como hoja inferior; en pantallas ≥ 640 px, centrado.
 */
export function Modal({ open, onOpenChange, title, description, icon, footer, size = 'md', children, bodyClassName }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={cn('modal-content', WIDTH[size])} aria-describedby={description ? undefined : undefined}>
          <header className="flex items-start gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
            {icon}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-lg font-bold leading-tight text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-ink-2">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <X className="h-[18px] w-[18px]" />
            </Dialog.Close>
          </header>
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6', bodyClassName)}>{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:rounded-b-3xl sm:px-6 sm:pb-4">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
