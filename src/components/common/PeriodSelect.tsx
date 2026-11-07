import { CalendarRange } from 'lucide-react'
import { SelectMenu } from '@/components/ui/SelectMenu'
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
      <SelectMenu<PeriodKey>
        aria-label="Periodo" className="w-full" value={period} onChange={setPeriod}
        leading={<CalendarRange aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />}
        options={PERIODS.map((p) => ({ value: p.key, label: p.label }))}
      />
    )
  }
  return (
    <Segmented
      ariaLabel="Periodo" value={period} onChange={setPeriod} size="sm"
      options={PERIODS.map((p) => ({ value: p.key, label: p.short }))}
    />
  )
}
