import { create } from 'zustand'
import { services } from '@/services'
import type { Settings } from '@/types/domain'

interface SettingsState {
  settings: Settings
  hydrate: () => void
  update: (patch: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: services.settings.load(),
  hydrate: () => set({ settings: services.settings.load() }),
  update: (patch) => {
    const next = { ...get().settings, ...patch }
    services.settings.save(next)
    set({ settings: next })
  },
}))
