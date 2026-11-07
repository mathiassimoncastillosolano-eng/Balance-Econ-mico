import { addDaysISO, addMonthsISO, firstOfMonthISO, lastOfMonthISO, MONTHS_ES_SHORT, parseISODate } from './calendar'

/** Rango con extremos opcionales (cadena vacía = sin límite). */
export interface OpenRange { from: string; to: string }

export type DatePresetKey = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'last90' | 'month' | 'prev' | 'year' | 'custom'

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: 'all', label: 'Todo el historial' },
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'last7', label: 'Últimos 7 días' },
  { key: 'last30', label: 'Últimos 30 días' },
  { key: 'last90', label: 'Últimos 90 días' },
  { key: 'month', label: 'Este mes' },
  { key: 'prev', label: 'Mes anterior' },
  { key: 'year', label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
]

const PRESET_ORDER: DatePresetKey[] = ['today', 'yesterday', 'last7', 'last30', 'last90', 'month', 'prev', 'year']

/** Rango de un atajo respecto a `today` (yyyy-MM-dd). `custom` no define fechas. */
export function presetRange(key: DatePresetKey, today: string): OpenRange | null {
  const t = parseISODate(today)
  if (!t) return null
  switch (key) {
    case 'all': return { from: '', to: '' }
    case 'today': return { from: today, to: today }
    case 'yesterday': { const y = addDaysISO(today, -1); return { from: y, to: y } }
    case 'last7': return { from: addDaysISO(today, -6), to: today }
    case 'last30': return { from: addDaysISO(today, -29), to: today }
    case 'last90': return { from: addDaysISO(today, -89), to: today }
    case 'month': return { from: firstOfMonthISO(t.y, t.m), to: today }
    case 'prev': {
      const prev = parseISODate(addMonthsISO(firstOfMonthISO(t.y, t.m), -1)) as { y: number; m: number }
      return { from: firstOfMonthISO(prev.y, prev.m), to: lastOfMonthISO(prev.y, prev.m) }
    }
    case 'year': return { from: `${String(t.y).padStart(4, '0')}-01-01`, to: today }
    case 'custom': return null
  }
}

const sameRange = (a: OpenRange, b: OpenRange): boolean => a.from === b.from && a.to === b.to

/**
 * Atajo que corresponde al rango actual. Si `preferred` (el último elegido por el usuario) sigue
 * coincidiendo, gana sobre los demás: «Hoy» y «Este mes» coinciden el día 1 de cada mes.
 */
export function detectPreset(range: OpenRange, today: string, preferred?: DatePresetKey): DatePresetKey {
  if (!range.from && !range.to) return 'all'
  if (preferred && preferred !== 'custom' && preferred !== 'all') {
    const pr = presetRange(preferred, today)
    if (pr && sameRange(pr, range)) return preferred
  }
  for (const key of PRESET_ORDER) {
    const pr = presetRange(key, today)
    if (pr && sameRange(pr, range)) return key
  }
  return 'custom'
}

/**
 * «Desde» cambió. Si queda posterior a «Hasta» el rango sería inválido: se restablece «Hasta»
 * (el llamador puede pedir al usuario que elija uno nuevo) en lugar de aceptar un rango invertido.
 */
export function applyFrom(range: OpenRange, from: string): { range: OpenRange; resetTo: boolean } {
  if (from && range.to && from > range.to) return { range: { from, to: '' }, resetTo: true }
  return { range: { from, to: range.to }, resetTo: false }
}

/** «Hasta» cambió. Nunca puede quedar anterior a «Desde». */
export function applyTo(range: OpenRange, to: string): OpenRange {
  if (to && range.from && to < range.from) return { from: to, to }
  return { from: range.from, to }
}

function shortPart(iso: string, withMonth: boolean, withYear: boolean): string {
  const p = parseISODate(iso)
  if (!p) return ''
  return `${p.d}${withMonth ? ` ${MONTHS_ES_SHORT[p.m]}` : ''}${withYear ? ` ${p.y}` : ''}`
}

/** Texto compacto de un rango: «7 nov», «1 – 7 nov», «9 oct – 7 nov», «1 ene – 7 nov». */
export function formatRangeShort(range: OpenRange): string {
  const { from, to } = range
  if (!from || !to) return ''
  if (from === to) return shortPart(from, true, false)
  const a = parseISODate(from)
  const b = parseISODate(to)
  if (!a || !b) return ''
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${shortPart(to, true, false)}`
  if (a.y === b.y) return `${shortPart(from, true, false)} – ${shortPart(to, true, false)}`
  return `${shortPart(from, true, true)} – ${shortPart(to, true, true)}`
}
