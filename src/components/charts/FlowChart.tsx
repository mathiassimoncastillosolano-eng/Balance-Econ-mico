import { useId } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useMoney } from '@/hooks/useMoney'
import type { SeriesPoint } from '@/types/domain'
import { ChartTooltip } from './ChartTooltip'
import { useChartTheme } from './useChartTheme'

const LABELS = { ingresos: 'Ingresos', egresos: 'Egresos', neto: 'Neto', acumulado: 'Saldo acumulado' }

interface Common { data: SeriesPoint[]; height?: number }

/** Ingresos vs egresos en el tiempo (áreas suaves con degradado). */
export function IncomeExpenseArea({ data, height = 300 }: Common) {
  const t = useChartTheme()
  const money = useMoney()
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`in-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.income} stopOpacity={0.32} /><stop offset="100%" stopColor={t.income} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`ex-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.expense} stopOpacity={0.28} /><stop offset="100%" stopColor={t.expense} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} dy={8} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: number) => money(v, { compact: true, decimals: false }).replace(/^(\S+)\s/, '')} />
        <Tooltip cursor={{ stroke: t.axis, strokeDasharray: '3 3', strokeOpacity: 0.5 }} content={<ChartTooltip labels={LABELS} />} />
        <Area type="monotone" dataKey="ingresos" stroke={t.income} strokeWidth={2.4} fill={`url(#in-${id})`} activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} />
        <Area type="monotone" dataKey="egresos" stroke={t.expense} strokeWidth={2.4} fill={`url(#ex-${id})`} activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Serie única (ingresos o egresos) en barras redondeadas. */
export function SingleFlowBars({ data, kind, height = 280 }: Common & { kind: 'ingresos' | 'egresos' }) {
  const t = useChartTheme()
  const money = useMoney()
  const color = kind === 'ingresos' ? t.income : t.expense
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 11 }} interval="preserveStartEnd" minTickGap={20} dy={8} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: number) => money(v, { compact: true, decimals: false }).replace(/^(\S+)\s/, '')} />
        <Tooltip cursor={{ fill: t.grid, fillOpacity: 0.5 }} content={<ChartTooltip labels={LABELS} />} />
        <Bar dataKey={kind} fill={color} radius={[6, 6, 2, 2]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Barras agrupadas ingresos/egresos + línea de saldo acumulado (reportes). */
export function GroupedBars({ data, height = 300, showBalance = true }: Common & { showBalance?: boolean }) {
  const t = useChartTheme()
  const money = useMoney()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} dy={8} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: number) => money(v, { compact: true, decimals: false }).replace(/^(\S+)\s/, '')} />
        <Tooltip cursor={{ fill: t.grid, fillOpacity: 0.45 }} content={<ChartTooltip labels={LABELS} />} />
        <Bar dataKey="ingresos" fill={t.income} radius={[5, 5, 2, 2]} maxBarSize={22} />
        <Bar dataKey="egresos" fill={t.expense} radius={[5, 5, 2, 2]} maxBarSize={22} />
        {showBalance && <Line type="monotone" dataKey="acumulado" stroke={t.brand} strokeWidth={2.4} dot={false} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Saldo acumulado: área azul con línea marcada. */
export function BalanceArea({ data, height = 260 }: Common) {
  const t = useChartTheme()
  const money = useMoney()
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`bal-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.brand} stopOpacity={0.35} /><stop offset="100%" stopColor={t.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} dy={8} />
        <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: number) => money(v, { compact: true, decimals: false }).replace(/^(\S+)\s/, '')} domain={['auto', 'auto']} />
        <Tooltip cursor={{ stroke: t.axis, strokeDasharray: '3 3', strokeOpacity: 0.5 }} content={<ChartTooltip labels={LABELS} />} />
        <Area type="monotone" dataKey="acumulado" stroke={t.brand} strokeWidth={2.6} fill={`url(#bal-${id})`} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Sparkline sin ejes para el hero del dashboard. */
export function Sparkline({ data, color = '#7DB4FF', height = 64 }: { data: { v: number }[]; color?: string; height?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} /><stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#sp-${id})`} isAnimationActive />
      </AreaChart>
    </ResponsiveContainer>
  )
}
