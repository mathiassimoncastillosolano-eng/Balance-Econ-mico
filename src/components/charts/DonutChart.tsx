import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useMoney } from '@/hooks/useMoney'
import { ChartTooltip } from './ChartTooltip'
import { useChartTheme } from './useChartTheme'

export interface DonutDatum { name: string; value: number; color: string }

interface DonutChartProps {
  data: DonutDatum[]
  size?: number
  centerLabel?: string
  centerValue?: number
}

/** Dona con total al centro. Segmentos separados por el color de superficie para un acabado limpio. */
export function DonutChart({ data, size = 220, centerLabel, centerValue }: DonutChartProps) {
  const t = useChartTheme()
  const money = useMoney()
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="96%" paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={6} stroke={t.surface} strokeWidth={2} startAngle={90} endAngle={-270}
          >
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="eyebrow">{centerLabel}</span>
          <span className="num mt-1 font-display text-xl font-extrabold text-ink">{money(centerValue, { compact: true })}</span>
        </div>
      )}
    </div>
  )
}
