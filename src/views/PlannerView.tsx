import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Coins,
  CopyPlus,
  Home,
  PiggyBank,
  Plus,
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
import { cx, fmtDay, fmtMoney, fmtMonth, todayISO } from '../lib/format'
import { buildCycle, currentCycleStart, paydayISOFor } from '../lib/stats'
import { computeCyclePlan, defaultCycle } from '../lib/cycle'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function num(v: string): number {
  const n = Number.parseFloat(v)
  return isFinite(n) ? n : 0
}

function clampOffset(n: number): number {
  return Math.max(-12, Math.min(3, n))
}

function shiftYm(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y ?? 1970, ((m ?? 1) - 1) + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function PlannerView({
  today = todayISO(),
  onNavigate,
}: {
  today?: string
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

  const pd = Math.min(Math.max(1, Math.round(num(paydayDay) || 24)), 28)

  // Smart default: near payday, plan the upcoming cycle (the one the arriving
  // salary funds) instead of the one that is about to end.
  const defaultOffset = useMemo(() => {
    return defaultCycle(pd, today).start === currentCycleStart(pd, today) ? 0 : 1
  }, [pd, today])
  const [offsetDelta, setOffsetDelta] = useState(0)
  const [navigated, setNavigated] = useState(false)
  const offset = navigated ? offsetDelta : defaultOffset

  const cycle = useMemo(() => {
    const baseYm = currentCycleStart(pd, today).slice(0, 7)
    const start = paydayISOFor(shiftYm(baseYm, offset), pd)
    return buildCycle(start, pd)
  }, [pd, offset, today])

  const effSettings = useMemo(
    () => ({
      ...settings,
      paydayDay: pd,
      weeklyRent: num(weeklyRent),
      rentWeekday: num(rentWeekday),
      groceriesBudget: num(groceries),
    }),
    [settings, pd, weeklyRent, rentWeekday, groceries],
  )

  const plan = useMemo(
    () => computeCyclePlan(cycle, effSettings, incomes, liabilities, expenses, today),
    [cycle, effSettings, incomes, liabilities, expenses, today],
  )

  // Expected income — prefilled from the funded month until edited; resets
  // when switching cycles so each cycle reflects its own stored income.
  const [incomeInput, setIncomeInput] = useState('')
  const incomeTouched = useRef(false)
  const lastFundedYm = useRef('')

  useEffect(() => {
    if (lastFundedYm.current !== cycle.fundedYm) {
      lastFundedYm.current = cycle.fundedYm
      incomeTouched.current = false
    }
    if (incomeTouched.current) return
    const v = incomes[cycle.fundedYm]?.amount
    setIncomeInput(v != null ? String(v) : '')
  }, [incomes, cycle.fundedYm])

  const [savedFlash, setSavedFlash] = useState(false)
  const [incomeSavedFlash, setIncomeSavedFlash] = useState(false)

  async function saveAssumptions() {
    try {
      await api.saveSettings({
        paydayDay: pd,
        weeklyRent: num(weeklyRent),
        rentWeekday: num(rentWeekday),
        groceriesBudget: num(groceries),
      })
      setAssumptionsDirty(false)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch {
      window.alert('Could not save. Check your database rules and connection.')
    }
  }

  async function useIncomeForCycle() {
    const amount = num(incomeInput)
    if (amount <= 0) return
    try {
      await api.setIncome(cycle.fundedYm, amount)
      setIncomeSavedFlash(true)
      setTimeout(() => setIncomeSavedFlash(false), 2000)
    } catch {
      window.alert('Could not save income. Check your database rules and connection.')
    }
  }

  async function addToGoal() {
    if (!goal || plan.flexible <= 0) return
    if (
      !window.confirm(
        `Add ${fmtMoney(plan.flexible, currency)} to your savings goal?\nCurrent saved: ${fmtMoney(goal.savedAmount, currency)}`,
      )
    )
      return
    try {
      await api.saveGoal({ savedAmount: goal.savedAmount + plan.flexible })
    } catch {
      window.alert('Could not update the goal. Check your database rules.')
    }
  }

  // Inline bill quick-add (writes straight into the funded month)
  const [billFormOpen, setBillFormOpen] = useState(false)
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')

  async function quickAddBill(e: React.FormEvent) {
    e.preventDefault()
    const amount = num(billAmount)
    if (!billName.trim() || amount <= 0) return
    try {
      await api.addLiability(cycle.fundedYm, billName.trim(), amount)
      setBillName('')
      setBillAmount('')
      setBillFormOpen(false)
    } catch {
      window.alert('Could not add bill. Check your database rules and connection.')
    }
  }

  async function copyBillsFromPrevMonth() {
    const prevYm = shiftYm(cycle.fundedYm, -1)
    const prev = liabilities[prevYm]
    const items = prev ? Object.values(prev) : []
    if (
      items.length === 0 ||
      !window.confirm(
        `Copy ${items.length} bill${items.length === 1 ? '' : 's'} from ${fmtMonth(prevYm)} to ${fmtMonth(cycle.fundedYm)}?`,
      )
    )
      return
    try {
      await Promise.all(items.map((l) => api.addLiability(cycle.fundedYm, l.name, l.amount)))
    } catch {
      window.alert('Could not copy bills. Check your database rules and connection.')
    }
  }

  const prevYm = shiftYm(cycle.fundedYm, -1)
  const prevHasBills = Object.keys(liabilities[prevYm] ?? {}).length > 0
  const badge = plan.isFuture
    ? { label: 'Upcoming cycle', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' }
    : plan.isPast
      ? { label: 'Past cycle', cls: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300' }
      : { label: 'Current cycle', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-400' }

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
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Pay-cycle plan</p>
              <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', badge.cls)}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {fmtDay(cycle.start)} → {fmtDay(cycle.end)} · <b>{fmtMonth(cycle.fundedYm)}</b>'s
              money
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => {
                setOffsetDelta((o) => clampOffset((navigated ? o : defaultOffset) - 1))
                setNavigated(true)
              }}
              aria-label="Previous cycle"
              className="px-2"
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setOffsetDelta((o) => clampOffset((navigated ? o : defaultOffset) + 1))
                setNavigated(true)
              }}
              aria-label="Next cycle"
              className="px-2"
            >
              <ChevronRight size={17} />
            </Button>
            {navigated && offset !== defaultOffset && (
              <Button variant="subtle" onClick={() => setNavigated(false)}>
                Latest
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Expected income */}
      <Card className="p-4 sm:p-5">
        <SectionTitle title={`Expected take-home · ${fmtMonth(cycle.fundedYm)}`} />
        <div className="flex flex-wrap items-end gap-2">
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
          <Button onClick={useIncomeForCycle} disabled={num(incomeInput) <= 0} className="mb-px shrink-0">
            Set as {fmtMonth(cycle.fundedYm)} income
          </Button>
        </div>
        <p className="mt-2 h-4 text-xs text-emerald-600 dark:text-emerald-400">
          {incomeSavedFlash && '✓ Saved — now shown on Dashboard and Income & Bills'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          This salary covers everything from {fmtDay(cycle.start)} until{' '}
          {fmtDay(cycle.nextPayday)}.
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
              <p className="min-w-0 flex-1 truncate text-sm font-medium">Rent</p>
              <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {fmtMoney(plan.weeklyRent, currency)} × {plan.rentDates.length}{' '}
                {plan.rentDates.length === 1 ? 'week' : 'weeks'}
              </span>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmtMoney(plan.rentTotal, currency)}
              </span>
            </div>
            {plan.rentDates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[42px]">
                {plan.rentDates.map((d) => (
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
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                Bills & liabilities · {fmtMonth(cycle.fundedYm)}
              </p>
              <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {plan.unpaidBills.length} unpaid
              </span>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmtMoney(plan.billsTotal, currency)}
              </span>
            </div>

            {plan.allBills.length > 0 && (
              <ul className="mt-2 space-y-1 pl-[42px]">
                {[...plan.unpaidBills, ...plan.paidBills].slice(0, 6).map((l) => (
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
                {plan.allBills.length > 6 && (
                  <li className="text-xs text-zinc-400">+{plan.allBills.length - 6} more…</li>
                )}
              </ul>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2 pl-[42px]">
              {plan.allBills.length === 0 && !billFormOpen && (
                <p className="w-full text-xs text-zinc-500 dark:text-zinc-400">
                  No bills tracked for {fmtMonth(cycle.fundedYm)} yet — add what you'll owe this
                  cycle:
                </p>
              )}
              {!billFormOpen && (
                <Button variant="subtle" onClick={() => setBillFormOpen(true)} className="px-3 py-1.5 text-xs">
                  <Plus size={13} /> Add bill
                </Button>
              )}
              {prevHasBills && plan.allBills.length === 0 && (
                <Button variant="subtle" onClick={copyBillsFromPrevMonth} className="px-3 py-1.5 text-xs">
                  <CopyPlus size={13} /> Copy {fmtMonth(prevYm).split(' ')[0]} bills
                </Button>
              )}
              <button
                onClick={() => onNavigate('monthly')}
                className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Manage in Income & Bills →
              </button>
            </div>

            {billFormOpen && (
              <form
                onSubmit={quickAddBill}
                className="mt-2 flex flex-wrap items-end gap-2 pl-[42px]"
              >
                <Input
                  type="text"
                  placeholder="Bill name"
                  maxLength={60}
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className="w-40 flex-1"
                />
                <Input
                  inputMode="decimal"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Amount"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-28"
                />
                <Button type="submit" className="px-3 py-1.5 text-xs">
                  <CalendarPlus size={13} /> Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBillFormOpen(false)}
                  className="px-3 py-1.5 text-xs"
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>

          {/* Groceries */}
          <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400" aria-hidden>
                <ShoppingCart size={15} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium">Groceries set-aside</p>
              <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                ≈ {fmtMoney(plan.groceriesBudget / plan.weeks, currency)}/wk
              </span>
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmtMoney(plan.groceriesBudget, currency)}
              </span>
            </div>
            {!plan.isFuture && plan.groceriesBudget > 0 && (
              <div className="mt-2 pl-[42px]">
                <ProgressBar
                  value={(plan.groceriesSpent / plan.groceriesBudget) * 100}
                  className="h-1.5"
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Spent {fmtMoney(plan.groceriesSpent, currency)} of{' '}
                  {fmtMoney(plan.groceriesBudget, currency)} on Groceries
                  {plan.isPast ? ' in this cycle' : ' so far'}
                </p>
              </div>
            )}
          </div>

          {/* Committed bar */}
          <div>
            <ProgressBar value={plan.income > 0 ? (plan.committed / plan.income) * 100 : 0} className="h-3" />
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                Committed {fmtMoney(plan.committed, currency)}
                {plan.income > 0 &&
                  ` (${Math.round((plan.committed / plan.income) * 100)}% of income)`}
              </span>
              <span>Income {fmtMoney(plan.income, currency)}</span>
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
                plan.flexible < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {fmtMoney(plan.flexible, currency)}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ≈ {fmtMoney(plan.perWeek, currency)} per week unallocated
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {goal ? (
              <Button onClick={addToGoal} disabled={plan.flexible <= 0}>
                <PiggyBank size={16} /> Add to savings goal
              </Button>
            ) : (
              <Button variant="subtle" onClick={() => onNavigate('goal')} disabled={plan.flexible <= 0}>
                <PiggyBank size={16} /> Set a goal first
              </Button>
            )}
            {goal && plan.flexible > 0 && (
              <p className="max-w-52 text-right text-[11px] text-zinc-400">
                Moves {fmtMoney(plan.flexible, currency)} into “
                {goal.title?.trim() || 'Savings Goal'}”
              </p>
            )}
          </div>
        </div>

        {!plan.isFuture && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {plan.isPast ? 'Spent in cycle' : 'Spent so far'}
              </p>
              <p className="text-base font-semibold tabular-nums">
                {fmtMoney(plan.spent, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {plan.isPast ? 'Ended with' : 'Still available'}
              </p>
              <p
                className={cx(
                  'text-base font-bold tabular-nums',
                  plan.available < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-teal-600 dark:text-teal-400',
                )}
              >
                {fmtMoney(plan.available, currency)}
              </p>
            </div>
          </div>
        )}

        {plan.income > 0 && plan.flexible < 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>
              This cycle is over-committed by {fmtMoney(-plan.flexible, currency)}. Trim groceries
              or check for bills you can defer.
            </span>
          </div>
        )}

        {plan.income === 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-zinc-100 p-3.5 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <Coins size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Enter your expected take-home above to see the full breakdown.</span>
          </div>
        )}
      </Card>
    </div>
  )
}
