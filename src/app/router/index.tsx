import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { GuestOnly, RequireAuth } from './guards'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const FlowPage = lazy(() => import('@/features/flows/FlowPage'))
const HistoryPage = lazy(() => import('@/features/movimientos/HistoryPage'))
const CategoriesPage = lazy(() => import('@/features/categorias/CategoriesPage'))
const BudgetsPage = lazy(() => import('@/features/presupuestos/BudgetsPage'))
const ReportsPage = lazy(() => import('@/features/reportes/ReportsPage'))
const SettingsPage = lazy(() => import('@/features/configuracion/SettingsPage'))
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ingresos" element={<FlowPage type="INGRESO" />} />
            <Route path="/egresos" element={<FlowPage type="EGRESO" />} />
            <Route path="/movimientos" element={<HistoryPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/presupuestos" element={<BudgetsPage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
