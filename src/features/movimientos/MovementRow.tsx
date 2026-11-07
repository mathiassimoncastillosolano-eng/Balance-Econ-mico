import { Amount } from '@/components/common/Amount'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import type { ResolvedTransaction } from '@/types/domain'
import { formatShortDate } from '@/utils/format'

/** Fila compacta de movimiento para listas (dashboard, ingresos, egresos). */
export function MovementRow({ tx, onClick }: { tx: ResolvedTransaction; onClick: (tx: ResolvedTransaction) => void }) {
  return (
    <li>
      <button
        type="button" onClick={() => onClick(tx)}
        className="group flex w-full items-center gap-3.5 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2 sm:px-3"
      >
        <CategoryIcon category={tx.category} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{tx.concept.name}</p>
          <p className="truncate text-[12.5px] text-ink-2">{tx.category.name} · {formatShortDate(tx.date)}</p>
        </div>
        <Amount value={tx.amount} type={tx.type} className="shrink-0 text-[14px]" />
      </button>
    </li>
  )
}
