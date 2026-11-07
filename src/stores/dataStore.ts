import { create } from 'zustand'
import { services } from '@/services'
import type {
  Budget, Category, Concept, Transaction, UserData,
} from '@/types/domain'
import type { CategoryInput, ConceptInput, DeleteCategoryStrategy, TransactionInput } from '@/services/types'

const emptyData: UserData = { categories: [], concepts: [], transactions: [], budgets: [] }

interface DataState {
  userId: string | null
  data: UserData
  loaded: boolean
  load: (userId: string) => Promise<void>
  clear: () => void
  refresh: () => Promise<void>

  createTransaction: (input: TransactionInput) => Promise<Transaction>
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>
  removeTransaction: (id: string) => Promise<void>
  restoreTransaction: (id: string) => Promise<void>

  createCategory: (input: CategoryInput) => Promise<Category>
  updateCategory: (id: string, input: Partial<CategoryInput>) => Promise<Category>
  deleteCategory: (id: string, strategy: DeleteCategoryStrategy) => Promise<void>
  createConcept: (input: ConceptInput) => Promise<Concept>
  updateConcept: (id: string, input: Partial<ConceptInput>) => Promise<Concept>
  deleteConcept: (id: string) => Promise<void>

  createBudget: (input: { categoryId: string; limit: number }) => Promise<Budget>
  updateBudget: (id: string, limit: number) => Promise<Budget>
  removeBudget: (id: string) => Promise<void>

  resetDemo: () => Promise<void>
  clearMovements: () => Promise<void>
}

function requireUser(userId: string | null): string {
  if (!userId) throw new Error('No hay una sesión activa.')
  return userId
}

export const useDataStore = create<DataState>((set, get) => {
  /** Ejecuta una mutación en la capa de servicios y re-sincroniza el estado con la fuente de verdad. */
  async function mutate<T>(fn: (userId: string) => Promise<T>): Promise<T> {
    const userId = requireUser(get().userId)
    const result = await fn(userId)
    set({ data: await services.data.load(userId) })
    return result
  }

  return {
    userId: null,
    data: emptyData,
    loaded: false,

    load: async (userId) => {
      const data = await services.data.load(userId)
      set({ userId, data, loaded: true })
    },
    clear: () => set({ userId: null, data: emptyData, loaded: false }),
    refresh: async () => {
      const userId = requireUser(get().userId)
      set({ data: await services.data.load(userId) })
    },

    createTransaction: (input) => mutate((u) => services.transactions.create(u, input)),
    updateTransaction: (id, input) => mutate((u) => services.transactions.update(u, id, input)),
    removeTransaction: (id) => mutate((u) => services.transactions.remove(u, id)),
    restoreTransaction: (id) => mutate((u) => services.transactions.restore(u, id)),

    createCategory: (input) => mutate((u) => services.categories.createCategory(u, input)),
    updateCategory: (id, input) => mutate((u) => services.categories.updateCategory(u, id, input)),
    deleteCategory: (id, strategy) => mutate((u) => services.categories.deleteCategory(u, id, strategy)),
    createConcept: (input) => mutate((u) => services.categories.createConcept(u, input)),
    updateConcept: (id, input) => mutate((u) => services.categories.updateConcept(u, id, input)),
    deleteConcept: (id) => mutate((u) => services.categories.deleteConcept(u, id)),

    createBudget: (input) => mutate((u) => services.budgets.create(u, input)),
    updateBudget: (id, limit) => mutate((u) => services.budgets.update(u, id, { limit })),
    removeBudget: (id) => mutate((u) => services.budgets.remove(u, id)),

    resetDemo: () => mutate((u) => services.data.resetDemo(u)),
    clearMovements: () => mutate((u) => services.data.clearMovements(u)),
  }
})
