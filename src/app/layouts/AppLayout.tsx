import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/navigation/Header'
import { Sidebar, SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED } from '@/components/navigation/Sidebar'
import { Skeleton } from '@/components/ui/Skeleton'
import { MovementFormModal } from '@/features/movimientos/MovementFormModal'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

function PageFallback() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
    </div>
  )
}

export function AppLayout() {
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const collapsed = useSettingsStore((s) => s.settings.sidebarCollapsed)
  const setMobileNav = useUiStore((s) => s.setMobileNav)
  const openCreate = useUiStore((s) => s.openCreateMovement)

  useEffect(() => { setMobileNav(false) }, [location.pathname, setMobileNav])

  // Atajo: «N» abre el registro rápido (si no se está escribiendo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'n' && !document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        e.preventDefault()
        openCreate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openCreate])

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#contenido" className="sr-only z-[90] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <Sidebar />
      <motion.div
        initial={false}
        animate={{ paddingLeft: isDesktop ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) : 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        className="min-w-0"
      >
        <Header />
        <main id="contenido" className="mx-auto w-full max-w-[1480px] px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
      <MovementFormModal />
    </div>
  )
}
