import { formatNumericDate } from '../calendar'
import { localISO, localTime } from './dataset'
import { HELVETICA_BOLD_WIDTHS, HELVETICA_WIDTHS } from './pdfMetrics'
import type { ExportDataset, ExportRow } from './types'

/**
 * Documento PDF real (PDF 1.4, A4 vertical) escrito a mano con las fuentes base Helvetica / Helvetica-Bold.
 * No usa dependencias: mide el texto con métricas AFM, pagina automáticamente, repite el encabezado de la tabla
 * y numera las páginas. Cada fila ocupa una altura fija y solo se dibuja si cabe entera: nunca se corta entre páginas.
 */

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2

type Rgb = readonly [number, number, number]
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]
const C = {
  navy: hex('#0A1B3D'), brandLight: hex('#7DB4FF'), mark: hex('#6EA6FF'), node: hex('#19D3A2'), white: hex('#FFFFFF'),
  ink: hex('#0A1B3D'), ink2: hex('#475573'), ink3: hex('#7A86A0'), onNavy: hex('#A9BAD8'),
  income: hex('#049669'), expense: hex('#E84E44'), card: hex('#F4F6FA'), zebra: hex('#F8F9FC'), line: hex('#E2E7F0'), total: hex('#E8EFFF'),
}

// ── Codificación y métricas (WinAnsi, 1 byte por carácter) ──────────────────────────────────────────
const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b,
  'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99,
  'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f, '−': 0x2d, '\u00a0': 0xa0, '\u202f': 0x20, '\u2009': 0x20,
}

/** Convierte a una cadena donde cada carácter es un byte WinAnsi (lo no representable pasa a «?»). */
export function toWinAnsi(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63
    if (code === 9 || code === 10 || code === 13) out += ' '
    else if (code >= 32 && code <= 126) out += ch
    else if (code >= 0xa0 && code <= 0xff) out += ch
    else if (WIN_ANSI_EXTRA[ch] !== undefined) out += String.fromCharCode(WIN_ANSI_EXTRA[ch])
    else out += '?'
  }
  return out
}

export function textWidth(winAnsi: string, size: number, bold: boolean): number {
  const table = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS
  let w = 0
  for (let i = 0; i < winAnsi.length; i++) w += table[winAnsi.charCodeAt(i) - 32] ?? 0
  return (w * size) / 1000
}

/** Recorta con «…» para que el texto quepa en `maxWidth`. */
export function fitText(text: string, size: number, bold: boolean, maxWidth: number): string {
  const s = toWinAnsi(text)
  if (textWidth(s, size, bold) <= maxWidth) return s
  const ellipsis = '\x85'
  let end = s.length
  while (end > 0 && textWidth(s.slice(0, end).trimEnd() + ellipsis, size, bold) > maxWidth) end--
  return end > 0 ? s.slice(0, end).trimEnd() + ellipsis : ''
}

const pdfString = (winAnsi: string): string =>
  `(${winAnsi.replace(/[\\()]/g, '\\$&').replace(/[\u0080-\u00ff]/g, (c) => `\\${c.charCodeAt(0).toString(8)}`)})`
const f = (n: number): string => (Math.round(n * 100) / 100).toString()
const rgb = (c: Rgb): string => `${f(c[0])} ${f(c[1])} ${f(c[2])}`

// ── Primitivas de dibujo (origen arriba-izquierda; se convierte al sistema PDF) ─────────────────────
class PageCanvas {
  readonly ops: string[] = []
  rect(x: number, y: number, w: number, h: number, fill: Rgb): void {
    this.ops.push(`${rgb(fill)} rg ${f(x)} ${f(PAGE_H - y - h)} ${f(w)} ${f(h)} re f`)
  }
  roundRect(x: number, y: number, w: number, h: number, r: number, fill: Rgb): void {
    const k = r * 0.5523
    const X = x; const Y = PAGE_H - y - h
    this.ops.push(
      `${rgb(fill)} rg ${f(X + r)} ${f(Y)} m ${f(X + w - r)} ${f(Y)} l ` +
      `${f(X + w - r + k)} ${f(Y)} ${f(X + w)} ${f(Y + r - k)} ${f(X + w)} ${f(Y + r)} c ${f(X + w)} ${f(Y + h - r)} l ` +
      `${f(X + w)} ${f(Y + h - r + k)} ${f(X + w - r + k)} ${f(Y + h)} ${f(X + w - r)} ${f(Y + h)} c ${f(X + r)} ${f(Y + h)} l ` +
      `${f(X + r - k)} ${f(Y + h)} ${f(X)} ${f(Y + h - r + k)} ${f(X)} ${f(Y + h - r)} c ${f(X)} ${f(Y + r)} l ` +
      `${f(X)} ${f(Y + r - k)} ${f(X + r - k)} ${f(Y)} ${f(X + r)} ${f(Y)} c f`,
    )
  }
  hline(x1: number, x2: number, y: number, color: Rgb, width = 0.5): void {
    this.ops.push(`${f(width)} w ${rgb(color)} RG ${f(x1)} ${f(PAGE_H - y)} m ${f(x2)} ${f(PAGE_H - y)} l S`)
  }
  /** `y` es la línea base del texto. */
  text(x: number, y: number, raw: string, o: { size: number; bold?: boolean; color: Rgb; align?: 'left' | 'right' | 'center'; maxWidth?: number }): void {
    const bold = !!o.bold
    const s = o.maxWidth ? fitText(raw, o.size, bold, o.maxWidth) : toWinAnsi(raw)
    if (!s) return
    const w = textWidth(s, o.size, bold)
    const px = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${f(o.size)} Tf ${rgb(o.color)} rg ${f(px)} ${f(PAGE_H - y)} Td ${pdfString(s)} Tj ET`)
  }
  /** Monograma MONIQ (mismos trazos que el logotipo web, viewBox 48×48). */
  mark(x: number, y: number, size: number): void {
    const s = size / 48
    const P = (vx: number, vy: number): string => `${f(x + vx * s)} ${f(PAGE_H - (y + vy * s))}`
    const stroke = (c: Rgb, pts: [number, number][]): string =>
      `${f(4.6 * s)} w 1 J 1 j ${rgb(c)} RG ${P(...pts[0])} m ${pts.slice(1).map((p) => `${P(...p)} l`).join(' ')} S`
    this.ops.push(stroke(C.white, [[12.5, 35], [12.5, 13.5], [24, 27]]))
    this.ops.push(stroke(C.mark, [[24, 27], [35.5, 13.5], [35.5, 35]]))
    const cx = x + 35.5 * s; const cy = PAGE_H - (y + 11.5 * s); const r = 3.3 * s; const k = r * 0.5523
    this.ops.push(
      `${rgb(C.node)} rg ${f(cx + r)} ${f(cy)} m ${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ` +
      `${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} c ${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ` +
      `${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} c f`,
    )
  }
}

// ── Diseño ──────────────────────────────────────────────────────────────────────────────────────────
const COLS = [
  { key: 'date', title: 'Fecha', w: 66, align: 'left' },
  { key: 'concept', title: 'Concepto', w: 150, align: 'left' },
  { key: 'category', title: 'Categoría', w: 104, align: 'left' },
  { key: 'type', title: 'Tipo', w: 54, align: 'left' },
  { key: 'status', title: 'Estado', w: 62, align: 'left' },
  { key: 'amount', title: 'Importe', w: CONTENT_W - 66 - 150 - 104 - 54 - 62, align: 'right' },
] as const
const ROW_H = 24
const HEAD_H = 24
const PAD = 8
const FOOTER_Y = PAGE_H - 34
const BOTTOM = FOOTER_Y - 14
const FIRST_TABLE_Y = 258
const NEXT_TABLE_Y = 52

function dateLabel(iso: string): string {
  return formatNumericDate(iso)
}

function drawBrandBand(page: PageCanvas, ds: ExportDataset): void {
  page.rect(0, 0, PAGE_W, 92, C.navy)
  page.mark(MARGIN, 26, 40)
  page.text(MARGIN + 50, 53, 'MON', { size: 19, bold: true, color: C.white })
  page.text(MARGIN + 50 + textWidth('MON', 19, true) + 1, 53, 'IQ', { size: 19, bold: true, color: C.brandLight })
  const stamp = `Generado el ${formatNumericDate(localISO(ds.generatedAt))} · ${localTime(ds.generatedAt)}`
  page.text(PAGE_W - MARGIN, 53, stamp, { size: 9, color: C.onNavy, align: 'right' })
}

function drawContinuationBar(page: PageCanvas, ds: ExportDataset): void {
  page.rect(0, 0, PAGE_W, 30, C.navy)
  page.mark(MARGIN, 7, 16)
  page.text(MARGIN + 23, 19.5, 'MON', { size: 10, bold: true, color: C.white })
  page.text(MARGIN + 23 + textWidth('MON', 10, true) + 0.5, 19.5, 'IQ', { size: 10, bold: true, color: C.brandLight })
  page.text(PAGE_W - MARGIN, 19.5, ds.title, { size: 8.5, color: C.onNavy, align: 'right' })
}

function drawTableHeader(page: PageCanvas, y: number): void {
  page.rect(MARGIN, y, CONTENT_W, HEAD_H, C.navy)
  let x = MARGIN
  for (const col of COLS) {
    const tx = col.align === 'right' ? x + col.w - PAD : x + PAD
    page.text(tx, y + 15.5, col.title, { size: 8.5, bold: true, color: C.white, align: col.align })
    x += col.w
  }
}

function fitMoneySize(text: string, bold: boolean, startSize: number, maxWidth: number): number {
  let size = startSize
  const s = toWinAnsi(text)
  while (size > 6 && textWidth(s, size, bold) > maxWidth) size -= 0.5
  return size
}

function drawRow(page: PageCanvas, ds: ExportDataset, row: ExportRow, y: number, index: number): void {
  if (index % 2 === 1) page.rect(MARGIN, y, CONTENT_W, ROW_H, C.zebra)
  page.hline(MARGIN, MARGIN + CONTENT_W, y + ROW_H, C.line, 0.5)
  const income = row.type === 'INGRESO'
  const base = y + 15.5
  let x = MARGIN
  for (const col of COLS) {
    const maxW = col.w - PAD * 2
    switch (col.key) {
      case 'date': page.text(x + PAD, base, dateLabel(row.date), { size: 9, color: C.ink2, maxWidth: maxW }); break
      case 'concept': page.text(x + PAD, base, row.concept, { size: 9, bold: true, color: C.ink, maxWidth: maxW }); break
      case 'category': page.text(x + PAD, base, row.category, { size: 9, color: C.ink2, maxWidth: maxW }); break
      case 'type': page.text(x + PAD, base, income ? 'Ingreso' : 'Egreso', { size: 9, bold: true, color: income ? C.income : C.expense, maxWidth: maxW }); break
      case 'status': page.text(x + PAD, base, row.status, { size: 9, color: C.ink2, maxWidth: maxW }); break
      case 'amount': {
        const label = income ? ds.formatMoney(row.amount, { signed: true }) : ds.formatMoney(-row.amount)
        page.text(x + col.w - PAD, base, label, { size: fitMoneySize(label, true, 9, maxW), bold: true, color: income ? C.income : C.expense, align: 'right' })
        break
      }
    }
    x += col.w
  }
}

function drawSummary(page: PageCanvas, ds: ExportDataset, y: number): void {
  const gap = 10
  const w = (CONTENT_W - gap * 3) / 4
  const s = ds.summary
  const cards: { label: string; value: string; color: Rgb }[] = [
    { label: 'Movimientos', value: String(s.count), color: C.ink },
    { label: ds.summaryLabels.ingresos, value: ds.formatMoney(s.ingresos), color: C.income },
    { label: ds.summaryLabels.egresos, value: ds.formatMoney(s.egresos), color: C.expense },
    { label: ds.summaryLabels.neto, value: ds.formatMoney(s.neto, { signed: true }), color: s.neto >= 0 ? C.income : C.expense },
  ]
  cards.forEach((c, i) => {
    const x = MARGIN + i * (w + gap)
    page.roundRect(x, y, w, 58, 8, C.card)
    page.text(x + 12, y + 21, c.label, { size: 8.5, color: C.ink2, maxWidth: w - 24 })
    page.text(x + 12, y + 43, c.value, { size: fitMoneySize(c.value, true, 14, w - 24), bold: true, color: c.color })
  })
}

function drawTotals(page: PageCanvas, ds: ExportDataset, y: number): void {
  page.rect(MARGIN, y, CONTENT_W, ROW_H + 2, C.total)
  const s = ds.summary
  page.text(MARGIN + PAD, y + 16.5, `Total · ${s.count} ${s.count === 1 ? 'movimiento' : 'movimientos'}`, { size: 9, bold: true, color: C.ink })
  const label = `${ds.summaryLabels.neto}   ${ds.formatMoney(s.neto, { signed: true })}`
  page.text(MARGIN + CONTENT_W - PAD, y + 16.5, label, { size: 9.5, bold: true, color: s.neto >= 0 ? C.income : C.expense, align: 'right' })
}

/** Genera el PDF (bytes). El número de páginas se conoce al final para escribir «Página X de Y». */
export function buildPdf(ds: ExportDataset): Uint8Array<ArrayBuffer> {
  const pages: PageCanvas[] = []
  const newPage = (first: boolean): PageCanvas => {
    const p = new PageCanvas()
    pages.push(p)
    if (first) drawBrandBand(p, ds)
    else drawContinuationBar(p, ds)
    return p
  }

  // Primera página: título, contexto y resumen.
  let page = newPage(true)
  page.text(MARGIN, 128, ds.title, { size: 21, bold: true, color: C.ink })
  page.text(MARGIN, 150, `Periodo: ${ds.periodLabel}`, { size: 10, color: C.ink2, maxWidth: CONTENT_W })
  const filterLine = ds.filters.map((x) => `${x.label}: ${x.value}`).join('  ·  ')
  page.text(MARGIN, 166, filterLine, { size: 9.5, color: C.ink3, maxWidth: CONTENT_W })
  drawSummary(page, ds, 184)

  let y = FIRST_TABLE_Y
  drawTableHeader(page, y)
  y += HEAD_H

  if (ds.rows.length === 0) {
    page.text(PAGE_W / 2, y + 40, 'No hay movimientos para los filtros seleccionados.', { size: 10, color: C.ink3, align: 'center' })
  }
  ds.rows.forEach((row, i) => {
    if (y + ROW_H > BOTTOM) {
      page = newPage(false)
      y = NEXT_TABLE_Y
      drawTableHeader(page, y)
      y += HEAD_H
    }
    drawRow(page, ds, row, y, i)
    y += ROW_H
  })
  if (ds.rows.length > 0) {
    if (y + ROW_H + 2 > BOTTOM) {
      page = newPage(false)
      y = NEXT_TABLE_Y
    }
    drawTotals(page, ds, y + 6)
  }

  // Pie de página con numeración.
  pages.forEach((p, i) => {
    p.hline(MARGIN, PAGE_W - MARGIN, FOOTER_Y, C.line, 0.5)
    p.text(MARGIN, FOOTER_Y + 16, `MONIQ · ${ds.title}`, { size: 8, color: C.ink3 })
    p.text(PAGE_W - MARGIN, FOOTER_Y + 16, `Página ${i + 1} de ${pages.length}`, { size: 8, color: C.ink3, align: 'right' })
  })

  // ── Ensamblado del archivo ──
  const objects: string[] = []
  const FONT_RES = '<< /Font << /F1 3 0 R /F2 4 0 R >> >>'
  const firstPageObj = 6
  const kids = pages.map((_, i) => `${firstPageObj + i * 2} 0 R`).join(' ')
  const created = ds.generatedAt
  const p2 = (n: number): string => String(n).padStart(2, '0')
  const pdfDate = `D:${created.getUTCFullYear()}${p2(created.getUTCMonth() + 1)}${p2(created.getUTCDate())}${p2(created.getUTCHours())}${p2(created.getUTCMinutes())}${p2(created.getUTCSeconds())}Z`
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  objects.push(`<< /Title (MONIQ - ${ds.title.replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, '')}) /Author (MONIQ) /Creator (MONIQ) /Producer (MONIQ) /CreationDate (${pdfDate}) >>`)
  pages.forEach((p, i) => {
    const content = p.ops.join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${FONT_RES} /Contents ${firstPageObj + i * 2 + 1} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  const bytes = new Uint8Array(out.length)
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff
  return bytes
}
