import { AnimatePresence, motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Tooltip } from '@/components/ui/Tooltip'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import { NAV_GROUPS, type NavItem } from './navConfig'

export const SIDEBAR_EXPANDED = 272
export const SIDEBAR_COLLAPSED = 84

function NavRow({ item, collapsed, badge, onNavigate }: { item: NavItem; collapsed: boolean; badge?: number; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <Tooltip content={item.label} side="right" disabled={!collapsed}>
      <NavLink
        to={item.to} onClick={onNavigate} aria-label={item.label}
        className={({ isActive }) =>
          cn(
            'group relative flex h-11 items-center rounded-xl text-[14px] font-semibold transition-colors',
            collapsed ? 'justify-center' : 'gap-3 px-3.5',
            isActive ? 'text-white' : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId="nav-active" className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand/90 to-brand/60 shadow-[0_8px_24px_-8px_rgb(47_107_255/.8)]"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative z-10 grid place-items-center">
              <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.3 : 2} />
              {collapsed && !!badge && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#FFB84D] ring-2 ring-[#071331]" />}
            </span>
            {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
            {!collapsed && !!badge && (
              <span className="relative z-10 grid h-5 min-w-5 place-items-center rounded-full bg-[#FFB84D] px-1.5 text-[11px] font-bold text-[#3A2400]">{badge}</span>
            )}
          </>
        )}
      </NavLink>
    </Tooltip>
  )
}

function SidebarBody({ collapsed, onNavigate, showCollapse }: { collapsed: boolean; onNavigate: () => void; showCollapse: boolean }) {
  const update = useSettingsStore((s) => s.update)
  const { alerts } = useBudgetAlerts()

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-[72px] shrink-0 items-center', collapsed ? 'justify-center' : 'px-5')}>
        {collapsed ? <Logo variant="mark" size={38} tone="onDark" /> : <Logo size={38} tone="onDark" />}
      </div>

      <nav aria-label="Navegación principal" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed ? (
              <p className="mb-1.5 px-3.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/35">{group.label}</p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden />
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} badge={item.to === '/presupuestos' ? alerts.length : undefined} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* El perfil, Configuración y Cerrar sesión viven en el menú de usuario del encabezado. */}
      {showCollapse && (
        <div className="shrink-0 border-t border-white/10 p-3">
          <Tooltip content={collapsed ? 'Expandir menú' : 'Contraer menú'} side="right" disabled={!collapsed}>
            <button
              onClick={() => update({ sidebarCollapsed: !collapsed })}
              className={cn('flex h-10 w-full items-center rounded-xl text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white', collapsed ? 'justify-center' : 'gap-3 px-3.5')}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            >
              {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
              {!collapsed && 'Contraer menú'}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

const SURFACE = 'bg-[linear-gradient(180deg,#0A1B3D_0%,#071331_100%)] text-white'

/** Sidebar contraíble en escritorio; drawer en tablet y móvil. */
export function Sidebar() {
  const isDesktop = useIsDesktop()
  const collapsed = useSettingsStore((s) => s.settings.sidebarCollapsed)
  const mobileOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobileNav = useUiStore((s) => s.setMobileNav)

  if (isDesktop) {
    return (
      <motion.aside
        aria-label="Barra lateral"
        initial={false} animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        className={cn('fixed inset-y-0 left-0 z-40 overflow-hidden border-r border-white/5 dark:border-line', SURFACE)}
      >
        <SidebarBody collapsed={collapsed} onNavigate={() => undefined} showCollapse />
      </motion.aside>
    )
  }

  return (
    <AnimatePresence>
      {mobileOpen && (
        <>
          <motion.div
            key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm" onClick={() => setMobileNav(false)} aria-hidden
          />
          <motion.aside
            key="drawer" role="dialog" aria-modal="true" aria-label="Menú de navegación"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className={cn('fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] pt-[env(safe-area-inset-top)] shadow-lift', SURFACE)}
          >
            <button
              onClick={() => setMobileNav(false)} aria-label="Cerrar menú"
              className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody collapsed={false} onNavigate={() => setMobileNav(false)} showCollapse={false} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
