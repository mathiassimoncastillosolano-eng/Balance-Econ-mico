import { CalendarRange } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SelectMenu, type SelectOption } from '@/components/ui/SelectMenu'
import { todayISO } from '@/utils/dates'
import { DATE_PRESETS, detectPreset, formatRangeShort, presetRange, type DatePresetKey, type OpenRange } from '@/utils/datePresets'

interface DateShortcutSelectProps {
  /** Rango actual (los extremos pueden estar vacíos). */
  range: OpenRange
  /** Se llama con el rango del atajo elegido. */
  onApply: (range: OpenRange) => void
  /** «Personalizado»: el llamador suele abrir el campo «Desde». */
  onCustom?: () => void
  id?: string
  className?: string
}

/** Atajos de fechas. Siempre muestra cuál está activo, deducido del rango actual. */
export function DateShortcutSelect({ range, onApply, onCustom, id, className }: DateShortcutSelectProps) {
  const today = todayISO()
  const [chosen, setChosen] = useState<DatePresetKey>()
  const empty = !range.from && !range.to
  const active: DatePresetKey = empty ? 'all' : chosen === 'custom' ? 'custom' : detectPreset(range, today, chosen)

  const options = useMemo<SelectOption<DatePresetKey>[]>(() => DATE_PRESETS.map((p) => {
    const r = presetRange(p.key, today)
    let description: string | undefined
    if (p.key === 'custom') description = active === 'custom' && !empty ? formatRangeShort(range) || 'Elige tus fechas' : 'Elige tus fechas'
    else if (r && p.key !== 'all') description = formatRangeShort(r)
    return { value: p.key, label: p.label, description }
  }), [today, active, empty, range])

  function change(key: DatePresetKey): void {
    setChosen(key)
    if (key === 'custom') { onCustom?.(); return }
    const r = presetRange(key, today)
    if (r) onApply(r)
  }

  return <SelectMenu id={id} className={className} value={active} onChange={change} options={options} leading={<CalendarRange aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />} panelMinWidth={232} />
}
