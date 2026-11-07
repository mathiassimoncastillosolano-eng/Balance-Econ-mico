import { useCallback } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatMoney } from '@/utils/format'

interface MoneyFormatOptions { compact?: boolean; signed?: boolean; decimals?: boolean }

/** Formateador monetario ligado a la moneda y preferencias del usuario. */
export function useMoney(): (value: number, opts?: MoneyFormatOptions) => string {
  const currency = useSettingsStore((s) => s.settings.currency)
  const compactDefault = useSettingsStore((s) => s.settings.compactNumbers)
  return useCallback(
    (value, opts = {}) => formatMoney(value, currency, { compact: compactDefault, ...opts }),
    [currency, compactDefault],
  )
}

export function useCurrencySymbol(): string {
  const currency = useSettingsStore((s) => s.settings.currency)
  return formatMoney(0, currency).split(' ')[0] ?? 'S/'
}
