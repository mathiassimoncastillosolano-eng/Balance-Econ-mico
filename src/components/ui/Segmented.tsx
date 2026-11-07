import { LayoutGroup, motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  /** Color de acento del segmento activo (por ejemplo, ingreso/egreso). */
  tone?: 'brand' | 'income' | 'expense'
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  ariaLabel: string
  className?: string
}

const TONE = {
  brand: 'text-brand-ink',
  income: 'text-income',
  expense: 'text-expense',
} as const

export function Segmented<T extends string>({ options, value, onChange, size = 'md', fullWidth, ariaLabel, className }: SegmentedProps<T>) {
  const id = useId()
  return (
    <LayoutGroup id={id}>
      <div
        role="tablist" aria-label={ariaLabel}
        className={cn('inline-flex rounded-xl border border-line bg-surface-3/70 p-1', fullWidth && 'flex w-full', className)}
      >
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value} role="tab" type="button" aria-selected={active} onClick={() => onChange(opt.value)}
              className={cn(
                'relative inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors',
                size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm',
                fullWidth && 'flex-1',
                active ? TONE[opt.tone ?? 'brand'] : 'text-ink-2 hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="seg-pill" className="absolute inset-0 rounded-lg bg-surface shadow-soft ring-1 ring-line"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">{opt.icon}{opt.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
