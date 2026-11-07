import { CalendarDays, ChevronDown, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Calendar } from '@/components/ui/Calendar'
import { FloatingPanel, type CloseReason } from '@/components/ui/FloatingPanel'
import { TRIGGER_CLASS } from '@/components/ui/controlStyles'
import { formatDisplayDate, formatLongDate, isDayDisabled } from '@/utils/calendar'
import { cn } from '@/utils/cn'
import { todayISO } from '@/utils/dates'

interface DatePickerProps {
  /** yyyy-MM-dd o vacío. */
  value: string
  onChange: (iso: string) => void
  /** Nombre accesible del campo (p. ej. «Desde»). */
  label?: string
  id?: string
  min?: string
  max?: string
  placeholder?: string
  /** Permite vaciar la fecha (botón × y «Limpiar»). */
  clearable?: boolean
  invalid?: boolean
  disabled?: boolean
  /** Banda de rango a resaltar dentro del calendario. */
  rangeFrom?: string
  rangeTo?: string
  /** Mes sobre el que abrir si no hay fecha. */
  defaultFocus?: string
  /** Control externo opcional del panel (para encadenar Desde → Hasta). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  align?: 'start' | 'end'
}

/** Campo de fecha con calendario propio (sustituye al selector nativo del navegador). */
export function DatePicker({
  value, onChange, label = 'Fecha', id, min, max, placeholder = 'Seleccionar', clearable, invalid, disabled,
  rangeFrom, rangeTo, defaultFocus, open: openProp, onOpenChange, className, align = 'start',
}: DatePickerProps) {
  const panelId = useId()
  const today = todayISO()
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState

  function setOpen(next: boolean): void {
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  function onClose(reason: CloseReason): void {
    setOpen(false)
    if (reason === 'escape') triggerRef.current?.focus()
  }
  function pick(iso: string): void {
    onChange(iso)
    setOpen(false)
    triggerRef.current?.focus()
  }
  function clear(): void {
    onChange('')
    setOpen(false)
    triggerRef.current?.focus()
  }

  const showClear = !!clearable && !!value && !disabled
  const todayBlocked = isDayDisabled(today, min, max)

  return (
    <div ref={setAnchor} className={cn('relative', className)}>
      <button
        ref={triggerRef} id={id} type="button" disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} aria-invalid={invalid || undefined}
        aria-label={`${label}: ${value ? formatLongDate(value) : 'sin seleccionar'}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}
        className={cn(TRIGGER_CLASS, showClear ? 'pr-10' : 'pr-3.5', invalid ? 'border-expense/60' : 'border-line')}
      >
        <CalendarDays aria-hidden className={cn('h-4 w-4 shrink-0 transition-colors', value || open ? 'text-brand' : 'text-ink-3')} />
        <span className={cn('num min-w-0 flex-1 truncate', !value && 'text-ink-3')}>{value ? formatDisplayDate(value) : placeholder}</span>
        {!showClear && <ChevronDown aria-hidden className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180 text-brand')} />}
      </button>
      {showClear && (
        <button
          type="button" onClick={clear} aria-label={`Quitar ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-1.5 my-auto grid h-7 w-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <FloatingPanel open={open} anchor={anchor} onClose={onClose} id={panelId} role="dialog" label={`Calendario: ${label}`} align={align} className="w-[296px]" maxHeight={460}>
        <Calendar
          value={value} onSelect={pick} today={today} min={min} max={max}
          rangeFrom={rangeFrom} rangeTo={rangeTo} defaultFocus={defaultFocus} autoFocus
        />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <button
            type="button" onClick={() => pick(today)} disabled={todayBlocked}
            className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-brand-soft disabled:pointer-events-none disabled:opacity-40"
          >
            Hoy
          </button>
          {clearable && (
            <button
              type="button" onClick={clear} disabled={!value}
              className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
            >
              Limpiar
            </button>
          )}
        </div>
      </FloatingPanel>
    </div>
  )
}
