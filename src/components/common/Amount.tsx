import { useMoney } from '@/hooks/useMoney'
import type { MovementType } from '@/types/domain'
import { cn } from '@/utils/cn'

interface AmountProps {
  value: number
  type?: MovementType
  /** Muestra +/− según el tipo. */
  signed?: boolean
  compact?: boolean
  className?: string
}

/** Importe con color semántico consistente: esmeralda = ingreso, coral = egreso. */
export function Amount({ value, type, signed = true, compact, className }: AmountProps) {
  const money = useMoney()
  const shown = type === 'EGRESO' ? -Math.abs(value) : value
  return (
    <span
      className={cn('num font-semibold', type === 'INGRESO' && 'text-income', type === 'EGRESO' && 'text-expense', className)}
    >
      {money(type ? shown : value, { signed: signed && type === 'INGRESO', compact })}
    </span>
  )
}
