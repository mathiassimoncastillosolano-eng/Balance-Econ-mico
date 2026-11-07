import { useId } from 'react'
import { cn } from '@/utils/cn'

/**
 * Monograma MONIQ.
 * Una «M» construida con dos trazos: el izquierdo (base, estabilidad) y el derecho (impulso, crecimiento)
 * que culmina en un nodo esmeralda — el «IQ»: el punto donde el dato se convierte en decisión.
 */
export const MARK_PATHS = {
  left: 'M12.5 35V13.5L24 27',
  right: 'M24 27L35.5 13.5V35',
  node: { cx: 35.5, cy: 11.5, r: 3.3 },
} as const

interface MarkProps {
  size?: number
  /** `badge`: app-icon con fondo. `bare`: solo el monograma, para fondos propios. */
  variant?: 'badge' | 'bare'
  /** `onDark` fuerza trazo izquierdo claro (fondos oscuros). */
  tone?: 'default' | 'onDark'
  className?: string
}

export function LogoMark({ size = 36, variant = 'badge', tone = 'default', className }: MarkProps) {
  const uid = useId().replace(/:/g, '')
  const badge = variant === 'badge'
  const leftStroke = badge || tone === 'onDark' ? '#FFFFFF' : 'rgb(var(--ink))'
  return (
    <svg
      width={size} height={size} viewBox="0 0 48 48" fill="none" role="img" aria-label="MONIQ"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1A3C8F" /><stop offset="1" stopColor="#0A1B3D" />
        </linearGradient>
        <linearGradient id={`rg-${uid}`} x1="24" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DB4FF" /><stop offset="1" stopColor="#2F6BFF" />
        </linearGradient>
      </defs>
      {badge && <rect width="48" height="48" rx="13" fill={`url(#bg-${uid})`} />}
      {badge && <rect x="0.5" y="0.5" width="47" height="47" rx="12.5" stroke="white" strokeOpacity="0.12" />}
      <path d={MARK_PATHS.left} stroke={leftStroke} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK_PATHS.right} stroke={`url(#rg-${uid})`} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle {...MARK_PATHS.node} fill="#19D3A2" />
    </svg>
  )
}

interface WordmarkProps { className?: string; tone?: 'default' | 'onDark' }

export function Wordmark({ className, tone = 'default' }: WordmarkProps) {
  return (
    <span
      className={cn('font-display font-extrabold leading-none tracking-[0.14em]', tone === 'onDark' ? 'text-white' : 'text-ink', className)}
      aria-label="MONIQ"
    >
      MON<span className={tone === 'onDark' ? 'text-[#7DB4FF]' : 'text-brand'}>IQ</span>
    </span>
  )
}

interface LogoProps {
  variant?: 'full' | 'mark' | 'stacked'
  size?: number
  tone?: 'default' | 'onDark'
  className?: string
}

/** Logotipo completo: `full` (horizontal), `stacked` (vertical, login/loader) y `mark` (compacto, sidebar contraído). */
export function Logo({ variant = 'full', size = 36, tone = 'default', className }: LogoProps) {
  if (variant === 'mark') return <LogoMark size={size} tone={tone} className={className} />
  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center gap-4', className)}>
        <LogoMark size={size * 1.6} tone={tone} />
        <Wordmark tone={tone} className="text-[1.6rem]" />
      </div>
    )
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark size={size} tone={tone} />
      <Wordmark tone={tone} className="text-[1.15rem]" />
    </div>
  )
}
