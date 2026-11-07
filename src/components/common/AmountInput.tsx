import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { useCurrencySymbol } from '@/hooks/useMoney'
import { cn } from '@/utils/cn'

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onValueChange: (value: string) => void
  invalid?: boolean
  large?: boolean
}

/** Campo numérico con símbolo de moneda; admite coma o punto y limita a 2 decimales. */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { value, onValueChange, invalid, large, className, ...rest }, ref,
) {
  const symbol = useCurrencySymbol()
  function handle(e: ChangeEvent<HTMLInputElement>): void {
    let next = e.target.value.replace(',', '.').replace(/[^\d.]/g, '')
    const firstDot = next.indexOf('.')
    if (firstDot !== -1) next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '')
    const [int = '', dec] = next.split('.')
    next = dec !== undefined ? `${int.slice(0, 9)}.${dec.slice(0, 2)}` : int.slice(0, 9)
    onValueChange(next)
  }
  return (
    <div className="relative">
      <span className={cn('pointer-events-none absolute inset-y-0 left-4 flex items-center font-display font-bold text-ink-3', large ? 'text-xl' : 'text-sm')}>
        {symbol}
      </span>
      <input
        ref={ref} inputMode="decimal" autoComplete="off" placeholder="0.00" value={value} onChange={handle}
        aria-invalid={invalid || undefined}
        className={cn(
          'num w-full rounded-xl border bg-surface-2 font-display font-bold text-ink placeholder:text-ink-3/60 transition-colors',
          'hover:border-line-strong focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/15',
          large ? 'h-16 pl-14 pr-4 text-3xl' : 'h-11 pl-11 pr-3.5 text-sm',
          invalid ? 'border-expense/60 focus:border-expense focus:ring-expense/15' : 'border-line', className,
        )}
        {...rest}
      />
    </div>
  )
}, )
