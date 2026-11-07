import { create } from 'zustand'
import type { MovementType, PeriodKey, ResolvedTransaction } from '@/types/domain'
import { useSettingsStore } from './settingsStore'

export interface MovementModalState {
  open: boolean
  mode: 'create' | 'edit'
  transaction: ResolvedTransaction | null
  presetType: MovementType
  presetConceptId: string | null
}

interface UiState {
  period: PeriodKey
  setPeriod: (period: PeriodKey) => void
  mobileNavOpen: boolean
  setMobileNav: (open: boolean) => void
  movementModal: MovementModalState
  openCreateMovement: (preset?: { type?: MovementType; conceptId?: string }) => void
  openEditMovement: (tx: ResolvedTransaction) => void
  closeMovementModal: () => void
}

const closedModal: MovementModalState = {
  open: false, mode: 'create', transaction: null, presetType: 'EGRESO', presetConceptId: null,
}

export const useUiStore = create<UiState>((set) => ({
  period: useSettingsStore.getState().settings.defaultPeriod,
  setPeriod: (period) => set({ period }),
  mobileNavOpen: false,
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  movementModal: closedModal,
  openCreateMovement: (preset) =>
    set({
      movementModal: {
        open: true, mode: 'create', transaction: null,
        presetType: preset?.type ?? 'EGRESO', presetConceptId: preset?.conceptId ?? null,
      },
    }),
  openEditMovement: (tx) =>
    set({ movementModal: { open: true, mode: 'edit', transaction: tx, presetType: tx.type, presetConceptId: tx.conceptId } }),
  closeMovementModal: () => set((s) => ({ movementModal: { ...s.movementModal, open: false } })),
}))
