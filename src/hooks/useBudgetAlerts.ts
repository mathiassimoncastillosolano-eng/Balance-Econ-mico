import { useMemo } from 'react'
import { computeBudgetStatuses, type BudgetStatus } from '@/utils/finance'
import { useTransactions } from './useFinance'

/** Presupuestos del mes en curso que están por superarse o ya superados. */
export function useBudgetAlerts(): { alerts: BudgetStatus[]; all: BudgetStatus[] } {
  const { data, active } = useTransactions()
  return useMemo(() => {
    const now = new Date()
    const all = computeBudgetStatuses(data, active, now.getFullYear(), now.getMonth())
    return { all, alerts: all.filter((b) => b.state !== 'ok') }
  }, [data, active])
}
