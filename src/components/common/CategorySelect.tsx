import { Layers } from 'lucide-react'
import { useMemo } from 'react'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { SelectMenu, type SelectOption } from '@/components/ui/SelectMenu'
import type { Category } from '@/types/domain'

type CategoryLike = Pick<Category, 'id' | 'name' | 'color' | 'icon'> & Partial<Pick<Category, 'type'>>

interface CategorySelectProps {
  /** Siempre proviene de los datos del usuario; el componente no define categorías propias. */
  categories: CategoryLike[]
  value: string
  onChange: (categoryId: string) => void
  /** Si se indica, añade una primera opción (valor `''`) para «sin filtro», p. ej. «Todas». */
  allLabel?: string
  placeholder?: string
  /** Muestra «Ingreso/Egreso» junto a cada categoría (útil cuando la lista mezcla ambos tipos). */
  showType?: boolean
  id?: string
  'aria-label'?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
}

/** Selector de categorías con el mismo icono/color que se usa en los movimientos. */
export function CategorySelect({
  categories, value, onChange, allLabel, placeholder = 'Selecciona una categoría', showType, ...rest
}: CategorySelectProps) {
  const options = useMemo(() => {
    const items: SelectOption[] = categories.map((c) => ({
      value: c.id,
      label: c.name,
      icon: <CategoryIcon category={c} size="xs" />,
      meta: showType && c.type ? <span className="text-[11.5px] font-medium text-ink-3">{c.type === 'INGRESO' ? 'Ingreso' : 'Egreso'}</span> : undefined,
    }))
    if (!allLabel) return items
    return [
      {
        value: '', label: allLabel,
        icon: <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-ink-2"><Layers className="h-3.5 w-3.5" /></span>,
      },
      ...items,
    ]
  }, [categories, allLabel, showType])

  // El panel puede ser más ancho que el disparador para que los nombres largos no se trunquen.
  return <SelectMenu {...rest} value={value} onChange={onChange} options={options} placeholder={placeholder} emptyText="No hay categorías" panelMinWidth={showType ? 272 : 232} />
}
