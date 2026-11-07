import {
  BarChart3, Gauge, History, LayoutDashboard, Layers, Settings, TrendingDown, TrendingUp, type LucideIcon,
} from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon; description: string }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Panel',
    items: [{ to: '/dashboard', label: 'Resumen', icon: LayoutDashboard, description: 'Tu situación financiera de un vistazo' }],
  },
  {
    label: 'Movimientos',
    items: [
      { to: '/ingresos', label: 'Ingresos', icon: TrendingUp, description: 'De dónde viene tu dinero' },
      { to: '/egresos', label: 'Egresos', icon: TrendingDown, description: 'En qué se va tu dinero' },
      { to: '/movimientos', label: 'Historial', icon: History, description: 'Todas tus operaciones' },
    ],
  },
  {
    label: 'Organización',
    items: [
      { to: '/categorias', label: 'Categorías', icon: Layers, description: 'Categorías y conceptos' },
      { to: '/presupuestos', label: 'Presupuestos', icon: Gauge, description: 'Límites de gasto por categoría' },
    ],
  },
  { label: 'Análisis', items: [{ to: '/reportes', label: 'Reportes', icon: BarChart3, description: 'Informes mensuales y anuales' }] },
]

export const SETTINGS_ITEM: NavItem = { to: '/configuracion', label: 'Configuración', icon: Settings, description: 'Perfil, apariencia y datos' }

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM]

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
}
