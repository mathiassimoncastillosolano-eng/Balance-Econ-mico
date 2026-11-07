import type { Budget } from '@/types/domain'
import { uid } from '@/utils/id'
import { ServiceError, type BudgetService } from '../types'
import { userDataRepository as repo } from './repository'
import { latency } from './storage'

const assertLimit = (limit: number): void => {
  if (!(limit > 0)) throw new ServiceError('El límite debe ser mayor a 0.', 'limit')
}

export const mockBudgetService: BudgetService = {
  async create(userId, { categoryId, limit }) {
    const created = repo.mutate(userId, (data) => {
      const category = data.categories.find((c) => c.id === categoryId && !c.deletedAt)
      if (!category || category.type !== 'EGRESO') throw new ServiceError('Elige una categoría de egresos.', 'categoryId')
      if (data.budgets.some((b) => b.categoryId === categoryId && !b.deletedAt)) {
        throw new ServiceError('Esa categoría ya tiene un presupuesto.', 'categoryId')
      }
      assertLimit(limit)
      const budget: Budget = { id: uid('bud'), categoryId, limit, deletedAt: null }
      data.budgets.push(budget)
      return budget
    })
    return latency(created)
  },

  async update(userId, id, { limit }) {
    const updated = repo.mutate(userId, (data) => {
      const budget = data.budgets.find((b) => b.id === id && !b.deletedAt)
      if (!budget) throw new ServiceError('El presupuesto no existe.')
      assertLimit(limit)
      budget.limit = limit
      return { ...budget }
    })
    return latency(updated)
  },

  async remove(userId, id) {
    repo.mutate(userId, (data) => {
      const budget = data.budgets.find((b) => b.id === id && !b.deletedAt)
      if (!budget) throw new ServiceError('El presupuesto no existe.')
      budget.deletedAt = new Date().toISOString()
    })
    return latency(undefined, 90)
  },
}
