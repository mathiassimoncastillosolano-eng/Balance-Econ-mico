import { toast } from 'sonner'
import { ServiceError } from '@/services/types'

export const notify = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  info: (message: string, description?: string) => toast(message, { description }),
  error: (error: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.') => {
    toast.error(error instanceof ServiceError ? error.message : fallback)
  },
  undo: (message: string, onUndo: () => void) =>
    toast.success(message, { action: { label: 'Deshacer', onClick: onUndo }, duration: 6000 }),
}
