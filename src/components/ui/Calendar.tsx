import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  addDaysISO, addMonthsISO, buildMonthGrid, clampISO, daysInMonth, formatLongDate, isDayDisabled, isMonthDisabled,
  isValidISO, MONTHS_ES, MONTHS_ES_SHORT, parseISODate, toISODate, weekdayIndex, WEEKDAYS_ES_LONG, WEEKDAYS_ES_SHORT,
} from '@/utils/calendar'
import { cn } from '@/utils/cn'

interface CalendarProps {
  /** Fecha seleccionada (yyyy-MM-dd) o vacío. */
  value: string
  onSelect: (iso: string) => void
  /** «Hoy» (yyyy-MM-dd), calculado en local por quien lo usa. */
  today: string
  min?: string
  max?: string
  /** Extremos de un rango a resaltar como banda (p. ej. Desde/Hasta del filtro). */
  rangeFrom?: string
  rangeTo?: string
  /** Fecha sobre la que abrir si `value` está vacío. */
  defaultFocus?: string
  /** Mueve el foco a la cuadrícula al montar (cuando el calendario se abre desde un disparador). */
  autoFocus?: boolean
}

type Mode = 'days' | 'months' | 'years'
const YEARS_PER_PAGE = 12

const navBtn =
  'grid h-8 w-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink disabled:pointer-events-none disabled:opacity-30'

/**
 * Calendario personalizado: vista de días con navegación por mes, y vistas de meses y años para saltar
 * rápidamente. Semana desde lunes, día actual marcado, banda opcional de rango, límites min/max.
 * Teclado (cuadrícula de días): flechas ±1/±7 días, Inicio/Fin (semana), RePág/AvPág (mes; con Mayús, año).
 */
export function Calendar({ value, onSelect, today, min, max, rangeFrom, rangeTo, defaultFocus, autoFocus }: CalendarProps) {
  const start = clampISO(isValidISO(value) ? value : defaultFocus && isValidISO(defaultFocus) ? defaultFocus : today, min, max)
  const [focusIso, setFocusIso] = useState(start)
  const [view, setView] = useState(() => {
    const p = parseISODate(start) as { y: number; m: number }
    return { y: p.y, m: p.m }
  })
  const [mode, setMode] = useState<Mode>('days')
  const rootRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(!!autoFocus)

  // Tras una acción de teclado/modo, devuelve el foco al elemento «activo» de la vista.
  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    const target = rootRef.current?.querySelector<HTMLButtonElement>('[data-roving="true"]:not(:disabled)')
    target?.focus()
  })

  const setDayFocus = (iso: string, keepFocus = true): void => {
    const p = parseISODate(iso)
    if (!p) return
    pendingFocus.current = keepFocus
    setFocusIso(iso)
    setView({ y: p.y, m: p.m })
  }

  const shiftMonths = (delta: number): void => {
    const next = clampISO(addMonthsISO(focusIso, delta), min, max)
    setDayFocus(next, false)
  }

  const prevView = parseISODate(addMonthsISO(toISODate({ y: view.y, m: view.m, d: 1 }), -1)) as { y: number; m: number }
  const nextView = parseISODate(addMonthsISO(toISODate({ y: view.y, m: view.m, d: 1 }), 1)) as { y: number; m: number }
  const minYear = min ? parseISODate(min)?.y : undefined
  const maxYear = max ? parseISODate(max)?.y : undefined
  const yearPageStart = Math.floor(view.y / YEARS_PER_PAGE) * YEARS_PER_PAGE

  function onDaysKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    const wd = weekdayIndex(focusIso)
    let next: string
    switch (e.key) {
      case 'ArrowLeft': next = addDaysISO(focusIso, -1); break
      case 'ArrowRight': next = addDaysISO(focusIso, 1); break
      case 'ArrowUp': next = addDaysISO(focusIso, -7); break
      case 'ArrowDown': next = addDaysISO(focusIso, 7); break
      case 'Home': next = addDaysISO(focusIso, -wd); break
      case 'End': next = addDaysISO(focusIso, 6 - wd); break
      case 'PageUp': next = addMonthsISO(focusIso, e.shiftKey ? -12 : -1); break
      case 'PageDown': next = addMonthsISO(focusIso, e.shiftKey ? 12 : 1); break
      default: return
    }
    e.preventDefault()
    setDayFocus(clampISO(next, min, max))
  }

  /** Flechas dentro de las cuadrículas de meses/años: mueve el foco entre botones habilitados. */
  function onTilesKeyDown(e: KeyboardEvent<HTMLDivElement>, columns: number): void {
    const moves: Record<string, number | undefined> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }
    const delta = moves[e.key]
    if (delta === undefined) return
    e.preventDefault()
    const tiles = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement)
    tiles[Math.min(Math.max(index + delta, 0), tiles.length - 1)]?.focus()
  }

  function pickMonth(m: number): void {
    const day = Math.min(parseISODate(focusIso)?.d ?? 1, daysInMonth(view.y, m))
    setMode('days')
    setDayFocus(clampISO(toISODate({ y: view.y, m, d: day }), min, max))
  }
  function pickYear(y: number): void {
    pendingFocus.current = true
    setView((v) => ({ ...v, y }))
    setMode('months')
  }

  const title = mode === 'days' ? `${MONTHS_ES[view.m]} ${view.y}` : mode === 'months' ? String(view.y) : `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}`
  const canPrev = mode === 'days' ? !isMonthDisabled(prevView.y, prevView.m, min, max) : mode === 'months' ? minYear === undefined || view.y - 1 >= minYear : minYear === undefined || yearPageStart - 1 >= minYear
  const canNext = mode === 'days' ? !isMonthDisabled(nextView.y, nextView.m, min, max) : mode === 'months' ? maxYear === undefined || view.y + 1 <= maxYear : maxYear === undefined || yearPageStart + YEARS_PER_PAGE <= maxYear

  function goPrev(): void {
    if (mode === 'days') shiftMonths(-1)
    else if (mode === 'months') setView((v) => ({ ...v, y: v.y - 1 }))
    else setView((v) => ({ ...v, y: v.y - YEARS_PER_PAGE }))
  }
  function goNext(): void {
    if (mode === 'days') shiftMonths(1)
    else if (mode === 'months') setView((v) => ({ ...v, y: v.y + 1 }))
    else setView((v) => ({ ...v, y: v.y + YEARS_PER_PAGE }))
  }

  const grid = buildMonthGrid(view.y, view.m)
  const weeks = Array.from({ length: 6 }, (_, i) => grid.slice(i * 7, i * 7 + 7))
  const selectedMonth = parseISODate(value)
  const rovingMonth = selectedMonth && selectedMonth.y === view.y && !isMonthDisabled(view.y, selectedMonth.m, min, max) ? selectedMonth.m : Array.from({ length: 12 }, (_, m) => m).find((m) => !isMonthDisabled(view.y, m, min, max))
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i)
  const yearDisabled = (y: number): boolean => (minYear !== undefined && y < minYear) || (maxYear !== undefined && y > maxYear)
  const rovingYear = yearDisabled(view.y) ? years.find((y) => !yearDisabled(y)) : view.y

  return (
    <div ref={rootRef} className="w-full select-none p-3">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" onClick={goPrev} disabled={!canPrev} aria-label={mode === 'days' ? 'Mes anterior' : mode === 'months' ? 'Año anterior' : 'Años anteriores'} className={navBtn}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {mode === 'years' ? (
          <p aria-live="polite" className="num px-2 text-sm font-bold text-ink">{title}</p>
        ) : (
          <button
            type="button" onClick={() => { pendingFocus.current = true; setMode(mode === 'days' ? 'months' : 'years') }}
            aria-live="polite" aria-label={mode === 'days' ? `${title}. Cambiar mes o año` : `${title}. Cambiar año`}
            className="num rounded-lg px-2.5 py-1.5 text-sm font-bold text-ink transition-colors hover:bg-surface-3"
          >
            {title}
          </button>
        )}
        <button type="button" onClick={goNext} disabled={!canNext} aria-label={mode === 'days' ? 'Mes siguiente' : mode === 'months' ? 'Año siguiente' : 'Años siguientes'} className={navBtn}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {mode === 'days' && (
        <div role="grid" aria-label={`${MONTHS_ES[view.m]} ${view.y}`} onKeyDown={onDaysKeyDown}>
          <div role="row" className="mb-1 grid grid-cols-7">
            {WEEKDAYS_ES_SHORT.map((w, i) => (
              <span key={w} role="columnheader" aria-label={WEEKDAYS_ES_LONG[i]} className="grid h-7 place-items-center text-[11.5px] font-semibold text-ink-3">{w}</span>
            ))}
          </div>
          <div key={`${view.y}-${view.m}`} className="animate-fade-in">
            {weeks.map((week) => (
              <div key={week[0].iso} role="row" className="grid grid-cols-7">
                {week.map((day) => {
                  const disabled = isDayDisabled(day.iso, min, max)
                  const selected = day.iso === value
                  const isToday = day.iso === today
                  const inBand = !!rangeFrom && !!rangeTo && day.iso >= rangeFrom && day.iso <= rangeTo
                  return (
                    <div
                      key={day.iso} role="gridcell" aria-selected={selected}
                      className={cn('flex justify-center py-0.5', inBand && 'bg-brand-soft', inBand && day.iso === rangeFrom && 'rounded-l-xl', inBand && day.iso === rangeTo && 'rounded-r-xl')}
                    >
                      <button
                        type="button" disabled={disabled} data-iso={day.iso} data-roving={day.iso === focusIso}
                        tabIndex={day.iso === focusIso ? 0 : -1}
                        aria-label={`${formatLongDate(day.iso)}${isToday ? ', hoy' : ''}`} aria-current={isToday ? 'date' : undefined}
                        onClick={() => onSelect(day.iso)}
                        className={cn(
                          'num relative grid h-9 w-9 place-items-center rounded-lg text-[13px] font-medium transition-colors',
                          selected ? 'bg-brand font-semibold text-white shadow-soft hover:brightness-110'
                            : disabled ? 'cursor-not-allowed text-ink-3/40'
                              : cn('hover:bg-surface-3', day.inMonth ? 'text-ink' : 'text-ink-3', inBand && 'text-brand-ink hover:bg-brand/15', isToday && 'font-bold text-brand-ink'),
                        )}
                      >
                        {day.day}
                        {isToday && !selected && <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-brand" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'months' && (
        <div role="group" aria-label={`Meses de ${view.y}`} onKeyDown={(e) => onTilesKeyDown(e, 3)} className="grid grid-cols-3 gap-1.5 py-1 animate-fade-in">
          {MONTHS_ES_SHORT.map((label, m) => {
            const disabled = isMonthDisabled(view.y, m, min, max)
            const selected = !!selectedMonth && selectedMonth.y === view.y && selectedMonth.m === m
            const current = parseISODate(today)
            const isNow = !!current && current.y === view.y && current.m === m
            return (
              <button
                key={label} type="button" disabled={disabled} data-roving={m === rovingMonth} tabIndex={m === rovingMonth ? 0 : -1}
                aria-label={`${MONTHS_ES[m]} ${view.y}`} aria-pressed={selected} onClick={() => pickMonth(m)}
                className={cn(
                  'h-11 rounded-xl text-[13.5px] font-semibold capitalize transition-colors',
                  selected ? 'bg-brand text-white shadow-soft' : disabled ? 'cursor-not-allowed text-ink-3/40' : cn('text-ink hover:bg-surface-3', isNow && 'text-brand-ink ring-1 ring-inset ring-brand/40'),
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'years' && (
        <div role="group" aria-label="Años" onKeyDown={(e) => onTilesKeyDown(e, 3)} className="grid grid-cols-3 gap-1.5 py-1 animate-fade-in">
          {years.map((y) => {
            const disabled = yearDisabled(y)
            const selected = !!selectedMonth && selectedMonth.y === y
            const isNow = parseISODate(today)?.y === y
            return (
              <button
                key={y} type="button" disabled={disabled} data-roving={y === rovingYear} tabIndex={y === rovingYear ? 0 : -1}
                aria-pressed={selected} onClick={() => pickYear(y)}
                className={cn(
                  'num h-11 rounded-xl text-[13.5px] font-semibold transition-colors',
                  selected ? 'bg-brand text-white shadow-soft' : disabled ? 'cursor-not-allowed text-ink-3/40' : cn('text-ink hover:bg-surface-3', isNow && 'text-brand-ink ring-1 ring-inset ring-brand/40'),
                )}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
