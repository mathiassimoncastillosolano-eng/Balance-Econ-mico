import type { UserData } from '@/types/domain'
import { storage } from './storage'
import { buildDemoData, buildStarterData } from './seed'

export const DEMO_USER_ID = 'u_demo'

const dataKey = (userId: string): string => storage.key('data', userId)

/** Repositorio de datos por usuario. Es el único punto que lee/escribe el dataset en localStorage. */
export const userDataRepository = {
  load(userId: string): UserData {
    const stored = storage.read<UserData | null>(dataKey(userId), null)
    if (stored) return stored
    const seeded = userId === DEMO_USER_ID ? buildDemoData() : buildStarterData()
    storage.write(dataKey(userId), seeded)
    return seeded
  },
  save(userId: string, data: UserData): void {
    storage.write(dataKey(userId), data)
  },
  reset(userId: string): UserData {
    const fresh = userId === DEMO_USER_ID ? buildDemoData() : buildStarterData()
    storage.write(dataKey(userId), fresh)
    return fresh
  },
  /** Ejecuta una mutación sobre una copia y persiste el resultado. */
  mutate<T>(userId: string, fn: (data: UserData) => T): T {
    const data = structuredClone(this.load(userId))
    const result = fn(data)
    this.save(userId, data)
    return result
  },
}
