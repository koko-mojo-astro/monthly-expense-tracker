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

/* ------------------------------------------------------------------ */
/* Pay-cycle helpers                                                   */
/* ------------------------------------------------------------------ */

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function isoAddDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

function daysInMonth(ymStr: string): number {
  const [y, m] = ymStr.split('-').map(Number)
  return new Date(y ?? 1970, m ?? 1, 0).getDate()
}

/** The payday date within `ymStr`, clamped to the month's length. */
export function paydayISOFor(ymStr: string, paydayDay: number): string {
  const day = Math.min(Math.max(1, Math.round(paydayDay)), daysInMonth(ymStr))
  return `${ymStr}-${String(day).padStart(2, '0')}`
}

/** The next payday on or after `today` for a given day-of-month. */
export function upcomingPaydayISO(paydayDay: number, today: string): string {
  const thisPayday = paydayISOFor(today.slice(0, 7), paydayDay)
  return today <= thisPayday ? thisPayday : paydayISOFor(addMonths(today.slice(0, 7), 1), paydayDay)
}

export interface Cycle {
  /** First day of the cycle (payday). */
  start: string
  /** Last day of the cycle (day before next payday). */
  end: string
  /** Next payday = first day of the following cycle. */
  nextPayday: string
  /** Calendar month this cycle funds (the month its `end` falls in). */
  fundedYm: string
}

/** The cycle containing `today`, given the payday day-of-month. */
export function currentCycleStart(paydayDay: number, today: string): string {
  const ymToday = today.slice(0, 7)
  const thisPayday = paydayISOFor(ymToday, paydayDay)
  const startYm = today >= thisPayday ? ymToday : addMonths(ymToday, -1)
  return paydayISOFor(startYm, paydayDay)
}

/** Cycle starting at `startISO` and ending the day before the next payday. */
export function buildCycle(startISO: string, paydayDay: number): Cycle {
  const nextPayday = paydayISOFor(addMonths(startISO.slice(0, 7), 1), paydayDay)
  const end = isoAddDays(nextPayday, -1)
  return { start: startISO, end, nextPayday, fundedYm: end.slice(0, 7) }
}

/**
 * All dates within [start, end] whose weekday matches `weekday`
 * (0 = Sunday … 6 = Saturday) — i.e. every rent due date in the cycle.
 */
export function rentDatesInCycle(start: string, end: string, weekday: number): string[] {
  const dates: string[] = []
  const cursor = parseISO(start)
  const last = parseISO(end)
  while (cursor <= last) {
    if (cursor.getDay() === weekday) dates.push(toISO(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function sumExpensesInRange(expenses: Expense[], start: string, end: string): number {
  let total = 0
  for (const e of expenses) {
    if (e.date >= start && e.date <= end) total += e.amount
  }
  return total
}
