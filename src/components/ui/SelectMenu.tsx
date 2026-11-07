import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { FloatingPanel, type CloseReason } from '@/components/ui/FloatingPanel'
import { TRIGGER_CLASS } from '@/components/ui/controlStyles'
import { cn } from '@/utils/cn'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  description?: string
  /** Icono o indicador a la izquierda. */
  icon?: ReactNode
  /** Elemento secundario a la derecha (etiqueta, contador…). */
  meta?: ReactNode
  disabled?: boolean
}

export interface SelectMenuProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  id?: string
  placeholder?: string
  'aria-label'?: string
  /** Icono del disparador cuando la opción elegida no define uno propio. */
  leading?: ReactNode
  invalid?: boolean
  disabled?: boolean
  className?: string
  panelClassName?: string
  align?: 'start' | 'end'
  panelMinWidth?: number
  emptyText?: string
}

/**
 * Selector personalizado (patrón «select-only combobox» de WAI-ARIA).
 * El foco se queda en el disparador y la opción resaltada se expone con `aria-activedescendant`.
 * Teclado: ↑ ↓ Inicio Fin · Enter/Espacio elige · Escape cierra · Tab cierra · escribir salta a la opción.
 */
export function SelectMenu<T extends string>({
  value, onChange, options, id, placeholder = 'Seleccionar…', 'aria-label': ariaLabel, leading, invalid, disabled,
  className, panelClassName, align = 'start', panelMinWidth, emptyText = 'Sin opciones',
}: SelectMenuProps<T>) {
  const uid = useId()
  const listId = `${uid}-list`
  const optionId = (i: number): string => `${uid}-opt-${i}`
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const typed = useRef({ text: '', at: 0 })
  /** Solo se hace scroll hasta la opción activa al abrir o navegar con teclado (no al pasar el ratón). */
  const revealActive = useRef(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const firstEnabled = (): number => options.findIndex((o) => !o.disabled)
  const lastEnabled = (): number => options.map((o) => !o.disabled).lastIndexOf(true)
  const step = (from: number, dir: 1 | -1): number => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return i
    return from
  }

  function openMenu(index?: number): void {
    if (disabled) return
    revealActive.current = true
    setActive(index ?? (selectedIndex >= 0 ? selectedIndex : firstEnabled()))
    setOpen(true)
  }
  function closeMenu(reason?: CloseReason): void {
    setOpen(false)
    if (reason !== 'outside') triggerRef.current?.focus()
  }
  function choose(i: number): void {
    const opt = options[i]
    if (!opt || opt.disabled) return
    onChange(opt.value)
    closeMenu()
  }

  useEffect(() => {
    if (!open || !revealActive.current) return
    revealActive.current = false
    document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, uid])

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) return
    const { key } = e
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        e.preventDefault()
        openMenu(key === 'ArrowUp' && selectedIndex < 0 ? lastEnabled() : undefined)
      }
      return
    }
    revealActive.current = true
    switch (key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => step(i, 1)); break
      case 'ArrowUp': e.preventDefault(); setActive((i) => step(i, -1)); break
      case 'Home': e.preventDefault(); setActive(firstEnabled()); break
      case 'End': e.preventDefault(); setActive(lastEnabled()); break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (active >= 0) choose(active)
        break
      case 'Tab': setOpen(false); break
      default:
        if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = e.timeStamp
          typed.current.text = now - typed.current.at > 700 ? key.toLowerCase() : typed.current.text + key.toLowerCase()
          typed.current.at = now
          const text = typed.current.text
          const from = text.length === 1 ? active + 1 : active
          const hit = [...options.keys()].map((_, k) => (from + k) % options.length).find((i) => !options[i].disabled && options[i].label.toLowerCase().startsWith(text))
          if (hit !== undefined) setActive(hit)
        }
    }
  }

  return (
    <div ref={setAnchor} className={cn('relative', className)}>
      <button
        ref={triggerRef} id={id} type="button" role="combobox" disabled={disabled}
        aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined} aria-invalid={invalid || undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        onKeyUp={(e) => { if (e.key === ' ') e.preventDefault() }}
        className={cn(TRIGGER_CLASS, invalid ? 'border-expense/60' : 'border-line')}
      >
        {selected?.icon ?? leading}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-3')}>{selected?.label ?? placeholder}</span>
        <ChevronDown aria-hidden className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180 text-brand')} />
      </button>

      <FloatingPanel
        open={open} anchor={anchor} onClose={closeMenu} matchAnchorWidth minWidth={panelMinWidth} align={align}
        className={panelClassName}
      >
        <ul id={listId} role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-1.5">
          {options.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-3">{emptyText}</li>}
          {options.map((opt, i) => {
            const isSelected = i === selectedIndex
            const isActive = i === active
            return (
              <li
                key={opt.value} id={optionId(i)} role="option" aria-selected={isSelected} aria-disabled={opt.disabled || undefined}
                onMouseMove={() => { if (!opt.disabled && !isActive) setActive(i) }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={cn(
                  'flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                  isSelected ? 'bg-brand-soft text-brand-ink' : 'text-ink',
                  isActive && !isSelected && 'bg-surface-3',
                  isActive && isSelected && 'bg-brand-soft ring-1 ring-inset ring-brand/30',
                  opt.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {opt.icon}
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-medium')}>{opt.label}</span>
                  {opt.description && <span className="block truncate text-[12px] font-normal text-ink-3">{opt.description}</span>}
                </span>
                {opt.meta}
                <Check aria-hidden className={cn('h-4 w-4 shrink-0 text-brand transition-opacity duration-150', isSelected ? 'opacity-100' : 'opacity-0')} />
              </li>
            )
          })}
        </ul>
      </FloatingPanel>
    </div>
  )
}
