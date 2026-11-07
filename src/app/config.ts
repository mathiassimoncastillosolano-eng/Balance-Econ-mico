/** Configuración global de MONIQ. Centraliza valores que hoy son fijos y mañana vendrán de un backend. */
export const APP_CONFIG = {
  name: 'MONIQ',
  tagline: 'Inteligencia financiera personal',
  /** Duración mínima de la pantalla de carga inicial. */
  minLoaderMs: 3000,
  storagePrefix: 'moniq:v1',
  splashSessionKey: 'moniq:v1:splash-shown',
  /** Latencia simulada de los servicios mock (ms). */
  mockLatencyMs: 140,
  demoCredentials: { email: 'demo@economicbalance.pe', password: 'Demo2026' },
} as const
