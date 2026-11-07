import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'dangerSoft'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'iconSm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-[0_1px_0_rgb(255_255_255/.25)_inset,0_6px_16px_-6px_rgb(var(--brand)/.7)] hover:brightness-110 active:brightness-95',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2 active:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink active:bg-surface-3',
  soft: 'bg-brand-soft text-brand-ink hover:brightness-95 active:brightness-90',
  danger: 'bg-expense text-white hover:brightness-110 active:brightness-95',
  dangerSoft: 'bg-expense-soft text-expense hover:brightness-95',
}
const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-[15px]',
  icon: 'h-10 w-10 rounded-xl',
  iconSm: 'h-8 w-8 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }, ref,
) {
  return (
    <button
      ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant], SIZES[size], className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
