import type { Settings } from '@/types/domain'
import type { SettingsService } from '../types'
import { storage } from './storage'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', currency: 'PEN', compactNumbers: true, defaultPeriod: 'month', sidebarCollapsed: false,
}
const KEY = storage.key('settings')

export const mockSettingsService: SettingsService = {
  load: () => ({ ...DEFAULT_SETTINGS, ...storage.read<Partial<Settings>>(KEY, {}) }),
  save: (settings) => storage.write(KEY, settings),
}
