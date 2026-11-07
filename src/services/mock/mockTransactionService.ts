import type { Transaction, UserData } from '@/types/domain'
import { todayISO } from '@/utils/dates'
import { uid } from '@/utils/id'
import { ServiceError, type TransactionInput, type TransactionService } from '../types'
import { userDataRepository as repo } from './repository'
import { latency } from './storage'

function validate(data: UserData, input: TransactionInput, existing?: Transaction): void {
  const concept = data.concepts.find((c) => c.id === input.conceptId)
  const category = concept ? data.categories.find((c) => c.id === concept.categoryId) : undefined
  if (!concept || !category) throw new ServiceError('Selecciona un concepto válido.', 'conceptId')
  // Un movimiento ya existente puede conservar su concepto aunque luego se haya desactivado.
  const keepsOwnConcept = existing?.conceptId === concept.id
  if (!keepsOwnConcept && (concept.deletedAt || concept.status === 'INACTIVO' || category.deletedAt || category.status === 'INACTIVO')) {
    throw new ServiceError('Ese concepto o su categoría están inactivos.', 'conceptId')
  }
  if (!(input.amount > 0)) throw new ServiceError('El importe debe ser mayor a 0.', 'amount')
  if (Math.round(input.amount * 100) / 100 !== input.amount) throw new ServiceError('El importe admite máximo 2 decimales.', 'amount')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ServiceError('La fecha no es válida.', 'date')
  if (input.date > todayISO()) throw new ServiceError('La fecha no puede ser futura.', 'date')
}

export const mockTransactionService: TransactionService = {
  async create(userId, input) {
    const created = repo.mutate(userId, (data) => {
      validate(data, input)
      const now = new Date().toISOString()
      const tx: Transaction = { id: uid('tx'), ...input, note: input.note.trim(), createdAt: now, updatedAt: now, deletedAt: null }
      data.transactions.push(tx)
      return tx
    })
    return latency(created)
  },

  async update(userId, id, input) {
    const updated = repo.mutate(userId, (data) => {
      const tx = data.transactions.find((t) => t.id === id && !t.deletedAt)
      if (!tx) throw new ServiceError('El movimiento no existe.')
      validate(data, input, tx)
      Object.assign(tx, { ...input, note: input.note.trim(), updatedAt: new Date().toISOString() })
      return { ...tx }
    })
    return latency(updated)
  },

  async remove(userId, id) {
    repo.mutate(userId, (data) => {
      const tx = data.transactions.find((t) => t.id === id && !t.deletedAt)
      if (!tx) throw new ServiceError('El movimiento no existe.')
      tx.deletedAt = new Date().toISOString()
    })
    return latency(undefined, 90)
  },

  async restore(userId, id) {
    repo.mutate(userId, (data) => {
      const tx = data.transactions.find((t) => t.id === id)
      if (!tx) throw new ServiceError('El movimiento no existe.')
      tx.deletedAt = null
    })
    return latency(undefined, 90)
  },
}
