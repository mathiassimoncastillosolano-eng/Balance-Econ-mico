import { CalendarRange } from 'lucide-react'
import { Select } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useUiStore } from '@/stores/uiStore'
import type { PeriodKey } from '@/types/domain'
import { PERIODS } from '@/utils/dates'

/** Selector del periodo global: gobierna dashboard, ingresos y egresos. */
export function PeriodSelect() {
  const period = useUiStore((s) => s.period)
  const setPeriod = useUiStore((s) => s.setPeriod)
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <div className="relative w-full">
        <CalendarRange aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <Select aria-label="Periodo" value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)} className="pl-10">
          {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </Select>
      </div>
    )
  }
  return (
    <Segmented
      ariaLabel="Periodo" value={period} onChange={setPeriod} size="sm"
      options={PERIODS.map((p) => ({ value: p.key, label: p.short }))}
    />
  )
}
