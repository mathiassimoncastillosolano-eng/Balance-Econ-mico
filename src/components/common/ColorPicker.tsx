import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CATEGORY_COLORS } from '@/utils/icons'

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const custom = !CATEGORY_COLORS.some((c) => c.toLowerCase() === value.toLowerCase())
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap items-center gap-2">
      {CATEGORY_COLORS.map((color) => {
        const active = color.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={color} type="button" role="radio" aria-checked={active} aria-label={`Color ${color}`} onClick={() => onChange(color)}
            className={cn('grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110', active && 'ring-2 ring-ink')}
            style={{ backgroundColor: color }}
          >
            {active && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        )
      })}
      <label
        className={cn('relative grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-[10px] font-bold text-ink-3 hover:scale-110', custom && 'ring-2 ring-ink ring-offset-2 ring-offset-surface')}
        style={custom ? { backgroundColor: value, color: '#fff' } : undefined}
        title="Color personalizado"
      >
        {custom ? <Check className="h-4 w-4" strokeWidth={3} /> : '+'}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Color personalizado" />
      </label>
    </div>
  )
}
