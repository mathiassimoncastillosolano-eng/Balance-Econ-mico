import { ChevronDown } from 'lucide-react'
import {
  forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/utils/cn'

const control =
  'w-full rounded-xl border bg-surface-2 text-sm text-ink placeholder:text-ink-3 transition-colors duration-150 ' +
  'hover:border-line-strong focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
  optional?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, htmlFor, optional, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
          <span>{label}</span>
          {optional && <span className="text-[11px] font-medium text-ink-3">Opcional</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[12px] font-medium text-expense">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, trailing, className, ...rest }, ref,
) {
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-3">{leading}</span>}
      <input
        ref={ref} aria-invalid={invalid || undefined}
        className={cn(control, 'h-11 px-3.5', leading && 'pl-10', trailing && 'pr-11', invalid ? 'border-expense/60 focus:border-expense focus:ring-expense/15' : 'border-line', className)}
        {...rest}
      />
      {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref} rows={2} aria-invalid={invalid || undefined}
        className={cn(control, 'resize-none px-3.5 py-2.5', invalid ? 'border-expense/60' : 'border-line', className)}
        {...rest}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref} aria-invalid={invalid || undefined}
          className={cn(control, 'h-11 cursor-pointer appearance-none px-3.5 pr-10', invalid ? 'border-expense/60' : 'border-line', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      </div>
    )
  },
)

export function useFieldId(): string {
  return useId()
}
