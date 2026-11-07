import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type {
  Budget, Category, Concept, DateRange, Granularity, MovementType, ResolvedTransaction, SeriesPoint, Transaction, UserData,
} from '@/types/domain'
import { buildBuckets, inRange, monthKey, monthRange } from './dates'
import { capitalize } from './format'

/** Redondea a centavos para evitar errores de coma flotante al sumar. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100
export const sum = (values: number[]): number => round2(values.reduce((a, b) => a + b, 0))

export function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Resuelve las relaciones. Las entidades eliminadas lógicamente siguen siendo
 * resolubles para conservar el historial coherente.
 */
export function resolveTransactions(data: UserData, opts: { includeDeleted?: boolean } = {}): ResolvedTransaction[] {
  const concepts = new Map(data.concepts.map((c) => [c.id, c]))
  const categories = new Map(data.categories.map((c) => [c.id, c]))
  const out: ResolvedTransaction[] = []
  for (const t of data.transactions) {
    if (!opts.includeDeleted && t.deletedAt) continue
    const concept = concepts.get(t.conceptId)
    const category = concept ? categories.get(concept.categoryId) : undefined
    if (!concept || !category) continue
    out.push({ ...t, concept, category, type: category.type })
  }
  return out.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
}

export const filterRange = (txs: ResolvedTransaction[], range: DateRange): ResolvedTransaction[] =>
  txs.filter((t) => inRange(t.date, range))

export const totalOf = (txs: ResolvedTransaction[], type: MovementType): number =>
  sum(txs.filter((t) => t.type === type).map((t) => t.amount))

export interface Totals { ingresos: number; egresos: number; neto: number; ahorro: number; count: number }

export function computeTotals(txs: ResolvedTransaction[]): Totals {
  const ingresos = totalOf(txs, 'INGRESO')
  const egresos = totalOf(txs, 'EGRESO')
  const neto = round2(ingresos - egresos)
  return { ingresos, egresos, neto, ahorro: ingresos > 0 ? (neto / ingresos) * 100 : 0, count: txs.length }
}

/** Saldo disponible: todo lo ingresado menos todo lo egresado hasta una fecha (inclusive). */
export function balanceUntil(txs: ResolvedTransaction[], untilISO: string): number {
  return sum(txs.filter((t) => t.date <= untilISO).map((t) => (t.type === 'INGRESO' ? t.amount : -t.amount)))
}

/** Serie temporal con flujo por intervalo y saldo acumulado (incluye saldo de apertura). */
export function buildSeries(allTxs: ResolvedTransaction[], range: DateRange, granularity: Granularity): SeriesPoint[] {
  const buckets = buildBuckets(range, granularity)
  const before = new Date(range.from)
  before.setDate(before.getDate() - 1)
  let running = balanceUntil(allTxs, format(before, 'yyyy-MM-dd'))
  const scoped = filterRange(allTxs, range)
  return buckets.map((b) => {
    const inBucket = scoped.filter((t) => t.date >= b.from && t.date <= b.to)
    const ingresos = totalOf(inBucket, 'INGRESO')
    const egresos = totalOf(inBucket, 'EGRESO')
    const neto = round2(ingresos - egresos)
    running = round2(running + neto)
    return { key: b.key, label: b.label, ingresos, egresos, neto, acumulado: running }
  })
}

export interface CategoryShare { category: Category; total: number; share: number; count: number }

export function groupByCategory(txs: ResolvedTransaction[], type: MovementType): CategoryShare[] {
  const scoped = txs.filter((t) => t.type === type)
  const total = sum(scoped.map((t) => t.amount))
  const map = new Map<string, CategoryShare>()
  for (const t of scoped) {
    const row = map.get(t.category.id) ?? { category: t.category, total: 0, share: 0, count: 0 }
    row.total = round2(row.total + t.amount)
    row.count += 1
    map.set(t.category.id, row)
  }
  return [...map.values()]
    .map((r) => ({ ...r, share: total > 0 ? (r.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)
}

export interface ConceptShare { concept: Concept; category: Category; total: number; count: number }

export function groupByConcept(txs: ResolvedTransaction[], type?: MovementType): ConceptShare[] {
  const map = new Map<string, ConceptShare>()
  for (const t of txs) {
    if (type && t.type !== type) continue
    const row = map.get(t.concept.id) ?? { concept: t.concept, category: t.category, total: 0, count: 0 }
    row.total = round2(row.total + t.amount)
    row.count += 1
    map.set(t.concept.id, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export interface FlowInsights {
  total: number
  dailyAverage: number
  largest: ResolvedTransaction | null
  busiestDay: { date: string; total: number } | null
  frequency: number
}

export function flowInsights(txs: ResolvedTransaction[], type: MovementType, range: DateRange): FlowInsights {
  const scoped = txs.filter((t) => t.type === type)
  const total = sum(scoped.map((t) => t.amount))
  const days = Math.max(1, Math.round((parseISO(range.to).getTime() - parseISO(range.from).getTime()) / 86_400_000) + 1)
  const byDay = new Map<string, number>()
  for (const t of scoped) byDay.set(t.date, round2((byDay.get(t.date) ?? 0) + t.amount))
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]
  const largest = scoped.reduce<ResolvedTransaction | null>((m, t) => (!m || t.amount > m.amount ? t : m), null)
  return {
    total,
    dailyAverage: round2(total / days),
    largest,
    busiestDay: busiest ? { date: busiest[0], total: busiest[1] } : null,
    frequency: scoped.length,
  }
}

// ───────────────────────── Presupuestos ─────────────────────────
export type BudgetState = 'ok' | 'warning' | 'over'

export interface BudgetStatus {
  budget: Budget
  category: Category
  spent: number
  percent: number
  remaining: number
  state: BudgetState
}

export const BUDGET_WARNING_THRESHOLD = 80

export function budgetState(percent: number): BudgetState {
  if (percent >= 100) return 'over'
  if (percent >= BUDGET_WARNING_THRESHOLD) return 'warning'
  return 'ok'
}

export function computeBudgetStatuses(data: UserData, txs: ResolvedTransaction[], year: number, month0: number): BudgetStatus[] {
  const range = monthRange(year, month0)
  const spentByCategory = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'EGRESO' || !inRange(t.date, range)) continue
    spentByCategory.set(t.category.id, round2((spentByCategory.get(t.category.id) ?? 0) + t.amount))
  }
  const categories = new Map(data.categories.map((c) => [c.id, c]))
  const out: BudgetStatus[] = []
  for (const budget of data.budgets) {
    if (budget.deletedAt) continue
    const category = categories.get(budget.categoryId)
    if (!category || category.deletedAt) continue
    const spent = spentByCategory.get(category.id) ?? 0
    const percent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0
    out.push({ budget, category, spent, percent, remaining: round2(budget.limit - spent), state: budgetState(percent) })
  }
  return out.sort((a, b) => b.percent - a.percent)
}

// ───────────────────────── Insights ─────────────────────────
export interface Insight { id: string; tone: 'positive' | 'negative' | 'neutral' | 'warning'; title: string; body: string }

export function monthName(key: string): string {
  return capitalize(format(parseISO(`${key}-01`), 'MMMM', { locale: es }))
}

export function lastMonthsKeys(count: number, now = new Date()): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) keys.push(monthKey(format(new Date(now.getFullYear(), now.getMonth() - i, 1), 'yyyy-MM-dd')))
  return keys
}

export type TransactionInput = Pick<Transaction, 'conceptId' | 'amount' | 'date' | 'note'>
