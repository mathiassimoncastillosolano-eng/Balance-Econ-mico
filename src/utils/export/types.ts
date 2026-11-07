export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export interface ExportRow {
  /** yyyy-MM-dd */
  date: string
  concept: string
  category: string
  type: 'INGRESO' | 'EGRESO'
  status: string
  /** Importe siempre positivo; el signo lo da `type`. */
  amount: number
  note: string
}

export interface ExportSummary {
  count: number
  ingresos: number
  egresos: number
  neto: number
}

export interface ExportFilter { label: string; value: string }

/** Todo lo necesario para generar cualquier formato. Es independiente de React y del DOM. */
export interface ExportDataset {
  title: string
  view: 'active' | 'deleted'
  rows: ExportRow[]
  /** Calculado a partir de `rows`, por lo que siempre coincide con lo exportado. */
  summary: ExportSummary
  summaryLabels: { ingresos: string; egresos: string; neto: string }
  periodLabel: string
  /** Solo filtros aplicados (más la vista Activos/Eliminados). */
  filters: ExportFilter[]
  generatedAt: Date
  currencySymbol: string
  /** Formatea un importe con la moneda y el formato elegidos por el usuario. */
  formatMoney: (value: number, opts?: { signed?: boolean }) => string
}

export interface GeneratedFile { blob: Blob; filename: string }
