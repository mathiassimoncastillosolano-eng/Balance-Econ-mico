import { mockAuthService } from './mock/mockAuthService'
import { mockBudgetService } from './mock/mockBudgetService'
import { mockCategoryService } from './mock/mockCategoryService'
import { mockDataService } from './mock/mockDataService'
import { mockSettingsService } from './mock/mockSettingsService'
import { mockTransactionService } from './mock/mockTransactionService'

/**
 * Punto único de inyección de servicios. Para conectar un backend real basta con
 * reemplazar estas implementaciones por clientes HTTP que respeten las interfaces de `types.ts`.
 */
export const services = {
  auth: mockAuthService,
  data: mockDataService,
  categories: mockCategoryService,
  transactions: mockTransactionService,
  budgets: mockBudgetService,
  settings: mockSettingsService,
}

export { ServiceError } from './types'
export type * from './types'
