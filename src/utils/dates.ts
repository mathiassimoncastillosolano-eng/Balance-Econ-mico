import {
  addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, endOfYear, format,
  isAfter, parseISO, startOfMonth, startOfQuarter, startOfWeek, startOfYear, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange, Granularity, PeriodKey } from '@/types/domain'
import { capitalize } from './format'

export const ISO = 'yyyy-MM-dd'
export const toISO = (d: Date): string => format(d, ISO)
export const todayISO = (): string => toISO(new Date())

export const PERIODS: { key: PeriodKey; label: string; short: string }[] = [
  { key: 'month', label: 'Este mes', short: 'Mes' },
  { key: 'quarter', label: 'Este trimestre', short: 'Trimestre' },
  { key: 'semester', label: 'Este semestre', short: 'Semestre' },
  { key: 'year', label: 'Este año', short: 'Año' },
]

const MONTHS_PER_PERIOD: Record<PeriodKey, number> = { month: 1, quarter: 3, semester: 6, year: 12 }

function periodStart(key: PeriodKey, now: Date): Date {
  switch (key) {
    case 'month': return startOfMonth(now)
    case 'quarter': return startOfQuarter(now)
    case 'semester': return new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1)
    case 'year': return startOfYear(now)
  }
}

/** Rango del periodo actual (desde el inicio natural hasta hoy). */
export function getPeriodRange(key: PeriodKey, now = new Date()): DateRange {
  return { from: toISO(periodStart(key, now)), to: toISO(now) }
}

/** Rango equivalente inmediatamente anterior, con el mismo avance transcurrido. */
export function getPreviousRange(key: PeriodKey, now = new Date()): DateRange {
  const start = periodStart(key, now)
  const shift = MONTHS_PER_PERIOD[key]
  const prevStart = subMonths(start, shift)
  const elapsed = differenceInCalendarDays(now, start)
  const prevFullEnd = addDays(start, -1)
  const prevEnd = addDays(prevStart, elapsed)
  return { from: toISO(prevStart), to: toISO(isAfter(prevEnd, prevFullEnd) ? prevFullEnd : prevEnd) }
}

export function granularityFor(key: PeriodKey): Granularity {
  if (key === 'month') return 'day'
  if (key === 'quarter') return 'week'
  return 'month'
}

export function periodLabel(range: DateRange): string {
  const from = parseISO(range.from)
  const to = parseISO(range.to)
  const f = format(from, "d MMM", { locale: es })
  const t = format(to, "d MMM yyyy", { locale: es })
  return `${f} – ${t}`
}

export function monthKey(iso: string): string { return iso.slice(0, 7) }

export function monthRange(year: number, month0: number): DateRange {
  const d = new Date(year, month0, 1)
  return { from: toISO(startOfMonth(d)), to: toISO(endOfMonth(d)) }
}

export function yearRange(year: number): DateRange {
  const d = new Date(year, 0, 1)
  return { from: toISO(startOfYear(d)), to: toISO(endOfYear(d)) }
}

export function monthLabel(year: number, month0: number): string {
  return capitalize(format(new Date(year, month0, 1), 'MMMM yyyy', { locale: es }))
}

export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const d = addMonths(new Date(year, month0, 1), delta)
  return { year: d.getFullYear(), month0: d.getMonth() }
}

export interface Bucket { key: string; label: string; from: string; to: string }

/** Genera los intervalos (día/semana/mes) que cubren un rango. */
export function buildBuckets(range: DateRange, granularity: Granularity): Bucket[] {
  const from = parseISO(range.from)
  const to = parseISO(range.to)
  if (granularity === 'day') {
    return eachDayOfInterval({ start: from, end: to }).map((d) => ({
      key: toISO(d), label: format(d, 'd MMM', { locale: es }), from: toISO(d), to: toISO(d),
    }))
  }
  const buckets: Bucket[] = []
  if (granularity === 'week') {
    let cursor = startOfWeek(from, { weekStartsOn: 1 })
    while (!isAfter(cursor, to)) {
      const end = endOfWeek(cursor, { weekStartsOn: 1 })
      buckets.push({ key: toISO(cursor), label: format(cursor, 'd MMM', { locale: es }), from: toISO(cursor), to: toISO(end) })
      cursor = addDays(cursor, 7)
    }
    return buckets
  }
  let cursor = startOfMonth(from)
  while (!isAfter(cursor, to)) {
    buckets.push({
      key: format(cursor, 'yyyy-MM'), label: capitalize(format(cursor, 'MMM', { locale: es })).replace('.', ''),
      from: toISO(startOfMonth(cursor)), to: toISO(endOfMonth(cursor)),
    })
    cursor = addMonths(cursor, 1)
  }
  return buckets
}

export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to
}
