import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Inicialización de la aplicación.
 *
 * HOY: lee ajustes locales y restaura la sesión simulada (datos mock en localStorage).
 * FUTURO: reemplazar el cuerpo por la inicialización real (token, perfil, configuración, datos
 * del usuario). `BootGate` espera a que esta promesa termine además del tiempo mínimo del loader.
 */
export async function initializeApp(): Promise<void> {
  useSettingsStore.getState().hydrate()
  // Precarga los módulos de las pantallas de entrada mientras se muestra el loader,
  // para que la transición hacia el login o el panel no tenga esperas.
  void import('@/features/auth/LoginPage')
  void import('@/features/dashboard/DashboardPage')
  void import('@/features/movimientos/MovementFormModal')
  await useAuthStore.getState().restore()
}
