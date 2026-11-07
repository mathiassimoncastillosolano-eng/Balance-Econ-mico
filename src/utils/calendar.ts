/**
 * Utilidades de calendario puras, basadas únicamente en cadenas `yyyy-MM-dd`.
 * La aritmética se hace en UTC sobre fechas «de pared», por lo que NO depende de la zona
 * horaria del navegador ni del horario de verano: no puede producir desfases de un día.
 */

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const
export const MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const
/** Semana iniciando en lunes (convención del proyecto: `weekStartsOn: 1`). */
export const WEEKDAYS_ES_SHORT = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'] as const
export const WEEKDAYS_ES_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const

export interface YMD { y: number; m: number; d: number }

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n: number, len = 2): string => String(n).padStart(len, '0')

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
}

/** Devuelve `null` si la cadena no es una fecha real (p. ej. 2026-02-30). */
export function parseISODate(iso: string): YMD | null {
  const match = ISO_RE.exec(iso)
  if (!match) return null
  const y = Number(match[1]); const m = Number(match[2]) - 1; const d = Number(match[3])
  if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) return null
  return { y, m, d }
}

export const isValidISO = (iso: string): boolean => parseISODate(iso) !== null

export function toISODate({ y, m, d }: YMD): string {
  return `${pad(y, 4)}-${pad(m + 1)}-${pad(d)}`
}

const toUTC = ({ y, m, d }: YMD): number => Date.UTC(y, m, d)
const fromUTC = (ms: number): YMD => {
  const dt = new Date(ms)
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() }
}

export function addDaysISO(iso: string, days: number): string {
  const p = parseISODate(iso)
  if (!p) return iso
  return toISODate(fromUTC(toUTC(p) + days * 86_400_000))
}

/** Suma meses conservando el día cuando es posible (31 ene + 1 mes → 28/29 feb). */
export function addMonthsISO(iso: string, months: number): string {
  const p = parseISODate(iso)
  if (!p) return iso
  const total = p.y * 12 + p.m + months
  const y = Math.floor(total / 12)
  const m = total - y * 12
  return toISODate({ y, m, d: Math.min(p.d, daysInMonth(y, m)) })
}

export const firstOfMonthISO = (y: number, m: number): string => toISODate({ y, m, d: 1 })
export const lastOfMonthISO = (y: number, m: number): string => toISODate({ y, m, d: daysInMonth(y, m) })

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(iso: string): number {
  const p = parseISODate(iso)
  if (!p) return 0
  return (new Date(toUTC(p)).getUTCDay() + 6) % 7
}

export interface GridDay { iso: string; day: number; inMonth: boolean }

/** Cuadrícula de 6 semanas (42 días) para un mes; evita saltos de altura al navegar. */
export function buildMonthGrid(y: number, m: number): GridDay[] {
  const first = firstOfMonthISO(y, m)
  const start = addDaysISO(first, -weekdayIndex(first))
  return Array.from({ length: 42 }, (_, i) => {
    const iso = addDaysISO(start, i)
    const p = parseISODate(iso) as YMD
    return { iso, day: p.d, inMonth: p.m === m && p.y === y }
  })
}

export function clampISO(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min
  if (max && iso > max) return max
  return iso
}

export const isDayDisabled = (iso: string, min?: string, max?: string): boolean =>
  (!!min && iso < min) || (!!max && iso > max)

/** ¿Hay algún día seleccionable en el mes? */
export function isMonthDisabled(y: number, m: number, min?: string, max?: string): boolean {
  return (!!max && firstOfMonthISO(y, m) > max) || (!!min && lastOfMonthISO(y, m) < min)
}

/** «7 nov 2026». */
export function formatDisplayDate(iso: string): string {
  const p = parseISODate(iso)
  return p ? `${p.d} ${MONTHS_ES_SHORT[p.m]} ${p.y}` : ''
}

/** «7 de noviembre de 2026» (etiquetas accesibles). */
export function formatLongDate(iso: string): string {
  const p = parseISODate(iso)
  return p ? `${p.d} de ${MONTHS_ES[p.m]?.toLowerCase()} de ${p.y}` : ''
}

/** «dd/MM/yyyy» para documentos exportados. */
export function formatNumericDate(iso: string): string {
  const p = parseISODate(iso)
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : ''
}
