import type { ExportDataset } from './types'

export const CSV_HEADERS = ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Nota', 'Importe', 'Estado'] as const

/**
 * Escapa una celda de texto:
 *  · comillas dobles duplicadas y celda entrecomillada si contiene coma, comillas, punto y coma o saltos de línea;
 *  · neutraliza «inyección de fórmulas»: Excel interpretaría como fórmula un texto que empiece por = + - @.
 */
export function csvText(value: string): string {
  let s = value
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",;\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV UTF-8 con BOM (para que Excel respete tildes y ñ), separado por comas y con saltos CRLF (RFC 4180). */
export function buildCSV(ds: ExportDataset): string {
  const lines: string[] = [CSV_HEADERS.join(',')]
  for (const r of ds.rows) {
    lines.push([
      r.date,
      r.type === 'INGRESO' ? 'Ingreso' : 'Egreso',
      csvText(r.category),
      csvText(r.concept),
      csvText(r.note),
      r.amount.toFixed(2),
      csvText(r.status),
    ].join(','))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
