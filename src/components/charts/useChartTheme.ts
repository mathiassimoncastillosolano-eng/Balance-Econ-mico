import { useSyncExternalStore } from 'react'

export interface ChartTheme {
  dark: boolean
  income: string
  expense: string
  brand: string
  grid: string
  axis: string
  surface: string
  ink: string
}

const LIGHT: ChartTheme = {
  dark: false, income: '#059669', expense: '#E84E44', brand: '#2F6BFF', grid: '#E6EBF3', axis: '#7A86A0', surface: '#FFFFFF', ink: '#0A1B3D',
}
const DARK: ChartTheme = {
  dark: true, income: '#26D6A3', expense: '#FF7568', brand: '#548AFF', grid: '#1E2C4E', axis: '#6C7B9C', surface: '#0C162C', ink: '#E8EEFA',
}

function subscribe(cb: () => void): () => void {
  const observer = new MutationObserver(cb)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/** Paleta de gráficos sincronizada con el tema activo (Recharts necesita colores resueltos). */
export function useChartTheme(): ChartTheme {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'), () => false)
  return dark ? DARK : LIGHT
}
