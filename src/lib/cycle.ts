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
  /** Daily-spending set-aside for the cycle (covers ALL logged expenses). */
  envelopeBudget: number
  /** All expenses logged within the cycle so far — they draw the set-aside down. */
  envelopeSpent: number
  /** envelopeBudget − envelopeSpent; null when no set-aside is configured. Negative = overspent. */
  envelopeRemaining: number | null
  income: number
  committed: number
  flexible: number
  weeks: number
  perWeek: number
  /**
   * Spending that draws from flexible money: only the part of logged
   * expenses that exceeds the daily set-aside envelope.
   */
  flexibleSpent: number
  available: number
  daysToNextPayday: number
  /** Days remaining in the cycle including today (0 for past cycles). */
  daysLeftInCycle: number
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
  // The daily-spending set-aside (stored as `groceriesBudget`).
  const envelopeBudget = settings.groceriesBudget ?? 0

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
  const committed = rentTotal + billsTotal + envelopeBudget
  const flexible = income - committed

  const isPast = cycle.end < today
  const isFuture = cycle.start > today
  const isCurrent = !isPast && !isFuture
  const until = isFuture ? cycle.start : isPast ? cycle.end : today
  // EVERY logged expense draws from the daily set-aside first — cafe,
  // transport, groceries, everything. Only the overflow hits flexible money.
  const envelopeSpent = isFuture ? 0 : sumExpensesInRange(expenses, cycle.start, until)
  const hasEnvelope = envelopeBudget > 0
  const fromEnvelope = hasEnvelope ? Math.min(envelopeSpent, envelopeBudget) : 0
  const flexibleSpent = envelopeSpent - fromEnvelope
  const envelopeRemaining = hasEnvelope ? envelopeBudget - envelopeSpent : null
  const daysLeftInCycle = isPast ? 0 : diffDays(today, cycle.end) + 1

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
    envelopeBudget,
    envelopeSpent,
    envelopeRemaining,
    income,
    committed,
    flexible,
    weeks: Math.max(rentDates.length, 1),
    perWeek: flexible / Math.max(rentDates.length, 1),
    flexibleSpent,
    available: flexible - flexibleSpent,
    daysToNextPayday: diffDays(today, cycle.nextPayday),
    daysLeftInCycle,
  }
}
