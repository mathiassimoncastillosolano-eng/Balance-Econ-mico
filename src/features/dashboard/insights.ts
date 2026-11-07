import type { PeriodStats } from '@/hooks/useFinance'
import type { BudgetStatus, Insight } from '@/utils/finance'
import { formatPercent } from '@/utils/format'

/** Lecturas automáticas calculadas a partir de los datos reales del periodo. */
export function buildInsights(stats: PeriodStats, budgets: BudgetStatus[], money: (n: number) => string): Insight[] {
  const out: Insight[] = []
  const { totals, previousTotals, expenseByCategory, changes } = stats

  if (totals.count === 0) return out

  if (totals.ingresos > 0) {
    const rate = totals.ahorro
    if (totals.neto < 0) {
      out.push({ id: 'deficit', tone: 'negative', title: 'Gastaste más de lo que ingresó', body: `Tu balance del periodo es ${money(totals.neto)}. Revisa las categorías con mayor peso.` })
    } else if (rate >= 20) {
      out.push({ id: 'saving', tone: 'positive', title: `Ahorraste el ${formatPercent(rate)} de tus ingresos`, body: `Un excelente ritmo: te quedan ${money(totals.neto)} libres en este periodo.` })
    } else {
      out.push({ id: 'saving', tone: rate >= 10 ? 'neutral' : 'warning', title: `Tu tasa de ahorro es ${formatPercent(rate)}`, body: 'Una referencia habitual es apartar al menos un 20 % de tus ingresos.' })
    }
  }

  const top = expenseByCategory[0]
  if (changes.egresos !== null && previousTotals.egresos > 0 && Math.abs(changes.egresos) >= 3) {
    const up = changes.egresos > 0
    out.push({
      id: 'trend', tone: up ? 'warning' : 'positive',
      title: `Tus egresos ${up ? 'subieron' : 'bajaron'} ${formatPercent(Math.abs(changes.egresos))}`,
      body: `Frente al periodo anterior equivalente (${money(previousTotals.egresos)}).${top ? ` ${top.category.name} es tu mayor gasto.` : ''}`,
    })
  }

  if (top && top.share >= 25) {
    out.push({ id: 'concentration', tone: 'neutral', title: `${top.category.name} concentra el ${formatPercent(top.share)} de tus gastos`, body: `${money(top.total)} en ${top.count} movimiento${top.count === 1 ? '' : 's'}.` })
  }

  const risky = budgets.filter((b) => b.state !== 'ok')
  if (risky.length) {
    const over = risky.filter((b) => b.state === 'over').length
    out.push({
      id: 'budgets', tone: over ? 'negative' : 'warning',
      title: over ? `${over} presupuesto${over === 1 ? '' : 's'} superado${over === 1 ? '' : 's'}` : `${risky.length} presupuesto${risky.length === 1 ? '' : 's'} cerca del límite`,
      body: risky.slice(0, 2).map((b) => `${b.category.name} (${Math.round(b.percent)}%)`).join(' · '),
    })
  }
  return out.slice(0, 4)
}
