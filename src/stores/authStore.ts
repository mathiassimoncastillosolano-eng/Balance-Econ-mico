import { create } from 'zustand'
import { services } from '@/services'
import type { LoginInput, RegisterInput } from '@/services/types'
import type { User } from '@/types/domain'
import { useDataStore } from './dataStore'

interface AuthState {
  user: User | null
  restore: () => Promise<User | null>
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  updateProfile: (input: { name: string; email: string }) => Promise<User>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,

  restore: async () => {
    const user = await services.auth.restoreSession()
    if (user) await useDataStore.getState().load(user.id)
    set({ user })
    return user
  },

  login: async (input) => {
    const user = await services.auth.login(input)
    await useDataStore.getState().load(user.id)
    set({ user })
    return user
  },

  register: async (input) => {
    const user = await services.auth.register(input)
    await useDataStore.getState().load(user.id)
    set({ user })
    return user
  },

  logout: async () => {
    await services.auth.logout()
    useDataStore.getState().clear()
    set({ user: null })
  },

  updateProfile: async (input) => {
    const current = get().user
    if (!current) throw new Error('No hay una sesión activa.')
    const user = await services.auth.updateProfile(current.id, input)
    set({ user })
    return user
  },
}))
