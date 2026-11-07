import type { Category, Concept, UserData } from '@/types/domain'
import { uid } from '@/utils/id'
import { ServiceError, type CategoryService } from '../types'
import { userDataRepository as repo } from './repository'
import { latency } from './storage'

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()
const live = <T extends { deletedAt: string | null }>(items: T[]): T[] => items.filter((i) => !i.deletedAt)

function assertCategoryName(data: UserData, name: string, ignoreId?: string): void {
  if (!name.trim()) throw new ServiceError('El nombre no puede estar vacío.', 'name')
  if (live(data.categories).some((c) => c.id !== ignoreId && same(c.name, name))) {
    throw new ServiceError('Ya existe una categoría con ese nombre.', 'name')
  }
}

function assertConceptName(data: UserData, categoryId: string, name: string, ignoreId?: string): void {
  if (!name.trim()) throw new ServiceError('El nombre no puede estar vacío.', 'name')
  if (live(data.concepts).some((c) => c.id !== ignoreId && c.categoryId === categoryId && same(c.name, name))) {
    throw new ServiceError('Esa categoría ya tiene un concepto con ese nombre.', 'name')
  }
}

export const mockCategoryService: CategoryService = {
  async createCategory(userId, input) {
    const created = repo.mutate(userId, (data) => {
      assertCategoryName(data, input.name)
      const category: Category = { id: uid('cat'), ...input, name: input.name.trim(), deletedAt: null }
      data.categories.push(category)
      return category
    })
    return latency(created)
  },

  async updateCategory(userId, id, input) {
    const updated = repo.mutate(userId, (data) => {
      const category = data.categories.find((c) => c.id === id && !c.deletedAt)
      if (!category) throw new ServiceError('La categoría no existe.')
      if (input.name !== undefined) assertCategoryName(data, input.name, id)
      if (input.type && input.type !== category.type) {
        const used = data.concepts.some((c) => c.categoryId === id && !c.deletedAt)
        if (used) throw new ServiceError('No puedes cambiar el tipo de una categoría que ya tiene conceptos.', 'type')
      }
      Object.assign(category, { ...input, name: input.name?.trim() ?? category.name })
      return { ...category }
    })
    return latency(updated)
  },

  async deleteCategory(userId, id, strategy) {
    repo.mutate(userId, (data) => {
      const category = data.categories.find((c) => c.id === id && !c.deletedAt)
      if (!category) throw new ServiceError('La categoría no existe.')
      const now = new Date().toISOString()
      if (strategy.strategy === 'reassign') {
        const target = data.categories.find((c) => c.id === strategy.targetId && !c.deletedAt)
        if (!target || target.id === id) throw new ServiceError('Elige una categoría de destino válida.')
        if (target.type !== category.type) throw new ServiceError('La categoría de destino debe ser del mismo tipo.')
        for (const concept of data.concepts) if (concept.categoryId === id) concept.categoryId = target.id
      } else {
        for (const concept of data.concepts) if (concept.categoryId === id && !concept.deletedAt) concept.deletedAt = now
      }
      for (const budget of data.budgets) if (budget.categoryId === id && !budget.deletedAt) budget.deletedAt = now
      category.deletedAt = now
    })
    return latency(undefined)
  },

  async createConcept(userId, input) {
    const created = repo.mutate(userId, (data) => {
      const category = data.categories.find((c) => c.id === input.categoryId && !c.deletedAt)
      if (!category) throw new ServiceError('Selecciona una categoría válida.', 'categoryId')
      assertConceptName(data, input.categoryId, input.name)
      if (!(input.baseAmount >= 0)) throw new ServiceError('El importe habitual no es válido.', 'baseAmount')
      const concept: Concept = { id: uid('con'), ...input, name: input.name.trim(), deletedAt: null }
      data.concepts.push(concept)
      return concept
    })
    return latency(created)
  },

  async updateConcept(userId, id, input) {
    const updated = repo.mutate(userId, (data) => {
      const concept = data.concepts.find((c) => c.id === id && !c.deletedAt)
      if (!concept) throw new ServiceError('El concepto no existe.')
      const categoryId = input.categoryId ?? concept.categoryId
      if (input.name !== undefined || input.categoryId) assertConceptName(data, categoryId, input.name ?? concept.name, id)
      if (input.categoryId && input.categoryId !== concept.categoryId) {
        const from = data.categories.find((c) => c.id === concept.categoryId)
        const to = data.categories.find((c) => c.id === input.categoryId && !c.deletedAt)
        if (!to) throw new ServiceError('Selecciona una categoría válida.', 'categoryId')
        if (from && from.type !== to.type) throw new ServiceError('No puedes mover un concepto entre ingresos y egresos.', 'categoryId')
      }
      Object.assign(concept, { ...input, name: input.name?.trim() ?? concept.name })
      return { ...concept }
    })
    return latency(updated)
  },

  async deleteConcept(userId, id) {
    repo.mutate(userId, (data) => {
      const concept = data.concepts.find((c) => c.id === id && !c.deletedAt)
      if (!concept) throw new ServiceError('El concepto no existe.')
      concept.deletedAt = new Date().toISOString()
    })
    return latency(undefined)
  },
}
