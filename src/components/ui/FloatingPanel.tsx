import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, type KeyboardEventHandler, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

export type CloseReason = 'escape' | 'outside'

interface FloatingPanelProps {
  open: boolean
  /** Elemento al que se ancla el panel (el contenedor del disparador). */
  anchor: HTMLElement | null
  onClose: (reason: CloseReason) => void
  children: ReactNode
  id?: string
  role?: string
  label?: string
  className?: string
  /** El panel toma al menos el ancho del disparador. */
  matchAnchorWidth?: boolean
  minWidth?: number
  /** Altura máxima en px; si el espacio disponible es menor, se reduce y el contenido hace scroll. */
  maxHeight?: number
  align?: 'start' | 'end'
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
}

const MARGIN = 8
const OFFSET = 6
const MIN_HEIGHT = 160

/**
 * Panel flotante con:
 *  · posicionamiento inteligente (se abre hacia arriba si abajo no cabe, nunca se sale del viewport);
 *  · altura limitada al espacio disponible (el contenido interno hace scroll);
 *  · cierre con Escape y clic/toque fuera;
 *  · animación discreta de entrada/salida (respeta `prefers-reduced-motion`).
 *
 * Se renderiza en un portal para no recortarse por contenedores con `overflow`. Si el disparador está dentro
 * de un diálogo (Radix), el portal es el propio diálogo: así el focus-trap y el cierre por clic exterior del
 * diálogo siguen funcionando y el panel es interactivo.
 */
export function FloatingPanel({
  open, anchor, onClose, children, id, role, label, className, matchAnchorWidth, minWidth, maxHeight = 380, align = 'start', onKeyDown,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const reduce = useReducedMotion()
  const container = anchor ? (anchor.closest<HTMLElement>('[role="dialog"]') ?? document.body) : null

  useEffect(() => { closeRef.current = onClose })

  // Posicionamiento: manipula el estilo directamente (sin estado) para no re-renderizar en cada scroll.
  useLayoutEffect(() => {
    if (!open || !anchor || !container) return undefined
    const place = (): void => {
      const el = panelRef.current
      if (!el) return
      const a = anchor.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      el.style.maxHeight = 'none'
      if (matchAnchorWidth) el.style.width = `${Math.max(a.width, minWidth ?? 0)}px`
      const natural = el.offsetHeight
      const width = el.offsetWidth
      const below = vh - a.bottom - MARGIN - OFFSET
      const above = a.top - MARGIN - OFFSET
      const flip = natural > below && above > below
      const cap = Math.max(MIN_HEIGHT, Math.min(maxHeight, flip ? above : below))
      el.style.maxHeight = `${cap}px`
      const height = Math.min(natural, cap)
      const top = flip ? a.top - OFFSET - height : a.bottom + OFFSET
      const rawLeft = align === 'end' ? a.right - width : a.left
      const left = Math.min(Math.max(rawLeft, MARGIN), Math.max(MARGIN, vw - width - MARGIN))
      if (container === document.body) {
        el.style.position = 'fixed'
        el.style.left = `${left}px`
        el.style.top = `${top}px`
      } else {
        const c = container.getBoundingClientRect()
        el.style.position = 'absolute'
        el.style.left = `${left - c.left - container.clientLeft}px`
        el.style.top = `${top - c.top - container.clientTop}px`
      }
      el.style.transformOrigin = `${Math.round(Math.min(Math.max(a.left + a.width / 2 - left, 0), width))}px ${flip ? 'bottom' : 'top'}`
    }
    place()
    const onScroll = (e: Event): void => {
      if (e.target instanceof Node && panelRef.current?.contains(e.target)) return
      place()
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    if (panelRef.current) observer?.observe(panelRef.current)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
      observer?.disconnect()
    }
  }, [open, anchor, container, matchAnchorWidth, minWidth, maxHeight, align])

  // Cierre por clic exterior y Escape.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e: PointerEvent): void => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return
      closeRef.current('outside')
    }
    // `window` en fase de captura se ejecuta antes que el listener de Escape del diálogo (Radix, en `document`):
    // así Escape cierra solo este panel y no el modal que lo contiene.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      closeRef.current('escape')
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, anchor])

  if (!container) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef} id={id} role={role} aria-label={label} tabIndex={-1} onKeyDown={onKeyDown}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 }}
          transition={{ duration: reduce ? 0 : 0.14, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn('fixed left-0 top-0 z-[70] flex max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lift outline-none', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  )
}
