export type MovementType = 'INGRESO' | 'EGRESO'
export type EntityStatus = 'ACTIVO' | 'INACTIVO'
export type CurrencyCode = 'PEN' | 'USD' | 'EUR'
export type ThemeMode = 'light' | 'dark' | 'system'
export type PeriodKey = 'month' | 'quarter' | 'semester' | 'year'
export type Granularity = 'day' | 'week' | 'month'

interface SoftDeletable {
  /** Borrado lógico: ISO timestamp o null si la entidad está vigente. */
  deletedAt: string | null
}

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Category extends SoftDeletable {
  id: string
  name: string
  type: MovementType
  color: string
  icon: string
  status: EntityStatus
}

/** Concepto: elemento específico dentro de una categoría (antes "Plantilla"). */
export interface Concept extends SoftDeletable {
  id: string
  categoryId: string
  name: string
  /** Importe habitual; se sugiere al registrar un movimiento. */
  baseAmount: number
  status: EntityStatus
}

/** Movimiento: operación económica efectivamente registrada (antes "PagoMovimiento"). */
export interface Transaction extends SoftDeletable {
  id: string
  conceptId: string
  amount: number
  /** yyyy-MM-dd */
  date: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface Budget extends SoftDeletable {
  id: string
  categoryId: string
  /** Límite mensual */
  limit: number
}

export interface Settings {
  theme: ThemeMode
  currency: CurrencyCode
  compactNumbers: boolean
  defaultPeriod: PeriodKey
  sidebarCollapsed: boolean
}

export interface UserData {
  categories: Category[]
  concepts: Concept[]
  transactions: Transaction[]
  budgets: Budget[]
}

/** Movimiento con sus relaciones ya resueltas (para tablas, listas y modales). */
export interface ResolvedTransaction extends Transaction {
  concept: Concept
  category: Category
  type: MovementType
}

export interface DateRange {
  from: string
  to: string
}

export interface SeriesPoint {
  key: string
  label: string
  ingresos: number
  egresos: number
  neto: number
  acumulado: number
}
