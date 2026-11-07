import type {
  Budget, Category, Concept, EntityStatus, MovementType, Settings, Transaction, User, UserData,
} from '@/types/domain'

/** Error de negocio controlado, apto para mostrarse al usuario. */
export class ServiceError extends Error {
  readonly field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ServiceError'
    this.field = field
  }
}

export interface LoginInput { email: string; password: string; remember: boolean }
export interface RegisterInput { name: string; email: string; password: string }
export interface ResetPasswordInput { email: string; code: string; password: string }

export interface AuthService {
  restoreSession(): Promise<User | null>
  login(input: LoginInput): Promise<User>
  register(input: RegisterInput): Promise<User>
  logout(): Promise<void>
  requestPasswordReset(email: string): Promise<{ code: string }>
  resetPassword(input: ResetPasswordInput): Promise<void>
  updateProfile(userId: string, input: { name: string; email: string }): Promise<User>
  changePassword(userId: string, current: string, next: string): Promise<void>
}

export interface CategoryInput { name: string; type: MovementType; color: string; icon: string; status: EntityStatus }
export interface ConceptInput { categoryId: string; name: string; baseAmount: number; status: EntityStatus }
export type DeleteCategoryStrategy = { strategy: 'archive' } | { strategy: 'reassign'; targetId: string }

export interface CategoryService {
  createCategory(userId: string, input: CategoryInput): Promise<Category>
  updateCategory(userId: string, id: string, input: Partial<CategoryInput>): Promise<Category>
  deleteCategory(userId: string, id: string, strategy: DeleteCategoryStrategy): Promise<void>
  createConcept(userId: string, input: ConceptInput): Promise<Concept>
  updateConcept(userId: string, id: string, input: Partial<ConceptInput>): Promise<Concept>
  deleteConcept(userId: string, id: string): Promise<void>
}

export interface TransactionInput { conceptId: string; amount: number; date: string; note: string }

export interface TransactionService {
  create(userId: string, input: TransactionInput): Promise<Transaction>
  update(userId: string, id: string, input: TransactionInput): Promise<Transaction>
  remove(userId: string, id: string): Promise<void>
  restore(userId: string, id: string): Promise<void>
}

export interface BudgetService {
  create(userId: string, input: { categoryId: string; limit: number }): Promise<Budget>
  update(userId: string, id: string, input: { limit: number }): Promise<Budget>
  remove(userId: string, id: string): Promise<void>
}

export interface DataService {
  load(userId: string): Promise<UserData>
  resetDemo(userId: string): Promise<void>
  clearMovements(userId: string): Promise<void>
  exportJSON(userId: string): Promise<string>
}

export interface SettingsService {
  load(): Settings
  save(settings: Settings): void
}
