import { useMoney } from '@/hooks/useMoney'

interface Entry { name?: string | number; value?: number | string; color?: string; dataKey?: string | number }
interface ChartTooltipProps {
  active?: boolean
  payload?: Entry[]
  label?: string | number
  labels?: Record<string, string>
  title?: (label: string) => string
}

/** Tooltip unificado para todos los gráficos. */
export function ChartTooltip({ active, payload, label, labels, title }: ChartTooltipProps) {
  const money = useMoney()
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-surface/95 px-3.5 py-3 text-[12.5px] shadow-lift backdrop-blur">
      {label !== undefined && <p className="mb-2 font-display text-[12px] font-bold text-ink">{title ? title(String(label)) : label}</p>}
      <ul className="space-y-1.5">
        {payload.map((e) => (
          <li key={String(e.dataKey ?? e.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
              {labels?.[String(e.dataKey)] ?? e.name}
            </span>
            <span className="num font-semibold text-ink">{money(Number(e.value ?? 0), { compact: false })}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
