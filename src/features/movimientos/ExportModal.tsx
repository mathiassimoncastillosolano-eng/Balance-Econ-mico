import { Check, CircleCheck, Download, FileSpreadsheet, FileText, Loader2, Table, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import { downloadBlob } from '@/utils/export/download'
import { EXPORT_FORMATS, generateExport } from '@/utils/export'
import type { ExportDataset, ExportFormat } from '@/utils/export/types'
import { pluralize } from '@/utils/format'
import { notify } from '@/utils/notify'

type Phase = 'idle' | 'preparing' | 'generating' | 'downloading' | 'done' | 'error'

const FORMAT_VISUAL: Record<ExportFormat, { icon: LucideIcon; color: string }> = {
  csv: { icon: Table, color: '#2F6BFF' },
  xlsx: { icon: FileSpreadsheet, color: '#19B98A' },
  pdf: { icon: FileText, color: '#F2594F' },
}

const PHASE_TEXT: Record<Exclude<Phase, 'idle' | 'error'>, string> = {
  preparing: 'Preparando archivo…',
  generating: 'Generando documento…',
  downloading: 'Descargando…',
  done: 'Exportación completada',
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms))

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cantidad de movimientos que coinciden con los filtros (conjunto completo, no solo la página visible). */
  count: number
  /** Resumen legible de los filtros activos. */
  filterChips: string[]
  /** Construye el dataset en el momento de exportar, a partir de los filtros vigentes. */
  buildDataset: () => ExportDataset
}

/** Panel para elegir el formato y descargar el historial filtrado (CSV, Excel o PDF reales). */
export function ExportModal({ open, onOpenChange, count, filterChips, buildDataset }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const closeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(closeTimer.current)
    }
  }, [])

  const busy = phase === 'preparing' || phase === 'generating' || phase === 'downloading' || phase === 'done'
  const info = EXPORT_FORMATS.find((f) => f.id === format) ?? EXPORT_FORMATS[0]

  function handleOpenChange(next: boolean): void {
    if (busy) return
    if (!next) { setPhase('idle'); setError(null) }
    onOpenChange(next)
  }

  async function run(): Promise<void> {
    if (busy) return // evita exportaciones simultáneas
    setError(null)
    try {
      setPhase('preparing')
      await pause(200)
      const dataset = buildDataset()
      if (!mounted.current) return
      setPhase('generating')
      await pause(0)
      const file = await generateExport(format, dataset)
      if (!mounted.current) return
      setPhase('downloading')
      await pause(200)
      downloadBlob(file.blob, file.filename)
      if (!mounted.current) return
      setPhase('done')
      notify.success('Exportación completada', file.filename)
      closeTimer.current = window.setTimeout(() => {
        if (!mounted.current) return
        setPhase('idle')
        onOpenChange(false)
      }, 900)
    } catch (e) {
      if (!mounted.current) return
      setPhase('error')
      setError(e instanceof Error && e.message ? e.message : null)
    }
  }

  const status = phase === 'idle' ? null : phase
  return (
    <Modal
      open={open} onOpenChange={handleOpenChange} size="md"
      title="Exportar información"
      description="Selecciona el formato en el que deseas descargar tus movimientos financieros."
      footer={(
        <>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={() => void run()} loading={busy && phase !== 'done'} disabled={busy || count === 0}>
            {phase === 'done' ? <><Check className="h-4 w-4" /> Listo</> : phase === 'error' ? <><Download className="h-4 w-4" /> Reintentar</> : <><Download className="h-4 w-4" /> Exportar archivo {info.name}</>}
          </Button>
        </>
      )}
    >
      <div className="space-y-4 pt-1">
        <div role="radiogroup" aria-label="Formato de exportación" className="space-y-2.5">
          {EXPORT_FORMATS.map((f) => {
            const selected = f.id === format
            const { icon: Icon, color } = FORMAT_VISUAL[f.id]
            return (
              <label
                key={f.id}
                className={cn(
                  'group relative flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-150',
                  selected ? 'border-brand bg-brand-soft/50 shadow-soft' : 'border-line hover:border-line-strong hover:bg-surface-2',
                  busy && 'pointer-events-none opacity-60',
                  'focus-within:ring-4 focus-within:ring-brand/15',
                )}
              >
                <input type="radio" name="export-format" className="sr-only" checked={selected} disabled={busy} onChange={() => { setFormat(f.id); if (phase === 'error') { setPhase('idle'); setError(null) } }} />
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-150 group-hover:scale-105" style={{ backgroundColor: `${color}22`, color }}>
                  <Icon className="h-5 w-5" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-ink">{f.name}</span>
                    <span className="num rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">{f.extension}</span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{f.description}</span>
                </span>
                <span
                  aria-hidden
                  className={cn('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-all duration-150', selected ? 'border-brand bg-brand text-white' : 'border-line-strong')}
                >
                  <Check className={cn('h-3 w-3 transition-all duration-150', selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} strokeWidth={3.2} />
                </span>
              </label>
            )
          })}
        </div>

        <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
          <p>
            Se exportarán <strong className="font-semibold text-ink">{pluralize(count, 'movimiento', 'movimientos')}</strong> con los filtros actuales, no solo los de la página visible.
          </p>
          {filterChips.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Filtros aplicados">
              {filterChips.map((c) => <li key={c} className="rounded-full bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 ring-1 ring-line">{c}</li>)}
            </ul>
          )}
        </div>

        <div aria-live="polite" role="status" className="min-h-0">
          {status && status !== 'error' && (
            <div className={cn('flex animate-fade-in items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium', status === 'done' ? 'bg-income-soft text-income' : 'bg-brand-soft text-brand-ink')}>
              {status === 'done' ? <CircleCheck className="h-[18px] w-[18px] shrink-0" /> : <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" />}
              <span>{PHASE_TEXT[status]}{status !== 'done' && <span className="font-normal text-ink-2"> · {info.name}</span>}</span>
            </div>
          )}
          {status === 'error' && (
            <div role="alert" className="flex animate-fade-in items-start gap-3 rounded-xl bg-expense-soft px-3.5 py-3 text-[13px] text-expense">
              <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" />
              <div>
                <p className="font-semibold">No pudimos exportar el archivo</p>
                <p className="mt-0.5 font-normal text-ink-2">Tus datos no se modificaron. Inténtalo de nuevo o elige otro formato.{error ? ` (${error})` : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
