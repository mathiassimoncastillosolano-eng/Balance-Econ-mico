import { localISO } from './dataset'
import type { ExportDataset, ExportFormat, GeneratedFile } from './types'

export interface ExportFormatInfo { id: ExportFormat; name: string; extension: string; description: string; mime: string }

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  { id: 'csv', name: 'CSV', extension: '.csv', description: 'Archivo de datos separados por comas, compatible con hojas de cálculo.', mime: 'text/csv;charset=utf-8' },
  { id: 'xlsx', name: 'Excel', extension: '.xlsx', description: 'Archivo de hoja de cálculo para analizar y organizar información.', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'pdf', name: 'PDF', extension: '.pdf', description: 'Documento organizado y listo para consultar o compartir.', mime: 'application/pdf' },
]

/** MONIQ_Historial_2026-11-07.csv (o MONIQ_Historial_Eliminados_… para la pestaña Eliminados). */
export function exportFilename(ds: ExportDataset, format: ExportFormat): string {
  const ext = EXPORT_FORMATS.find((f) => f.id === format)?.extension ?? ''
  return `MONIQ_Historial${ds.view === 'deleted' ? '_Eliminados' : ''}_${localISO(ds.generatedAt)}${ext}`
}

/** Genera el archivo real. Excel y PDF se cargan bajo demanda para no aumentar el peso inicial de la app. */
export async function generateExport(format: ExportFormat, ds: ExportDataset): Promise<GeneratedFile> {
  const info = EXPORT_FORMATS.find((f) => f.id === format)
  if (!info) throw new Error(`Formato de exportación desconocido: ${format}`)
  let part: BlobPart
  if (format === 'csv') part = (await import('./csv')).buildCSV(ds)
  else if (format === 'xlsx') part = (await import('./xlsx')).buildXlsx(ds)
  else part = (await import('./pdf')).buildPdf(ds)
  return { blob: new Blob([part], { type: info.mime }), filename: exportFilename(ds, format) }
}
