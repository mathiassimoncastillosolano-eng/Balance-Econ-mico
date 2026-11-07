import { APP_CONFIG } from '@/app/config'
import type { User } from '@/types/domain'
import { uid } from '@/utils/id'
import { ServiceError, type AuthService } from '../types'
import { DEMO_USER_ID } from './repository'
import { latency, storage } from './storage'

interface StoredUser extends User { passwordHash: string }

const USERS_KEY = storage.key('users')
const SESSION_KEY = storage.key('session')
const RESETS_KEY = storage.key('resets')

/** Hash de demostración. NO es seguro: sustituir por autenticación real en el backend. */
function mockHash(value: string): string {
  let h = 5381
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) | 0
  return `mock$${(h >>> 0).toString(36)}`
}

const normalize = (email: string): string => email.trim().toLowerCase()

function readUsers(): StoredUser[] {
  const users = storage.read<StoredUser[]>(USERS_KEY, [])
  if (users.some((u) => u.id === DEMO_USER_ID)) return users
  const demo: StoredUser = {
    id: DEMO_USER_ID,
    name: 'Camila Torres',
    email: APP_CONFIG.demoCredentials.email,
    passwordHash: mockHash(APP_CONFIG.demoCredentials.password),
    createdAt: new Date().toISOString(),
  }
  const next = [demo, ...users]
  storage.write(USERS_KEY, next)
  return next
}

const toPublic = ({ passwordHash: _hash, ...user }: StoredUser): User => {
  void _hash
  return user
}

function persistSession(userId: string, remember: boolean): void {
  storage.remove(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  if (remember) storage.write(SESSION_KEY, { userId })
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId }))
}

function readSession(): string | null {
  const persistent = storage.read<{ userId: string } | null>(SESSION_KEY, null)
  if (persistent) return persistent.userId
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as { userId: string }).userId : null
  } catch {
    return null
  }
}

const PASSWORD_RULES = 'Mínimo 8 caracteres, con al menos una letra y un número, sin espacios.'
export function validatePasswordRules(password: string): string | null {
  if (password.length < 8 || /\s/.test(password) || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return PASSWORD_RULES
  return null
}

export const mockAuthService: AuthService = {
  async restoreSession() {
    const id = readSession()
    const user = readUsers().find((u) => u.id === id)
    return latency(user ? toPublic(user) : null, 40)
  },

  async login({ email, password, remember }) {
    const user = readUsers().find((u) => u.email === normalize(email))
    if (!user) throw new ServiceError('No encontramos una cuenta con ese correo.', 'email')
    if (user.passwordHash !== mockHash(password)) throw new ServiceError('La contraseña no es correcta.', 'password')
    persistSession(user.id, remember)
    return latency(toPublic(user), 450)
  },

  async register({ name, email, password }) {
    const users = readUsers()
    if (users.some((u) => u.email === normalize(email))) throw new ServiceError('Este correo ya está registrado.', 'email')
    const ruleError = validatePasswordRules(password)
    if (ruleError) throw new ServiceError(ruleError, 'password')
    const user: StoredUser = {
      id: uid('u'), name: name.trim(), email: normalize(email), passwordHash: mockHash(password), createdAt: new Date().toISOString(),
    }
    storage.write(USERS_KEY, [...users, user])
    persistSession(user.id, true)
    return latency(toPublic(user), 600)
  },

  async logout() {
    storage.remove(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    return latency(undefined, 80)
  },

  async requestPasswordReset(email) {
    const user = readUsers().find((u) => u.email === normalize(email))
    if (!user) throw new ServiceError('No encontramos una cuenta con ese correo.', 'email')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    storage.write(RESETS_KEY, { ...storage.read<Record<string, string>>(RESETS_KEY, {}), [user.id]: code })
    return latency({ code }, 500)
  },

  async resetPassword({ email, code, password }) {
    const users = readUsers()
    const user = users.find((u) => u.email === normalize(email))
    const resets = storage.read<Record<string, string>>(RESETS_KEY, {})
    if (!user || resets[user.id] !== code.trim()) throw new ServiceError('El código no es válido.', 'code')
    const ruleError = validatePasswordRules(password)
    if (ruleError) throw new ServiceError(ruleError, 'password')
    delete resets[user.id]
    storage.write(RESETS_KEY, resets)
    storage.write(USERS_KEY, users.map((u) => (u.id === user.id ? { ...u, passwordHash: mockHash(password) } : u)))
    return latency(undefined, 500)
  },

  async updateProfile(userId, { name, email }) {
    const users = readUsers()
    const taken = users.some((u) => u.id !== userId && u.email === normalize(email))
    if (taken) throw new ServiceError('Ese correo ya pertenece a otra cuenta.', 'email')
    const next = users.map((u) => (u.id === userId ? { ...u, name: name.trim(), email: normalize(email) } : u))
    storage.write(USERS_KEY, next)
    const updated = next.find((u) => u.id === userId)
    if (!updated) throw new ServiceError('Cuenta no encontrada.')
    return latency(toPublic(updated), 300)
  },

  async changePassword(userId, current, nextPassword) {
    const users = readUsers()
    const user = users.find((u) => u.id === userId)
    if (!user || user.passwordHash !== mockHash(current)) throw new ServiceError('La contraseña actual no es correcta.', 'current')
    const ruleError = validatePasswordRules(nextPassword)
    if (ruleError) throw new ServiceError(ruleError, 'next')
    storage.write(USERS_KEY, users.map((u) => (u.id === userId ? { ...u, passwordHash: mockHash(nextPassword) } : u)))
    return latency(undefined, 350)
  },
}
