import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CurrencyCode } from '@/types/domain'

export const CURRENCIES: Record<CurrencyCode, { label: string; symbol: string; locale: string }> = {
  PEN: { label: 'Sol peruano', symbol: 'S/', locale: 'es-PE' },
  USD: { label: 'Dólar estadounidense', symbol: '$', locale: 'en-US' },
  EUR: { label: 'Euro', symbol: '€', locale: 'es-ES' },
}

interface MoneyOptions {
  compact?: boolean
  signed?: boolean
  decimals?: boolean
}

export function formatMoney(value: number, currency: CurrencyCode = 'PEN', opts: MoneyOptions = {}): string {
  const { compact = false, signed = false, decimals = true } = opts
  const meta = CURRENCIES[currency]
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : ''
  const useCompact = compact && abs >= 10_000
  const nf = new Intl.NumberFormat(meta.locale, {
    notation: useCompact ? 'compact' : 'standard',
    minimumFractionDigits: useCompact || !decimals ? 0 : 2,
    maximumFractionDigits: useCompact ? 1 : decimals ? 2 : 0,
  })
  return `${sign}${meta.symbol} ${nf.format(abs)}`
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatDate(iso: string, pattern = "d 'de' MMMM yyyy"): string {
  return capitalize(format(parseISO(iso), pattern, { locale: es }))
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM', { locale: es })
}

export function capitalize(text: string): string {
  return text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
