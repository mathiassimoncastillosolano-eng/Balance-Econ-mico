import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatPercent } from '@/utils/format'

interface VariationChipProps {
  value: number | null
  /** En egresos, subir es negativo. */
  inverse?: boolean
  className?: string
}

export function VariationChip({ value, inverse, className }: VariationChipProps) {
  if (value === null) {
    return <span className={cn('inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[11.5px] font-semibold text-brand-ink', className)}>Nuevo</span>
  }
  const flat = Math.abs(value) < 0.5
  const up = value > 0
  const good = flat ? null : inverse ? !up : up
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'num inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
        good === null ? 'bg-surface-3 text-ink-2' : good ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense',
        className,
      )}
      title="Frente al periodo anterior equivalente"
    >
      <Icon className="h-3 w-3" aria-hidden />
      {formatPercent(Math.abs(value), Math.abs(value) < 10 ? 1 : 0)}
    </span>
  )
}
