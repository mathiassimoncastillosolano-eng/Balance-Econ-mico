import { cn } from '@/utils/cn'
import { ICON_KEYS, ICON_REGISTRY } from '@/utils/icons'

export function IconPicker({ value, onChange, color }: { value: string; onChange: (key: string) => void; color: string }) {
  return (
    <div role="radiogroup" aria-label="Icono" className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
      {ICON_KEYS.map((key) => {
        const Icon = ICON_REGISTRY[key]
        if (!Icon) return null
        const active = key === value
        return (
          <button
            key={key} type="button" role="radio" aria-checked={active} aria-label={key} onClick={() => onChange(key)}
            className={cn('grid h-10 place-items-center rounded-xl border transition-all', active ? 'border-transparent' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink')}
            style={active ? { backgroundColor: `${color}26`, color } : undefined}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        )
      })}
    </div>
  )
}
