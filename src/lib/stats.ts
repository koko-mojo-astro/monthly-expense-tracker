import type { Expense, IncomesMap, LiabilitiesMap, MonthSummary } from './types'

export function currentYm(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date((y ?? 1970), ((m ?? 1) - 1) + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Ascending list of the last n months ending at `end` (inclusive). */
export function lastNMonths(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(end, -(n - 1 - i)))
}

export function summarizeMonth(
  expenses: Expense[],
  incomes: IncomesMap,
  liabilities: LiabilitiesMap,
  ym: string,
): MonthSummary {
  const income = incomes[ym]?.amount ?? 0
  let expensesTotal = 0
  for (const e of expenses) {
    if (e.date.startsWith(ym)) expensesTotal += e.amount
  }
  let liabilitiesTotal = 0
  const monthLiabilities = liabilities[ym]
  if (monthLiabilities) {
    for (const l of Object.values(monthLiabilities)) liabilitiesTotal += l.amount
  }
  return { income, expenses: expensesTotal, liabilities: liabilitiesTotal, net: income - expensesTotal - liabilitiesTotal }
}

export function categoryTotals(expenses: Expense[], ym: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of expenses) {
    if (!e.date.startsWith(ym)) continue
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  }
  return map
}

function hasActivity(s: MonthSummary): boolean {
  return s.income > 0 || s.expenses > 0 || s.liabilities > 0
}

/**
 * Average monthly surplus (net savings capacity).
 * Prefers up to 6 completed months with data; falls back to the current
 * month if no completed month has any activity yet.
 */
export function monthlyCapacity(
  expenses: Expense[],
  incomes: IncomesMap,
  liabilities: LiabilitiesMap,
  now: string,
): { capacity: number | null; monthsCounted: number } {
  const history = lastNMonths(now, 7)
    .slice(0, 6) // completed months only
    .map((ym) => summarizeMonth(expenses, incomes, liabilities, ym))
    .filter(hasActivity)

  if (history.length > 0) {
    const avg = history.reduce((acc, s) => acc + s.net, 0) / history.length
    return { capacity: avg, monthsCounted: history.length }
  }

  const cur = summarizeMonth(expenses, incomes, liabilities, now)
  return hasActivity(cur) ? { capacity: cur.net, monthsCounted: 1 } : { capacity: null, monthsCounted: 0 }
}

export type GoalProjection =
  | { kind: 'achieved'; remaining: number }
  | { kind: 'on-track'; monthsNeeded: number; projectedYm: string; requiredPerMonth?: number; onSchedule?: boolean }
  | { kind: 'stalled'; requiredPerMonth?: number }

/**
 * Projects when a goal will be reached given an average monthly surplus.
 */
export function projectGoal(
  targetAmount: number,
  savedAmount: number,
  capacity: number | null,
  now: string,
  targetDate?: string | null,
): GoalProjection | null {
  const remaining = Math.max(0, targetAmount - savedAmount)
  if (targetAmount <= 0 || remaining === 0) return { kind: 'achieved', remaining: 0 }

  let requiredPerMonth: number | undefined
  let onSchedule: boolean | undefined
  if (targetDate) {
    const monthsLeft = monthsUntil(now, targetDate.slice(0, 7))
    if (monthsLeft > 0) {
      requiredPerMonth = Math.ceil(remaining / monthsLeft)
      onSchedule = capacity != null && capacity >= requiredPerMonth
    }
  }

  if (capacity == null || capacity <= 0) return { kind: 'stalled', requiredPerMonth }
  const monthsNeeded = Math.ceil(remaining / capacity)
  return {
    kind: 'on-track',
    monthsNeeded,
    projectedYm: addMonths(now, monthsNeeded),
    requiredPerMonth,
    onSchedule,
  }
}

/** Whole months from `fromYm` until the month of `toYm`. */
export function monthsUntil(fromYm: string, toYm: string): number {
  const [fy, fm] = fromYm.split('-').map(Number)
  const [ty, tm] = toYm.split('-').map(Number)
  return (ty ?? fy ?? 1970) * 12 + (tm ?? 1) - ((fy ?? 1970) * 12 + (fm ?? 1))
}
