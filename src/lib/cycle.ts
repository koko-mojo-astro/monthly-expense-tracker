import type { Expense, IncomesMap, LiabilitiesMap, Liability, Settings } from './types'
import {
  addMonths,
  buildCycle,
  currentCycleStart,
  paydayISOFor,
  rentDatesInCycle,
  sumExpensesInRange,
  type Cycle,
} from './stats'

/** If the next payday is this many days away, plan the upcoming cycle by default. */
export const PRE_PAYDAY_WINDOW_DAYS = 7

export function diffDays(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00`)
  const b = new Date(`${toISO}T00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * The cycle the user most likely wants to see: the one containing today,
 * unless the next payday is only a few days out — then the upcoming cycle
 * (the one the arriving salary will fund).
 */
export function defaultCycle(paydayDay: number, today: string): Cycle {
  const containingStart = currentCycleStart(paydayDay, today)
  const nextPayday = paydayISOFor(addMonths(containingStart.slice(0, 7), 1), paydayDay)
  if (today < nextPayday && diffDays(today, nextPayday) <= PRE_PAYDAY_WINDOW_DAYS) {
    return buildCycle(nextPayday, paydayDay)
  }
  return buildCycle(containingStart, paydayDay)
}

/** The pay cycle that funds calendar month `fundedYm` (starts the month before). */
export function cycleForMonth(fundedYm: string, paydayDay: number): Cycle {
  return buildCycle(paydayISOFor(addMonths(fundedYm, -1), paydayDay), paydayDay)
}

export interface CyclePlan {
  cycle: Cycle
  fundedYm: string
  isPast: boolean
  isCurrent: boolean
  isFuture: boolean
  weeklyRent: number
  rentDates: string[]
  rentTotal: number
  allBills: Liability[]
  unpaidBills: Liability[]
  paidBills: Liability[]
  /** All bills in the funded month — paid ones stay committed: the money is gone. */
  billsTotal: number
  /** Portion of bills not yet paid. */
  unpaidTotal: number
  paidTotal: number
  groceriesBudget: number
  /** Actual spend in the Groceries category within the cycle. */
  groceriesSpent: number
  income: number
  committed: number
  flexible: number
  weeks: number
  perWeek: number
  /** Expenses logged within the cycle up to today (full range for past cycles). */
  spent: number
  available: number
  daysToNextPayday: number
}

export function computeCyclePlan(
  cycle: Cycle,
  settings: Settings,
  incomes: IncomesMap,
  liabilities: LiabilitiesMap,
  expenses: Expense[],
  today: string,
): CyclePlan {
  const weeklyRent = settings.weeklyRent ?? 0
  const rentWeekday = settings.rentWeekday ?? 1
  const groceriesBudget = settings.groceriesBudget ?? 0

  const rentDates = rentDatesInCycle(cycle.start, cycle.end, rentWeekday)
  const rentTotal = weeklyRent * rentDates.length

  const allBills = Object.entries(liabilities[cycle.fundedYm] ?? {}).map(([id, l]) => ({
    ...l,
    id,
  }))
  const unpaidBills = allBills.filter((l) => !l.paid)
  const paidBills = allBills.filter((l) => l.paid)
  // Paid bills remain committed — marking them paid doesn't free up money.
  const billsTotal = allBills.reduce((acc, l) => acc + l.amount, 0)
  const unpaidTotal = unpaidBills.reduce((acc, l) => acc + l.amount, 0)
  const paidTotal = paidBills.reduce((acc, l) => acc + l.amount, 0)

  const income = incomes[cycle.fundedYm]?.amount ?? 0
  const committed = rentTotal + billsTotal + groceriesBudget
  const flexible = income - committed

  const isPast = cycle.end < today
  const isFuture = cycle.start > today
  const isCurrent = !isPast && !isFuture
  const until = isFuture ? cycle.start : isPast ? cycle.end : today
  const spent = isFuture ? 0 : sumExpensesInRange(expenses, cycle.start, until)
  const groceriesSpent = isFuture
    ? 0
    : sumExpensesInRange(
        expenses.filter((e) => e.category === 'Groceries'),
        cycle.start,
        until,
      )

  return {
    cycle,
    fundedYm: cycle.fundedYm,
    isPast,
    isCurrent,
    isFuture,
    weeklyRent,
    rentDates,
    rentTotal,
    allBills,
    unpaidBills,
    paidBills,
    billsTotal,
    unpaidTotal,
    paidTotal,
    groceriesBudget,
    groceriesSpent,
    income,
    committed,
    flexible,
    weeks: Math.max(rentDates.length, 1),
    perWeek: flexible / Math.max(rentDates.length, 1),
    spent,
    available: flexible - spent,
    daysToNextPayday: diffDays(today, cycle.nextPayday),
  }
}
