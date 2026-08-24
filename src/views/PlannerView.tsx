import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarCheck2,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Home,
  PiggyBank,
  ShoppingCart,
  TriangleAlert,
} from 'lucide-react'
import { useAppData } from '../context/AppData'
import type { ViewId } from '../components/Nav'
import {
  Button,
  Card,
  Field,
  Input,
  ProgressBar,
  SectionTitle,
  Select,
  Skeleton,
} from '../components/ui'
import { cx, fmtDay, fmtMoney, fmtMonth } from '../lib/format'
import {
  buildCycle,
  currentCycleStart,
  paydayISOFor,
  rentDatesInCycle,
  sumExpensesInRange,
} from '../lib/stats'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function num(v: string): number {
  const n = Number.parseFloat(v)
  return isFinite(n) ? n : 0
}

export function PlannerView({
  today,
  onNavigate,
}: {
  today: string
  onNavigate: (v: ViewId) => void
}) {
  const { settings, incomes, liabilities, expenses, goal, currency, api, loading } = useAppData()

  // Assumptions (persisted to /settings once saved)
  const [paydayDay, setPaydayDay] = useState('24')
  const [weeklyRent, setWeeklyRent] = useState('')
  const [rentWeekday, setRentWeekday] = useState('1')
  const [groceries, setGroceries] = useState('')
  const [assumptionsDirty, setAssumptionsDirty] = useState(false)
  const assumptionsLoaded = useRef(false)

  useEffect(() => {
    if (assumptionsLoaded.current || loading) return
    setPaydayDay(String(settings.paydayDay ?? 24))
    setWeeklyRent(settings.weeklyRent != null ? String(settings.weeklyRent) : '')
    setRentWeekday(String(settings.rentWeekday ?? 1))
    setGroceries(settings.groceriesBudget != null ? String(settings.groceriesBudget) : '')
    assumptionsLoaded.current = true
  }, [settings, loading])

  // Expected income for the cycle — prefilled from the funded month if set
  const [incomeInput, setIncomeInput] = useState('')
  const incomeTouched = useRef(false)

  // Cycle navigation: 0 = current cycle, -1 previous, +1 next
  const [offset, setOffset] = useState(0)

  const pd = Math.min(Math.max(1, Math.round(num(paydayDay) || 24)), 28)

  const cycle = useMemo(() => {
    const baseStart = currentCycleStart(pd, today)
    const start = paydayISOFor(
      (function shift(ym: string, n: number): string {
        const [y, m] = ym.split('-').map(Number)
        const d = new Date(y ?? 1970, ((m ?? 1) - 1) + n, 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })(baseStart.slice(0, 7), offset),
      pd,
    )
    return buildCycle(start, pd)
  }, [pd, offset, today])

  const isPast = cycle.end < today
  const isFuture = cycle.start > today

  // Prefill income from the funded month until the user edits it manually
  useEffect(() => {
    if (incomeTouched.current) return
    const v = incomes[cycle.fundedYm]?.amount
    setIncomeInput(v != null ? String(v) : '')
  }, [incomes, cycle.fundedYm])

  const rentDates = useMemo(
    () => rentDatesInCycle(cycle.start, cycle.end, num(rentWeekday)),
    [cycle.start, cycle.end, rentWeekday],
  )

  const monthLiabilities = liabilities[cycle.fundedYm] ?? {}
  const billsList = Object.entries(monthLiabilities).map(([id, l]) => ({ ...l, id }))
  const unpaidBills = billsList.filter((l) => !l.paid)
  const paidBills = billsList.filter((l) => l.paid)

  const rentTotal = num(weeklyRent) * rentDates.length
  const billsTotal = unpaidBills.reduce((acc, l) => acc + l.amount, 0)
  const groceriesTotal = num(groceries)
  const incomeNum = num(incomeInput)

  const committed = rentTotal + billsTotal + groceriesTotal
  const flexible = incomeNum - committed
  const weeks = Math.max(rentDates.length, 1)
  const perWeek = flexible / weeks

  const spentInRange =
    isFuture ? 0 : sumExpensesInRange(expenses, cycle.start, isPast ? cycle.end : today)
  const stillAvailable = flexible - spentInRange

  const pctOfIncome = (v: number) => (incomeNum > 0 ? (v / incomeNum) * 100 : 0)

  const [savedFlash, setSavedFlash] = useState(false)
  const [incomeSavedFlash, setIncomeSavedFlash] = useState(false)

  async function saveAssumptions() {
    try {
      await api.saveSettings({
        paydayDay: pd,
        weeklyRent: num(weeklyRent),
        rentWeekday: num(rentWeekday),
        groceriesBudget: groceriesTotal,
      })
      setAssumptionsDirty(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch {
      window.alert('Could not save. Check your database rules and connection.')
    }
  }

  async function useIncomeForCycle() {
    if (incomeNum <= 0) return
    try {
      await api.setIncome(cycle.fundedYm, incomeNum)
      setIncomeSavedFlash(true)
      setTimeout(() => setIncomeSavedFlash(false), 2000)
    } catch {
      window.alert('Could not save income. Check your database rules and connection.')
    }
  }

  async function addToGoal() {
    if (!goal || flexible <= 0) return
    if (
      !window.confirm(
        `Add ${fmtMoney(flexible, currency)} to your savings goal?\nCurrent saved: ${fmtMoney(goal.savedAmount, currency)}`,
      )
    )
      return
    try {
      await api.saveGoal({ savedAmount: goal.savedAmount + flexible })
    } catch {
      window.alert('Could not update the goal. Check your database rules.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Cycle header */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" aria-hidden>
            <CalendarCheck2 size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Pay-cycle plan</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {fmtDay(cycle.start)} → {fmtDay(cycle.end)} · funds{' '}
              <b>{fmtMonth(cycle.fundedYm)}</b>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {!isPast && (
              <>
                <Button variant="ghost" onClick={() => setOffset((o) => o - 1)} aria-label="Previous cycle" className="px-2">
                  <ChevronLeft size={17} />
                </Button>
                <Button
                  variant="ghost"
                  disabled={isFuture}
                  onClick={() => setOffset((o) => o + 1)}
                  aria-label="Next cycle"
                  className="px-2"
                >
                  <ChevronRight size={17} />
                </Button>
              </>
            )}
            {(isPast || isFuture || offset !== 0) && (
              <Button variant="subtle" onClick={() => setOffset(0)}>
                Today's cycle
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Expected income */}
      <Card className="p-4 sm:p-5">
        <SectionTitle title={`Expected take-home · ${fmtMonth(cycle.fundedYm)}`} />
        <div className="flex items-end gap-2">
          <Field label={`Salary received ${fmtDay(cycle.start)}`}>
            <Input
              inputMode="decimal"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={incomeInput}
              onChange={(e) => {
                setIncomeInput(e.target.value)
                incomeTouched.current = true
              }}
            />
          </Field>
          <Button onClick={useIncomeForCycle} disabled={incomeNum <= 0} className="mb-px shrink-0">
            Set as {fmtMonth(cycle.fundedYm)} income
          </Button>
        </div>
        <p className="mt-2 h-4 text-xs text-emerald-600 dark:text-emerald-400">
          {incomeSavedFlash && '✓ Saved to your monthly income'}
        </p>
      </Card>

      {/* Assumptions */}
      <Card className="p-4 sm:p-5">
        <SectionTitle
          title="Assumptions"
          action={
            <span className="h-4 text-xs text-emerald-600 dark:text-emerald-400">
              {savedFlash && '✓ Saved'}
            </span>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Payday (day of month)" hint="Your salary lands around this day.">
            <Input
              inputMode="numeric"
              type="number"
              min="1"
              max="28"
              value={paydayDay}
              onChange={(e) => {
                setPaydayDay(e.target.value)
                setAssumptionsDirty(true)
              }}
            />
          </Field>
          <Field label="Weekly rent">
            <Input
              inputMode="decimal"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={weeklyRent}
              onChange={(e) => {
                setWeeklyRent(e.target.value)
                setAssumptionsDirty(true)
              }}
            />
          </Field>
          <Field label="Rent due day">
            <Select
              value={rentWeekday}
              onChange={(e) => {
                setRentWeekday(e.target.value)
                setAssumptionsDirty(true)
              }}
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  Every {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Groceries set-aside">
            <Input
              inputMode="decimal"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={groceries}
              onChange={(e) => {
                setGroceries(e.target.value)
                setAssumptionsDirty(true)
              }}
            />
          </Field>
        </div>
        <Button
          variant={assumptionsDirty ? 'primary' : 'subtle'}
          onClick={saveAssumptions}
          className="mt-3"
        >
          Save assumptions
        </Button>
      </Card>

      {/* Allocations */}
      <Card className="p-4 sm:p-5">
        <SectionTitle title="Where this paycheck goes" />

        <div className="space-y-3">
          {/* Rent */}
          <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400" aria-hidden>
                <Home size={15} />
              </span>
              <p className="text-sm font-medium flex-1 min-w-0 truncate">Rent</p>
              <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {fmtMoney(num(weeklyRent), currency)} × {rentDates.length}{' '}
                {rentDates.length === 1 ? 'week' : 'weeks'}
              </span>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmtMoney(rentTotal, currency)}
              </span>
            </div>
            {rentDates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[42px]">
                {rentDates.map((d) => (
                  <span
                    key={d}
                    className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {fmtDay(d)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bills */}
          <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400" aria-hidden>
                <CalendarX2 size={15} />
              </span>
              <p className="text-sm font-medium flex-1 min-w-0 truncate">
                Bills & liabilities · {fmtMonth(cycle.fundedYm)}
              </p>
              <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {unpaidBills.length} unpaid
              </span>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmtMoney(billsTotal, currency)}
              </span>
            </div>
            {billsList.length > 0 ? (
              <ul className="mt-2 space-y-1 pl-[42px]">
                {[...unpaidBills, ...paidBills].slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-xs">
                    <span
                      className={
                        l.paid
                          ? 'truncate text-zinc-400 line-through dark:text-zinc-500'
                          : 'truncate text-zinc-600 dark:text-zinc-300'
                      }
                    >
                      {l.name}
                    </span>
                    <span
                      className={cx(
                        'shrink-0 tabular-nums',
                        l.paid ? 'text-zinc-400 line-through dark:text-zinc-500' : 'font-medium',
                      )}
                    >
                      {fmtMoney(l.amount, currency)}
                    </span>
                  </li>
                ))}
                {billsList.length > 6 && (
                  <li>
                    <button
                      onClick={() => onNavigate('monthly')}
                      className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      +{billsList.length - 6} more — manage bills
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-2 pl-[42px] text-xs text-zinc-500 dark:text-zinc-400">
                No bills tracked for {fmtMonth(cycle.fundedYm)} yet.
              </p>
            )}
          </div>

          {/* Groceries */}
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400" aria-hidden>
              <ShoppingCart size={15} />
            </span>
            <p className="text-sm font-medium flex-1 min-w-0 truncate">
              Groceries set-aside
            </p>
            <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
              ≈ {fmtMoney(groceriesTotal / weeks, currency)}/wk
            </span>
            <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
              {fmtMoney(groceriesTotal, currency)}
            </span>
          </div>

          {/* Committed bar */}
          <div>
            <ProgressBar value={pctOfIncome(committed)} className="h-3" />
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                Committed {fmtMoney(committed, currency)}
                {incomeNum > 0 && ` (${Math.round(pctOfIncome(committed))}% of income)`}
              </span>
              <span>Income {fmtMoney(incomeNum, currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Result */}
      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Left to save · flexible for emergencies
            </p>
            <p
              className={cx(
                'mt-1 text-3xl font-bold tabular-nums',
                flexible < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {fmtMoney(flexible, currency)}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ≈ {fmtMoney(perWeek, currency)} per week unallocated
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {goal ? (
              <Button onClick={addToGoal} disabled={flexible <= 0}>
                <PiggyBank size={16} /> Add to savings goal
              </Button>
            ) : (
              <Button variant="subtle" onClick={() => onNavigate('goal')} disabled={flexible <= 0}>
                <PiggyBank size={16} /> Set a goal first
              </Button>
            )}
            {goal && flexible > 0 && (
              <p className="max-w-52 text-right text-[11px] text-zinc-400">
                Moves {fmtMoney(flexible, currency)} into “{goal.title?.trim() || 'Savings Goal'}”
              </p>
            )}
          </div>
        </div>

        {!isFuture && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPast ? 'Spent in cycle' : 'Spent so far'}
              </p>
              <p className="text-base font-semibold tabular-nums">
                {fmtMoney(spentInRange, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPast ? 'Ended with' : 'Still available'}
              </p>
              <p
                className={cx(
                  'text-base font-bold tabular-nums',
                  stillAvailable < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-teal-600 dark:text-teal-400',
                )}
              >
                {fmtMoney(stillAvailable, currency)}
              </p>
            </div>
          </div>
        )}

        {incomeNum > 0 && flexible < 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>
              This cycle is over-committed by {fmtMoney(-flexible, currency)}. Trim groceries or
              check for bills you can defer.
            </span>
          </div>
        )}

        {incomeNum === 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-zinc-100 p-3.5 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <Coins size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Enter your expected take-home above to see the full breakdown.</span>
          </div>
        )}
      </Card>
    </div>
  )
}
