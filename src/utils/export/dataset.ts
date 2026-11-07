import type { MovementType, ResolvedTransaction } from '@/types/domain'
import { formatNumericDate } from '../calendar'
import type { ExportDataset, ExportFilter, ExportRow, ExportSummary } from './types'

export interface DatasetInput {
  /** Conjunto COMPLETO ya filtrado (no solo la página visible de la tabla). */
  transactions: ResolvedTransaction[]
  view: 'active' | 'deleted'
  q: string
  type: 'ALL' | MovementType
  categoryName?: string
  from: string
  to: string
  statusLabel: (tx: ResolvedTransaction) => string
  currencySymbol: string
  formatMoney: ExportDataset['formatMoney']
  now?: Date
}

const cents = (n: number): number => Math.round((n + Number.EPSILON) * 100)

export function summarize(rows: ExportRow[]): ExportSummary {
  let ing = 0
  let egr = 0
  for (const r of rows) {
    if (r.type === 'INGRESO') ing += cents(r.amount)
    else egr += cents(r.amount)
  }
  return { count: rows.length, ingresos: ing / 100, egresos: egr / 100, neto: (ing - egr) / 100 }
}

export function periodLabelFor(from: string, to: string): string {
  if (from && to) return from === to ? `Día ${formatNumericDate(from)}` : `Del ${formatNumericDate(from)} al ${formatNumericDate(to)}`
  if (from) return `Desde el ${formatNumericDate(from)}`
  if (to) return `Hasta el ${formatNumericDate(to)}`
  return 'Todo el historial'
}

export function buildExportDataset(input: DatasetInput): ExportDataset {
  const rows: ExportRow[] = input.transactions.map((t) => ({
    date: t.date,
    concept: t.concept.name,
    category: t.category.name,
    type: t.type,
    status: input.statusLabel(t),
    amount: t.amount,
    note: t.note,
  }))
  const filters: ExportFilter[] = [{ label: 'Vista', value: input.view === 'active' ? 'Activos' : 'Eliminados' }]
  if (input.type !== 'ALL') filters.push({ label: 'Tipo', value: input.type === 'INGRESO' ? 'Ingresos' : 'Egresos' })
  if (input.categoryName) filters.push({ label: 'Categoría', value: input.categoryName })
  if (input.q.trim()) filters.push({ label: 'Búsqueda', value: `«${input.q.trim()}»` })
  const deleted = input.view === 'deleted'
  return {
    title: 'Historial de movimientos',
    view: input.view,
    rows,
    summary: summarize(rows),
    summaryLabels: deleted
      ? { ingresos: 'Ingresos eliminados', egresos: 'Egresos eliminados', neto: 'Balance de eliminados' }
      : { ingresos: 'Ingresos', egresos: 'Egresos', neto: 'Balance neto' },
    periodLabel: periodLabelFor(input.from, input.to),
    filters,
    generatedAt: input.now ?? new Date(),
    currencySymbol: input.currencySymbol,
    formatMoney: input.formatMoney,
  }
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** yyyy-MM-dd en hora local (sin pasar por UTC, para no desfasar el día). */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** HH:mm en hora local. */
export function localTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
