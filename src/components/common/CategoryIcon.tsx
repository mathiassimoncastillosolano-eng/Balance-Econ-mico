import type { Category } from '@/types/domain'
import { cn } from '@/utils/cn'
import { ICON_REGISTRY } from '@/utils/icons'
import { Wallet } from 'lucide-react'

interface CategoryIconProps {
  category: Pick<Category, 'color' | 'icon'>
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const BOX = { xs: 'h-7 w-7 rounded-lg', sm: 'h-9 w-9 rounded-[10px]', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' } as const
const GLYPH = { xs: 'h-3.5 w-3.5', sm: 'h-[18px] w-[18px]', md: 'h-5 w-5', lg: 'h-7 w-7' } as const

/** Tile de color + icono. Identifica visualmente una categoría en toda la aplicación. */
export function CategoryIcon({ category, size = 'md', className }: CategoryIconProps) {
  const Icon = ICON_REGISTRY[category.icon] ?? Wallet
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center', BOX[size], className)}
      style={{ backgroundColor: `${category.color}22`, color: category.color }}
    >
      <Icon className={GLYPH[size]} strokeWidth={2.1} />
    </span>
  )
}
