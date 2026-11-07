import { useMemo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import type { DateRange, PeriodKey } from '@/types/domain'
import { getPeriodRange, getPreviousRange, granularityFor } from '@/utils/dates'
import {
  balanceUntil, buildSeries, computeTotals, filterRange, groupByCategory, groupByConcept, resolveTransactions, variation,
} from '@/utils/finance'
import { todayISO } from '@/utils/dates'

/** Movimientos vigentes con relaciones resueltas. */
export function useTransactions() {
  const data = useDataStore((s) => s.data)
  const active = useMemo(() => resolveTransactions(data), [data])
  const withDeleted = useMemo(() => resolveTransactions(data, { includeDeleted: true }), [data])
  return { data, active, withDeleted }
}

export interface PeriodStats {
  period: PeriodKey
  range: DateRange
  previousRange: DateRange
  txs: ReturnType<typeof filterRange>
  totals: ReturnType<typeof computeTotals>
  previousTotals: ReturnType<typeof computeTotals>
  series: ReturnType<typeof buildSeries>
  expenseByCategory: ReturnType<typeof groupByCategory>
  incomeByCategory: ReturnType<typeof groupByCategory>
  topConcepts: ReturnType<typeof groupByConcept>
  availableBalance: number
  changes: { ingresos: number | null; egresos: number | null; neto: number | null }
}

/** Estadísticas del periodo global seleccionado en el encabezado. Se recalculan con cada cambio de datos. */
export function usePeriodStats(): PeriodStats {
  const { active } = useTransactions()
  const period = useUiStore((s) => s.period)
  return useMemo(() => {
    const range = getPeriodRange(period)
    const previousRange = getPreviousRange(period)
    const txs = filterRange(active, range)
    const prevTxs = filterRange(active, previousRange)
    const totals = computeTotals(txs)
    const previousTotals = computeTotals(prevTxs)
    return {
      period, range, previousRange, txs, totals, previousTotals,
      series: buildSeries(active, range, granularityFor(period)),
      expenseByCategory: groupByCategory(txs, 'EGRESO'),
      incomeByCategory: groupByCategory(txs, 'INGRESO'),
      topConcepts: groupByConcept(txs),
      availableBalance: balanceUntil(active, todayISO()),
      changes: {
        ingresos: variation(totals.ingresos, previousTotals.ingresos),
        egresos: variation(totals.egresos, previousTotals.egresos),
        neto: variation(totals.neto, previousTotals.neto),
      },
    }
  }, [active, period])
}
