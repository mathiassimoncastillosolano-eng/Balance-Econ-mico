import { parseISODate } from '../calendar'
import { localISO, localTime } from './dataset'
import type { ExportDataset } from './types'
import { buildZip, type ZipEntry } from './zip'

/**
 * Libro Excel (.xlsx) auténtico: paquete OOXML con hojas, estilos, formatos numéricos y de fecha reales.
 *  · «Movimientos»: tabla con encabezado fijo, filtro automático, fechas y importes numéricos.
 *  · «Resumen»: filtros aplicados y totales como fórmulas (SUMIF) sobre la hoja de movimientos.
 */

const NAVY = 'FF0A1B3D'
const INK2 = 'FF475573'
const GREEN = 'FF049669'
const RED = 'FFE84E44'
const LINE = 'FFE2E7F0'
const BRAND_SOFT = 'FFE8EFFF'

// Índices de cellXfs (ver `stylesXml`).
const S = {
  header: 1, title: 2, subtitle: 3, date: 4, text: 5, income: 6, expense: 7, amountIn: 8, amountOut: 9, note: 10,
  sumLabel: 11, sumCount: 12, sumMoney: 13, sumIn: 14, sumOut: 15, heading: 16, metaLabel: 17, metaValue: 18, headerRight: 19,
} as const

const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g
export function xmlEscape(value: string): string {
  return value
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function columnName(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/** Número de serie de Excel (sistema 1900) para una fecha yyyy-MM-dd; independiente de la zona horaria. */
export function excelSerial(iso: string): number {
  const p = parseISODate(iso)
  if (!p) return 0
  return Math.round((Date.UTC(p.y, p.m, p.d) - Date.UTC(1899, 11, 30)) / 86_400_000)
}

class SharedStrings {
  private index = new Map<string, number>()
  private list: string[] = []
  private refs = 0
  add(text: string): number {
    this.refs++
    const known = this.index.get(text)
    if (known !== undefined) return known
    this.index.set(text, this.list.length)
    this.list.push(text)
    return this.list.length - 1
  }
  toXml(): string {
    const items = this.list.map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('')
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.refs}" uniqueCount="${this.list.length}">${items}</sst>`
  }
}

interface Row { r: number; ht?: number; cells: string[] }
const rowXml = (row: Row): string =>
  `<row r="${row.r}"${row.ht ? ` ht="${row.ht}" customHeight="1"` : ''}>${row.cells.join('')}</row>`

function stylesXml(symbol: string): string {
  const money = `&quot;${xmlEscape(symbol)}&quot; #,##0.00;[Red]-&quot;${xmlEscape(symbol)}&quot; #,##0.00`
  const font = (opts: { b?: boolean; sz?: number; color?: string }): string =>
    `<font>${opts.b ? '<b/>' : ''}<sz val="${opts.sz ?? 11}"/><color rgb="${opts.color ?? NAVY}"/><name val="Calibri"/><family val="2"/></font>`
  const fonts = [
    font({}), // 0 normal
    font({ b: true, color: 'FFFFFFFF' }), // 1 encabezado
    font({ b: true, sz: 16 }), // 2 título
    font({ sz: 10, color: INK2 }), // 3 gris
    font({ b: true, color: GREEN }), // 4 ingreso (negrita)
    font({ b: true, color: RED }), // 5 egreso (negrita)
    font({ b: true }), // 6 negrita
    font({ color: GREEN }), // 7 ingreso
    font({ color: RED }), // 8 egreso
  ]
  const fill = (rgb: string): string => `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`
  const bottom = `<border><left/><right/><top/><bottom style="thin"><color rgb="${LINE}"/></bottom><diagonal/></border>`
  const box = `<border><left style="thin"><color rgb="${LINE}"/></left><right style="thin"><color rgb="${LINE}"/></right><top style="thin"><color rgb="${LINE}"/></top><bottom style="thin"><color rgb="${LINE}"/></bottom><diagonal/></border>`
  const xf = (o: { n?: number; f?: number; fill?: number; b?: number; h?: string; wrap?: boolean; indent?: number }): string =>
    `<xf numFmtId="${o.n ?? 0}" fontId="${o.f ?? 0}" fillId="${o.fill ?? 0}" borderId="${o.b ?? 0}" xfId="0"` +
    `${o.n ? ' applyNumberFormat="1"' : ''}${o.f ? ' applyFont="1"' : ''}${o.fill ? ' applyFill="1"' : ''}${o.b ? ' applyBorder="1"' : ''} applyAlignment="1">` +
    `<alignment vertical="center"${o.h ? ` horizontal="${o.h}"` : ''}${o.wrap ? ' wrapText="1"' : ''}${o.indent ? ` indent="${o.indent}"` : ''}/></xf>`
  const xfs = [
    xf({}), // 0
    xf({ f: 1, fill: 2, h: 'center' }), // 1 header
    xf({ f: 2 }), // 2 title
    xf({ f: 3 }), // 3 subtitle
    xf({ n: 164, b: 1, h: 'left' }), // 4 date
    xf({ b: 1 }), // 5 text
    xf({ f: 7, b: 1 }), // 6 tipo ingreso
    xf({ f: 8, b: 1 }), // 7 tipo egreso
    xf({ n: 165, f: 4, b: 1, h: 'right', indent: 1 }), // 8 importe ingreso
    xf({ n: 165, f: 5, b: 1, h: 'right', indent: 1 }), // 9 importe egreso
    xf({ f: 3, b: 1 }), // 10 nota
    xf({ f: 6, fill: 3, b: 2 }), // 11 etiqueta resumen
    xf({ n: 166, f: 6, b: 2, h: 'right' }), // 12 conteo
    xf({ n: 165, f: 6, b: 2, h: 'right' }), // 13 importe
    xf({ n: 165, f: 4, b: 2, h: 'right' }), // 14 ingreso
    xf({ n: 165, f: 5, b: 2, h: 'right' }), // 15 egreso
    xf({ f: 6 }), // 16 subtítulo de sección
    xf({ f: 3, b: 1 }), // 17 etiqueta meta
    xf({ b: 1 }), // 18 valor meta
    xf({ f: 1, fill: 2, h: 'right' }), // 19 header derecha
  ]
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="${money}"/><numFmt numFmtId="166" formatCode="#,##0"/></numFmts>
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill(NAVY)}${fill(BRAND_SOFT)}</fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>${bottom}${box}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

export const MOVEMENTS_SHEET = 'Movimientos'
const HEADER_ROW = 4
const COLUMNS = [
  { title: 'Fecha', width: 13 }, { title: 'Tipo', width: 11 }, { title: 'Categoría', width: 22 }, { title: 'Concepto', width: 30 },
  { title: 'Nota', width: 38 }, { title: 'Importe', width: 17 }, { title: 'Estado', width: 13 },
] as const

export function buildXlsx(ds: ExportDataset): Uint8Array<ArrayBuffer> {
  const sst = new SharedStrings()
  const str = (ref: string, text: string, style: number): string => `<c r="${ref}" s="${style}" t="s"><v>${sst.add(text)}</v></c>`
  const num = (ref: string, value: number, style: number): string => `<c r="${ref}" s="${style}"><v>${value}</v></c>`
  const blank = (ref: string, style: number): string => `<c r="${ref}" s="${style}"/>`

  const n = ds.rows.length
  const first = HEADER_ROW + 1
  const last = HEADER_ROW + n
  const lastCol = columnName(COLUMNS.length - 1)

  // ── Hoja 1: Movimientos
  const sub = [ds.periodLabel, ...ds.filters.map((f) => `${f.label}: ${f.value}`)].join('  ·  ')
  const rows1: Row[] = [
    { r: 1, ht: 26, cells: [str('A1', `MONIQ · ${ds.title}`, S.title)] },
    { r: 2, ht: 18, cells: [str('A2', sub, S.subtitle)] },
    {
      r: HEADER_ROW, ht: 24,
      cells: COLUMNS.map((c, i) => str(`${columnName(i)}${HEADER_ROW}`, c.title, c.title === 'Importe' ? S.headerRight : S.header)),
    },
  ]
  ds.rows.forEach((row, i) => {
    const r = first + i
    const income = row.type === 'INGRESO'
    rows1.push({
      r, ht: 20,
      cells: [
        num(`A${r}`, excelSerial(row.date), S.date),
        str(`B${r}`, income ? 'Ingreso' : 'Egreso', income ? S.income : S.expense),
        str(`C${r}`, row.category, S.text),
        str(`D${r}`, row.concept, S.text),
        row.note ? str(`E${r}`, row.note, S.note) : blank(`E${r}`, S.note),
        num(`F${r}`, row.amount, income ? S.amountIn : S.amountOut),
        str(`G${r}`, row.status, S.text),
      ],
    })
  })
  const cols1 = `<cols>${COLUMNS.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('')}</cols>`
  const sheet1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${NS}><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastCol}${Math.max(last, HEADER_ROW)}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0" tabSelected="1"><pane ySplit="${HEADER_ROW}" topLeftCell="A${first}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${first}" sqref="A${first}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>${cols1}<sheetData>${rows1.map(rowXml).join('')}</sheetData>
<autoFilter ref="A${HEADER_ROW}:${lastCol}${Math.max(last, HEADER_ROW)}"/>
<mergeCells count="2"><mergeCell ref="A1:${lastCol}1"/><mergeCell ref="A2:${lastCol}2"/></mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/>
</worksheet>`

  // ── Hoja 2: Resumen
  const s = ds.summary
  const L = ds.summaryLabels
  const range = (col: string): string => `${MOVEMENTS_SHEET}!$${col}$${first}:$${col}$${last}`
  const formula = (ref: string, f: string, cached: number, style: number): string => `<c r="${ref}" s="${style}"><f>${xmlEscape(f)}</f><v>${cached}</v></c>`
  const rows2: Row[] = [{ r: 1, ht: 26, cells: [str('A1', 'MONIQ · Resumen', S.title)] }]
  let r = 3
  const meta = (label: string, value: string): void => {
    rows2.push({ r, ht: 18, cells: [str(`A${r}`, label, S.metaLabel), str(`B${r}`, value, S.metaValue)] })
    r++
  }
  meta('Documento', ds.title)
  meta('Generado', `${localISO(ds.generatedAt).split('-').reverse().join('/')} ${localTime(ds.generatedAt)}`)
  meta('Periodo', ds.periodLabel)
  for (const f of ds.filters) meta(f.label, f.value)
  r++
  rows2.push({ r, ht: 20, cells: [str(`A${r}`, 'Totales del archivo', S.heading)] })
  r++
  const useFormulas = n > 0
  const ingRow = r + 1
  const egrRow = r + 2
  rows2.push({ r, ht: 22, cells: [str(`A${r}`, 'Movimientos', S.sumLabel), useFormulas ? formula(`B${r}`, `COUNTA(${range('A')})`, s.count, S.sumCount) : num(`B${r}`, 0, S.sumCount)] })
  r++
  rows2.push({ r, ht: 22, cells: [str(`A${r}`, L.ingresos, S.sumLabel), useFormulas ? formula(`B${r}`, `SUMIF(${range('B')},"Ingreso",${range('F')})`, s.ingresos, S.sumIn) : num(`B${r}`, 0, S.sumIn)] })
  r++
  rows2.push({ r, ht: 22, cells: [str(`A${r}`, L.egresos, S.sumLabel), useFormulas ? formula(`B${r}`, `SUMIF(${range('B')},"Egreso",${range('F')})`, s.egresos, S.sumOut) : num(`B${r}`, 0, S.sumOut)] })
  r++
  rows2.push({ r, ht: 22, cells: [str(`A${r}`, L.neto, S.sumLabel), formula(`B${r}`, `B${ingRow}-B${egrRow}`, s.neto, S.sumMoney)] })
  const lastRow2 = r
  const sheet2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${NS}><dimension ref="A1:B${lastRow2}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/>
<cols><col min="1" max="1" width="26" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/></cols>
<sheetData>${rows2.map(rowXml).join('')}</sheetData>
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`

  // ── Paquete
  const enc = new TextEncoder()
  const iso = ds.generatedAt.toISOString().replace(/\.\d+Z$/, 'Z')
  const files: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(`MONIQ - ${ds.title}`)}</dc:title><dc:creator>MONIQ</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`],
    ['docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MONIQ</Application></Properties>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook ${NS}><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="${MOVEMENTS_SHEET}" sheetId="1" r:id="rId1"/><sheet name="Resumen" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${MOVEMENTS_SHEET}!$A$${HEADER_ROW}:$${lastCol}$${Math.max(last, HEADER_ROW)}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
    ['xl/styles.xml', stylesXml(ds.currencySymbol)],
    ['xl/worksheets/sheet1.xml', sheet1],
    ['xl/worksheets/sheet2.xml', sheet2],
  ]
  // sharedStrings se serializa al final: ya se registraron todas las cadenas de ambas hojas.
  files.push(['xl/sharedStrings.xml', sst.toXml()])
  const entries: ZipEntry[] = files.map(([name, xml]) => ({ name, data: enc.encode(xml) }))
  return buildZip(entries, ds.generatedAt)
}
