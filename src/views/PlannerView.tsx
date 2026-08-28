import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
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
import { upcomingPaydayISO, type Cycle } from '../lib/stats'
import { computeCyclePlan } from '../lib/cycle'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function num(v: string): number {
  const n = Number.parseFloat(v)
  return isFinite(n) ? n : 0
}

function shiftYm(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y ?? 1970, ((m ?? 1) - 1) + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function PlannerView({
  cycle,
  onNavigate,
}: {
  /** The globally selected pay cycle (driven by the header navigator). */
  cycle: Cycle
  onNavigate: (v: ViewId) => void
}) {
  const today = todayISO()
  const { settings, incomes, liabilities, expenses, goal, currency, api, loading } = useAppData()

  // Assumptions (persisted to /settings once saved)
  const [paydayDate, setPaydayDate] = useState('')
  const [weeklyRent, setWeeklyRent] = useState('')
  const [rentWeekday, setRentWeekday] = useState('1')
  const [groceries, setGroceries] = useState('')
  const [assumptionsDirty, setAssumptionsDirty] = useState(false)
  const assumptionsLoaded = useRef(false)

  useEffect(() => {
    if (assumptionsLoaded.current || loading) return
    setPaydayDate(upcomingPaydayISO(settings.paydayDay ?? 24, today))
    setWeeklyRent(settings.weeklyRent != null ? String(settings.weeklyRent) : '')
    setRentWeekday(String(settings.rentWeekday ?? 1))
    setGroceries(settings.groceriesBudget != null ? String(settings.groceriesBudget) : '')
    assumptionsLoaded.current = true
  }, [settings, loading, today])

  // Payday is set as a real date (e.g. 25 Aug); the next payday is the same
  // date next month (25 Sep). Only the day-of-month is persisted.
  const pd = useMemo(() => {
    if (!paydayDate) return 24
    return Math.min(Math.max(1, Number(paydayDate.slice(8, 10)) || 24), 31)
  }, [paydayDate])

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
    ? { label: 'Upcoming', cls: 'bg-[#C6FF00] text-[#0B0D14]' }
    : plan.isPast
      ? { label: 'Past', cls: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' }
      : { label: 'Live now', cls: 'bg-violet-600 text-white' }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Cycle header */}
      <Card className="overflow-hidden">
        <div className="bg-[#0B0D14] p-4 text-white sm:p-5 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur" aria-hidden>
              <CalendarCheck2 size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-bold">Pay-cycle plan</p>
                <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase', badge.cls)}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                Payday {fmtDay(cycle.start)} → next payday {fmtDay(cycle.nextPayday)} ·{' '}
                <b className="text-white">{fmtMonth(cycle.fundedYm)}</b>&apos;s money
              </p>
            </div>
          </div>
          <p className="mt-3 hidden text-xs text-zinc-400 sm:block">
            Use the arrows in the top bar to switch cycles.
          </p>
        </div>
      </Card>

      {/* Expected income */}
      <Card className="p-4 sm:p-5">
        <SectionTitle title={`Expected take-home · ${fmtMonth(cycle.fundedYm)}`} kicker="Income" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
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
          </div>
          <Button onClick={useIncomeForCycle} disabled={num(incomeInput) <= 0} className="w-full sm:w-auto">
            Set as {fmtMonth(cycle.fundedYm)} income
          </Button>
        </div>
        <p className="mt-2 min-h-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {incomeSavedFlash && '✓ Saved — now on Dashboard and Income & Bills'}
        </p>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          This salary covers everything from {fmtDay(cycle.start)} until {fmtDay(cycle.nextPayday)}.
        </p>
      </Card>

      {/* Assumptions */}
      <Card className="p-4 sm:p-5">
        <SectionTitle
          title="Assumptions"
          kicker="Defaults"
          action={
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {savedFlash && '✓ Saved'}
            </span>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Payday date"
            hint="e.g. 25 Aug → next is 25 Sep."
          >
            <Input
              type="date"
              value={paydayDate}
              onChange={(e) => {
                setPaydayDate(e.target.value)
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
          <Field label="Daily set-aside" hint="All logged expenses draw from this first.">
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
          className="mt-4 w-full sm:w-auto"
        >
          Save assumptions
        </Button>
      </Card>

      {/* Allocations */}
      <Card className="p-4 sm:p-5">
        <SectionTitle title="Where this paycheck goes" kicker="Allocation" />

        <div className="space-y-3">
          {/* Rent */}
          <div className="rounded-2xl border border-zinc-900/5 bg-zinc-900/[0.02] p-3.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white" aria-hidden>
                <Home size={16} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">Rent</p>
              <span className="hidden shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400 sm:block">
                {fmtMoney(plan.weeklyRent, currency)} × {plan.rentDates.length} {plan.rentDates.length === 1 ? 'week' : 'weeks'}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {fmtMoney(plan.rentTotal, currency)}
              </span>
            </div>
            {plan.rentDates.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 sm:pl-[48px]">
                {plan.rentDates.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white dark:bg-white dark:text-zinc-900"
                  >
                    {fmtDay(d)}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs tabular-nums text-zinc-500 sm:hidden">
              {fmtMoney(plan.weeklyRent, currency)} × {plan.rentDates.length}
            </p>
          </div>

          {/* Bills */}
          <div className="rounded-2xl border border-zinc-900/5 bg-zinc-900/[0.02] p-3.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white" aria-hidden>
                <CalendarX2 size={16} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                Bills · {fmtMonth(cycle.fundedYm)}
              </p>
              <span className="shrink-0 rounded-full bg-amber-500 px-2 py-1 text-[11px] font-bold text-white">
                {plan.unpaidBills.length} unpaid
              </span>
              <span className="hidden w-24 shrink-0 text-right text-sm font-bold tabular-nums sm:block">
                {fmtMoney(plan.billsTotal, currency)}
              </span>
            </div>
            <p className="mt-1 text-right text-sm font-bold tabular-nums sm:hidden">{fmtMoney(plan.billsTotal, currency)}</p>

            {plan.allBills.length > 0 && (
              <ul className="mt-2.5 space-y-1 sm:pl-[48px]">
                {[...plan.unpaidBills, ...plan.paidBills].slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs dark:bg-zinc-800">
                    <span
                      className={
                        l.paid
                          ? 'truncate text-zinc-400 line-through dark:text-zinc-500'
                          : 'truncate font-medium text-zinc-700 dark:text-zinc-200'
                      }
                    >
                      {l.name}
                    </span>
                    <span
                      className={cx(
                        'shrink-0 tabular-nums',
                        l.paid ? 'text-zinc-400 line-through dark:text-zinc-500' : 'font-bold',
                      )}
                    >
                      {fmtMoney(l.amount, currency)}
                    </span>
                  </li>
                ))}
                {plan.allBills.length > 6 && (
                  <li className="text-xs font-medium text-zinc-400">+{plan.allBills.length - 6} more</li>
                )}
              </ul>
            )}
            {plan.allBills.length > 0 && (
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 sm:pl-[48px]">
                {plan.paidBills.length > 0 && <>Paid {fmtMoney(plan.paidTotal, currency)} · </>}
                {fmtMoney(plan.unpaidTotal, currency)} still to pay
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-[48px]">
              {plan.allBills.length === 0 && !billFormOpen && (
                <p className="w-full text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  No bills for {fmtMonth(cycle.fundedYm)} yet — add what you&apos;ll owe this cycle:
                </p>
              )}
              {!billFormOpen && (
                <Button variant="subtle" onClick={() => setBillFormOpen(true)} className="!rounded-full px-4 py-2 text-xs">
                  <Plus size={13} /> Add bill
                </Button>
              )}
              {prevHasBills && plan.allBills.length === 0 && (
                <Button variant="subtle" onClick={copyBillsFromPrevMonth} className="!rounded-full px-4 py-2 text-xs">
                  <CopyPlus size={13} /> Copy {fmtMonth(prevYm).split(' ')[0]} bills
                </Button>
              )}
              <button
                onClick={() => onNavigate('monthly')}
                className="text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
              >
                Manage in Income & Bills →
              </button>
            </div>

            {billFormOpen && (
              <form
                onSubmit={quickAddBill}
                className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:pl-[48px]"
              >
                <Input
                  type="text"
                  placeholder="Bill name"
                  maxLength={60}
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  inputMode="decimal"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Amount"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full sm:w-28"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 sm:flex-initial">
                    <CalendarPlus size={14} /> Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setBillFormOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Groceries */}
          <div className="rounded-2xl border border-zinc-900/5 bg-zinc-900/[0.02] p-3.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white" aria-hidden>
                <ShoppingCart size={16} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">Daily spending set-aside</p>
              <span className="hidden shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400 sm:block">
                ≈ {fmtMoney(plan.envelopeBudget / Math.max(1, plan.weeks), currency)}/wk
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {fmtMoney(plan.envelopeBudget, currency)}
              </span>
            </div>
            {!plan.isFuture && plan.envelopeBudget > 0 && (
              <div className="mt-2.5 sm:pl-[48px]">
                <ProgressBar
                  value={(plan.envelopeSpent / plan.envelopeBudget) * 100}
                  className="h-2"
                />
                <p
                  className={cx(
                    'mt-1.5 text-[11px] font-medium',
                    plan.envelopeRemaining != null && plan.envelopeRemaining < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  {fmtMoney(plan.envelopeSpent, currency)} of {fmtMoney(plan.envelopeBudget, currency)}
                  {plan.envelopeRemaining == null ? '' : plan.envelopeRemaining >= 0 ? ` — ${fmtMoney(plan.envelopeRemaining, currency)} left` : ` — ${fmtMoney(-plan.envelopeRemaining, currency)} over`}
                </p>
              </div>
            )}
          </div>

          {/* Committed bar */}
          <div className="rounded-2xl bg-zinc-900 p-3.5 text-white dark:bg-white dark:text-zinc-900">
            <ProgressBar value={plan.income > 0 ? (plan.committed / plan.income) * 100 : 0} className="h-2 !bg-white/20 dark:!bg-zinc-900/10" />
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
              <span className="text-zinc-300 dark:text-zinc-500">
                Committed {fmtMoney(plan.committed, currency)}
                {plan.income > 0 && ` · ${Math.round((plan.committed / plan.income) * 100)}%`}
              </span>
              <span className="font-bold">Income {fmtMoney(plan.income, currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Result */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase dark:text-zinc-400">
                Left to save · flexible
              </p>
              <p
                className={cx(
                  'mt-1 font-display text-[32px] font-bold leading-none tracking-tight tabular-nums sm:text-[36px]',
                  plan.flexible < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-900 dark:text-white',
                )}
              >
                {fmtMoney(plan.flexible, currency)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                ≈ {fmtMoney(plan.perWeek, currency)} per week unallocated
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {goal ? (
                <Button onClick={addToGoal} disabled={plan.flexible <= 0} variant={plan.flexible > 0 ? 'accent' : 'primary'} className="w-full sm:w-auto">
                  <PiggyBank size={16} /> Add to savings goal
                </Button>
              ) : (
                <Button variant="subtle" onClick={() => onNavigate('goal')} disabled={plan.flexible <= 0} className="w-full sm:w-auto">
                  <PiggyBank size={16} /> Set a goal first
                </Button>
              )}
              {goal && plan.flexible > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:max-w-52 sm:text-right">
                  Moves {fmtMoney(plan.flexible, currency)} into &ldquo;{goal.title?.trim() || 'Savings Goal'}&rdquo;
                </p>
              )}
            </div>
          </div>

          {!plan.isFuture && (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
                <p className="text-[11px] font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {plan.isPast ? 'Spent in cycle' : 'Spent so far'}
                </p>
                <p className="mt-1 font-display text-base font-bold tabular-nums">
                  {fmtMoney(plan.flexibleSpent, currency)}
                </p>
                {plan.envelopeSpent > 0 && (
                  <p className="text-[11px] text-zinc-500">
                    + {fmtMoney(plan.envelopeSpent, currency)} from set-aside
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-violet-600 p-3 text-white">
                <p className="text-[11px] font-bold tracking-wide text-violet-100 uppercase">
                  {plan.isPast ? 'Ended with' : 'Still available'}
                </p>
                <p className="mt-1 font-display text-base font-bold tabular-nums">
                  {fmtMoney(plan.available, currency)}
                </p>
              </div>
            </div>
          )}

          {plan.income > 0 && plan.flexible < 0 && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-500 p-3.5 text-sm font-medium text-white">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <span>
                Over-committed by {fmtMoney(-plan.flexible, currency)}. Trim daily spending or defer a bill.
              </span>
            </div>
          )}

          {plan.income === 0 && (
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-500 p-3.5 text-sm font-medium text-white">
              <Coins size={18} className="mt-0.5 shrink-0" />
              <span>Enter your expected take-home above to see the full breakdown.</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
