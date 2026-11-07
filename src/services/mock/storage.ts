import { APP_CONFIG } from '@/app/config'

/** Capa mínima sobre localStorage. Toda la persistencia mock pasa por aquí. */
export const storage = {
  key: (...parts: string[]): string => [APP_CONFIG.storagePrefix, ...parts].join(':'),
  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  write<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Cuota excedida o modo privado: la sesión actual sigue funcionando en memoria.
    }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key) } catch { /* noop */ }
  },
}

export const latency = <T>(value: T, ms: number = APP_CONFIG.mockLatencyMs): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms))
