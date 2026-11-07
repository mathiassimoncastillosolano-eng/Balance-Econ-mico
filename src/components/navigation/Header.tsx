import { Bell, ChevronRight, LogOut, Menu, Moon, Plus, Settings as SettingsIcon, Sun, TriangleAlert, CircleCheck } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { Tooltip } from '@/components/ui/Tooltip'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { useMoney } from '@/hooks/useMoney'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { useChartTheme } from '@/components/charts/useChartTheme'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'
import { notify } from '@/utils/notify'
import { findNavItem } from './navConfig'

function NotificationsMenu() {
  const { alerts } = useBudgetAlerts()
  const money = useMoney()
  return (
    <Popover
      trigger={({ toggle, open }) => (
        <Tooltip content="Alertas">
          <button
            onClick={toggle} aria-label={`Alertas${alerts.length ? ` (${alerts.length})` : ''}`} aria-expanded={open}
            className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <Bell className="h-[19px] w-[19px]" />
            {alerts.length > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-expense ring-2 ring-canvas" />}
          </button>
        </Tooltip>
      )}
      className="w-[340px]"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
            <p className="font-display text-sm font-bold text-ink">Alertas de presupuesto</p>
            <span className="text-[11.5px] font-medium text-ink-3">Mes actual</span>
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl bg-income-soft/60 p-3">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-income" />
              <p className="text-[13px] leading-snug text-ink-2">Todos tus presupuestos están dentro del límite. ¡Buen ritmo!</p>
            </div>
          ) : (
            <ul className="max-h-[320px] space-y-1 overflow-y-auto">
              {alerts.map((a) => (
                <li key={a.budget.id}>
                  <Link to="/presupuestos" onClick={close} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2">
                    <CategoryIcon category={a.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{a.category.name}</p>
                      <p className="num text-[12px] text-ink-2">{money(a.spent, { compact: false })} de {money(a.budget.limit, { compact: false })}</p>
                    </div>
                    <span className={cn('num inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-bold', a.state === 'over' ? 'bg-expense-soft text-expense' : 'bg-warn-soft text-warn')}>
                      <TriangleAlert className="h-3 w-3" />{Math.round(a.percent)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  )
}

function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return (
    <Popover
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle} aria-label="Menú de usuario" aria-expanded={open}
          className="flex h-10 items-center gap-2.5 rounded-xl pl-1 pr-1 transition-colors hover:bg-surface-3 sm:pr-3"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-[#7DB4FF] text-[12px] font-bold text-white">{initials(user?.name ?? '?')}</span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[130px] truncate text-[13px] font-semibold text-ink">{user?.name}</span>
          </span>
        </button>
      )}
      className="w-[250px]"
    >
      {(close) => (
        <div>
          <div className="border-b border-line px-3 pb-3 pt-2.5">
            <p className="truncate text-sm font-bold text-ink">{user?.name}</p>
            <p className="truncate text-[12px] text-ink-2">{user?.email}</p>
          </div>
          <div className="pt-1.5">
            <button onClick={() => { close(); navigate('/configuracion') }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-ink hover:bg-surface-2">
              <SettingsIcon className="h-4 w-4 text-ink-3" /> Configuración
            </button>
            <button
              onClick={() => { close(); void logout().then(() => { notify.info('Sesión cerrada'); navigate('/login', { replace: true }) }) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-expense hover:bg-expense-soft"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </Popover>
  )
}

export function Header() {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const setMobileNav = useUiStore((s) => s.setMobileNav)
  const openCreate = useUiStore((s) => s.openCreateMovement)
  const update = useSettingsStore((s) => s.update)
  const { dark: isDark } = useChartTheme()
  const nextTheme = isDark ? 'light' : 'dark'

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setMobileNav(true)} aria-label="Abrir menú"
          className="-ml-1 grid h-10 w-10 place-items-center rounded-xl text-ink-2 hover:bg-surface-3 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Ruta de navegación" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
          <Link to="/dashboard" className="hidden font-display font-bold tracking-[0.12em] text-ink-3 hover:text-ink sm:inline">MONIQ</Link>
          <ChevronRight className="hidden h-3.5 w-3.5 text-ink-3 sm:block" aria-hidden />
          <span className="truncate font-semibold text-ink" aria-current="page">{current?.label ?? 'Página'}</span>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="primary" size="md" onClick={() => openCreate()} className="mr-1 hidden sm:inline-flex" aria-label="Nuevo movimiento">
            <Plus className="h-4 w-4" strokeWidth={2.6} /> Nuevo movimiento
          </Button>
          <Button variant="primary" size="icon" onClick={() => openCreate()} className="mr-1 sm:hidden" aria-label="Nuevo movimiento">
            <Plus className="h-5 w-5" strokeWidth={2.6} />
          </Button>
          <NotificationsMenu />
          <Tooltip content={isDark ? 'Modo claro' : 'Modo oscuro'}>
            <button
              onClick={() => update({ theme: nextTheme })} aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              className="grid h-10 w-10 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              {isDark ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
            </button>
          </Tooltip>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
