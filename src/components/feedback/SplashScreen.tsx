import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { APP_CONFIG } from '@/app/config'
import { MARK_PATHS } from '@/components/brand/Logo'

const EXIT_MS = 700

const MESSAGES = [
  'Preparando tu espacio financiero',
  'Sincronizando categorías y conceptos',
  'Calculando balances y tendencias',
  'Todo listo para decidir mejor',
]

interface SplashScreenProps {
  /** Duración mínima visible (ms). El progreso visual está sincronizado con este valor. */
  durationMs?: number
  /** Se invoca cuando la animación de salida terminó y el overlay puede desmontarse. */
  onExited: () => void
  /** Se invoca al cumplirse la duración; a partir de aquí la app puede montarse debajo. */
  onReveal: () => void
  /** Indica si la inicialización real terminó (hoy siempre true tras los datos mock). */
  ready: boolean
}

export function SplashScreen({ durationMs = APP_CONFIG.minLoaderMs, onExited, onReveal, ready }: SplashScreenProps) {
  const reduce = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [elapsedDone, setElapsedDone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const revealed = useRef(false)

  // Progreso lineal atado al reloj: 0 → 100 % en `durationMs`.
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs)
      setProgress(t)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setElapsedDone(true)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationMs])

  // La app se revela solo cuando pasaron los 3 s Y la inicialización terminó.
  useEffect(() => {
    if (elapsedDone && ready && !revealed.current) {
      revealed.current = true
      onReveal()
      setLeaving(true)
    }
  }, [elapsedDone, ready, onReveal])

  // Desmonta el overlay cuando terminó la transición de salida (0.7 s).
  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(onExited, EXIT_MS + 60)
    return () => window.clearTimeout(id)
  }, [leaving, onExited])

  const message = MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(progress * MESSAGES.length))]
  const pct = Math.round(progress * 100)

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050D22] text-white"
      initial={{ opacity: 1 }}
      animate={leaving ? { opacity: 0, scale: reduce ? 1 : 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
      role="status"
      aria-live="polite"
      aria-label="Cargando MONIQ"
    >
      {/* Atmósfera: halos azules y rejilla fina */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[42%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F6BFF]/25 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[#19D3A2]/10 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'linear-gradient(rgba(125,180,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(125,180,255,.07) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 45%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 45%, black, transparent)',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Monograma que se dibuja trazo a trazo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative grid h-[116px] w-[116px] place-items-center"
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-[34px] bg-gradient-to-br from-[#1A3C8F] to-[#0A1B3D] ring-1 ring-white/15"
            animate={reduce ? undefined : { boxShadow: ['0 0 0 0 rgba(47,107,255,0)', '0 0 70px 6px rgba(47,107,255,0.45)', '0 0 0 0 rgba(47,107,255,0)'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <svg width="84" height="84" viewBox="0 0 48 48" fill="none" className="relative">
            <defs>
              <linearGradient id="splash-r" x1="24" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9CC4FF" /><stop offset="1" stopColor="#2F6BFF" />
              </linearGradient>
            </defs>
            <motion.path
              d={MARK_PATHS.left} stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.8, ease: 'easeInOut' }}
            />
            <motion.path
              d={MARK_PATHS.right} stroke="url(#splash-r)" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 1.0, duration: 0.8, ease: 'easeInOut' }}
            />
            <motion.circle
              {...MARK_PATHS.node} fill="#19D3A2"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ transformOrigin: '35.5px 11.5px' }}
              transition={{ delay: 1.7, type: 'spring', stiffness: 260, damping: 14 }}
            />
          </svg>
        </motion.div>

        {/* Wordmark con aparición escalonada */}
        <div className="mt-8 flex font-display text-[2.1rem] font-extrabold leading-none tracking-[0.2em]" aria-hidden>
          {'MONIQ'.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.9 + i * 0.07, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
              className={i >= 3 ? 'text-[#7DB4FF]' : 'text-white'}
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 1.6, duration: 0.6 }}
          className="mt-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/60"
        >
          {APP_CONFIG.tagline}
        </motion.p>

        {/* Progreso */}
        <div className="mt-14 w-[min(300px,72vw)]">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-[#2F6BFF] via-[#7DB4FF] to-[#19D3A2]"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-white/55">
            <span key={message} className="animate-fade-in">{message}…</span>
            <span className="num font-semibold text-white/80">{pct}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
