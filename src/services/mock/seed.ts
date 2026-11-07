import { format, subMonths } from 'date-fns'
import type { Budget, Category, Concept, EntityStatus, MovementType, Transaction, UserData } from '@/types/domain'

const NOW = () => new Date().toISOString()

// PRNG determinista: los datos demo son siempre los mismos para el mismo mes.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface CatSeed { id: string; name: string; type: MovementType; color: string; icon: string }
interface ConSeed { id: string; cat: string; name: string; base: number }

const CATEGORIES: CatSeed[] = [
  { id: 'cat_sueldo', name: 'Sueldo', type: 'INGRESO', color: '#19B98A', icon: 'briefcase' },
  { id: 'cat_freelance', name: 'Freelance', type: 'INGRESO', color: '#14B8D4', icon: 'laptop' },
  { id: 'cat_inversiones', name: 'Inversiones', type: 'INGRESO', color: '#6D5DF6', icon: 'trending' },
  { id: 'cat_vivienda', name: 'Vivienda', type: 'EGRESO', color: '#2F6BFF', icon: 'home' },
  { id: 'cat_servicios', name: 'Servicios', type: 'EGRESO', color: '#F5B73B', icon: 'zap' },
  { id: 'cat_alimentacion', name: 'Alimentación', type: 'EGRESO', color: '#F58A3B', icon: 'basket' },
  { id: 'cat_transporte', name: 'Transporte', type: 'EGRESO', color: '#14B8D4', icon: 'car' },
  { id: 'cat_salud', name: 'Salud', type: 'EGRESO', color: '#E0549B', icon: 'heart' },
  { id: 'cat_ocio', name: 'Ocio', type: 'EGRESO', color: '#6D5DF6', icon: 'tv' },
  { id: 'cat_educacion', name: 'Educación', type: 'EGRESO', color: '#0E8C74', icon: 'graduation' },
  { id: 'cat_compras', name: 'Compras', type: 'EGRESO', color: '#F2594F', icon: 'shirt' },
]

const CONCEPTS: ConSeed[] = [
  { id: 'con_sueldo', cat: 'cat_sueldo', name: 'Sueldo mensual', base: 4800 },
  { id: 'con_proyecto', cat: 'cat_freelance', name: 'Proyecto web', base: 1200 },
  { id: 'con_asesoria', cat: 'cat_freelance', name: 'Asesoría', base: 450 },
  { id: 'con_dividendos', cat: 'cat_inversiones', name: 'Dividendos', base: 210 },
  { id: 'con_intereses', cat: 'cat_inversiones', name: 'Intereses de ahorro', base: 65 },
  { id: 'con_alquiler', cat: 'cat_vivienda', name: 'Alquiler', base: 1350 },
  { id: 'con_mantenimiento', cat: 'cat_vivienda', name: 'Mantenimiento', base: 160 },
  { id: 'con_luz', cat: 'cat_servicios', name: 'Electricidad', base: 95 },
  { id: 'con_agua', cat: 'cat_servicios', name: 'Agua', base: 48 },
  { id: 'con_internet', cat: 'cat_servicios', name: 'Internet', base: 99 },
  { id: 'con_telefonia', cat: 'cat_servicios', name: 'Telefonía móvil', base: 55 },
  { id: 'con_super', cat: 'cat_alimentacion', name: 'Supermercado', base: 200 },
  { id: 'con_restaurantes', cat: 'cat_alimentacion', name: 'Restaurantes', base: 80 },
  { id: 'con_delivery', cat: 'cat_alimentacion', name: 'Delivery', base: 40 },
  { id: 'con_combustible', cat: 'cat_transporte', name: 'Combustible', base: 140 },
  { id: 'con_taxi', cat: 'cat_transporte', name: 'Taxi', base: 28 },
  { id: 'con_pasaje', cat: 'cat_transporte', name: 'Transporte público', base: 60 },
  { id: 'con_seguro', cat: 'cat_salud', name: 'Seguro médico', base: 190 },
  { id: 'con_farmacia', cat: 'cat_salud', name: 'Farmacia', base: 55 },
  { id: 'con_streaming', cat: 'cat_ocio', name: 'Streaming', base: 49 },
  { id: 'con_salidas', cat: 'cat_ocio', name: 'Cine y salidas', base: 90 },
  { id: 'con_gimnasio', cat: 'cat_ocio', name: 'Gimnasio', base: 130 },
  { id: 'con_cursos', cat: 'cat_educacion', name: 'Cursos online', base: 120 },
  { id: 'con_ropa', cat: 'cat_compras', name: 'Ropa', base: 160 },
  { id: 'con_tecnologia', cat: 'cat_compras', name: 'Tecnología', base: 350 },
]

const BUDGETS: { cat: string; limit: number }[] = [
  { cat: 'cat_vivienda', limit: 1550 },
  { cat: 'cat_alimentacion', limit: 1200 },
  { cat: 'cat_servicios', limit: 330 },
  { cat: 'cat_transporte', limit: 400 },
  { cat: 'cat_ocio', limit: 420 },
  { cat: 'cat_salud', limit: 300 },
  { cat: 'cat_compras', limit: 350 },
]

function buildCategories(): Category[] {
  return CATEGORIES.map((c) => ({ ...c, status: 'ACTIVO' as EntityStatus, deletedAt: null }))
}

function buildConcepts(): Concept[] {
  return CONCEPTS.map((c) => ({
    id: c.id, categoryId: c.cat, name: c.name, baseAmount: c.base, status: 'ACTIVO' as EntityStatus, deletedAt: null,
  }))
}

/** Datos de partida para cuentas nuevas: catálogo útil, sin movimientos. */
export function buildStarterData(): UserData {
  const keep = new Set(['cat_sueldo', 'cat_vivienda', 'cat_servicios', 'cat_alimentacion', 'cat_transporte', 'cat_salud', 'cat_ocio'])
  const categories = buildCategories().filter((c) => keep.has(c.id))
  const concepts = buildConcepts().filter((c) => keep.has(c.categoryId))
  return { categories, concepts, transactions: [], budgets: [] }
}

/** Dataset demo: 12 meses de movimientos coherentes con el catálogo. */
export function buildDemoData(now = new Date()): UserData {
  const categories = buildCategories()
  const concepts = buildConcepts()
  const todayISO = format(now, 'yyyy-MM-dd')
  const transactions: Transaction[] = []
  const stamp = NOW()
  let counter = 0

  const push = (conceptId: string, date: Date, amount: number, note = ''): void => {
    const iso = format(date, 'yyyy-MM-dd')
    if (iso > todayISO || amount <= 0) return
    counter += 1
    transactions.push({
      id: `tx_seed_${String(counter).padStart(4, '0')}`, conceptId, amount: Math.round(amount * 100) / 100,
      date: iso, note, createdAt: stamp, updatedAt: stamp, deletedAt: null,
    })
  }

  for (let back = 11; back >= 0; back--) {
    const base = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), back)
    const y = base.getFullYear()
    const m = base.getMonth()
    const rand = mulberry32(y * 100 + m + 7)
    const at = (day: number): Date => new Date(y, m, day)
    const vary = (center: number, spread: number): number => center * (1 + (rand() * 2 - 1) * spread)
    const int = (min: number, max: number): number => Math.floor(min + rand() * (max - min + 1))

    // Ingresos
    push('con_sueldo', at(5), 4800, 'Abono de planilla')
    push('con_intereses', at(20), vary(65, 0.12))
    if ([2, 5, 8, 11].includes(m)) push('con_dividendos', at(14), vary(210, 0.18))
    if (rand() > 0.55) push('con_proyecto', at(int(9, 24)), vary(1200, 0.35), 'Entrega de proyecto')
    for (let i = 0; i < int(0, 2); i++) push('con_asesoria', at(int(3, 27)), vary(450, 0.25))

    // Vivienda y servicios
    push('con_alquiler', at(3), 1350, 'Alquiler del mes')
    if (rand() > 0.5) push('con_mantenimiento', at(int(10, 20)), vary(160, 0.2))
    push('con_luz', at(int(8, 12)), vary(95, 0.22))
    push('con_agua', at(int(8, 12)), vary(48, 0.12))
    push('con_internet', at(10), 99)
    push('con_telefonia', at(11), 55)

    // Alimentación
    for (const day of [4, 11, 18, 25]) push('con_super', at(day + int(0, 2)), vary(200, 0.22))
    for (let i = 0; i < int(3, 5); i++) push('con_restaurantes', at(int(2, 28)), vary(80, 0.35))
    for (let i = 0; i < int(2, 4); i++) push('con_delivery', at(int(2, 28)), vary(40, 0.3))

    // Transporte
    push('con_combustible', at(int(6, 9)), vary(140, 0.12))
    push('con_combustible', at(int(20, 24)), vary(140, 0.12))
    for (let i = 0; i < int(2, 4); i++) push('con_taxi', at(int(2, 28)), vary(28, 0.4))
    push('con_pasaje', at(2), 60)

    // Salud, ocio, educación y compras
    push('con_seguro', at(15), 190)
    if (rand() > 0.4) push('con_farmacia', at(int(3, 27)), vary(55, 0.4))
    push('con_streaming', at(12), 49)
    push('con_gimnasio', at(2), 130)
    for (let i = 0; i < int(1, 3); i++) push('con_salidas', at(int(2, 28)), vary(90, 0.35))
    if (rand() > 0.6) push('con_cursos', at(int(5, 25)), vary(120, 0.2))
    if (rand() > 0.55) push('con_ropa', at(int(5, 27)), vary(160, 0.4))
    if (rand() > 0.9) push('con_tecnologia', at(int(5, 27)), vary(350, 0.5), 'Compra de equipo')
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date))

  const budgets: Budget[] = BUDGETS.map((b) => ({ id: `bud_${b.cat}`, categoryId: b.cat, limit: b.limit, deletedAt: null }))
  return { categories, concepts, transactions, budgets }
}

