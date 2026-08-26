import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownLeft,
  Banknote,
  CalendarX2,
  CheckCircle2,
  Circle,
  CopyPlus,
  Home,
  Plus,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useAppData } from '../context/AppData'
import type { ViewId } from '../components/Nav'
import { Button, Card, EmptyState, Field, Input, SectionTitle } from '../components/ui'
import { cx, fmtDay, fmtMoney, fmtMonth, todayISO } from '../lib/format'
import { addMonths, type Cycle } from '../lib/stats'
import { computeCyclePlan } from '../lib/cycle'

function IncomeCard({ cycle }: { cycle: Cycle }) {
  const ym = cycle.fundedYm
  const { incomes, api } = useAppData()
  const current = incomes[ym]?.amount ?? null
  const [value, setValue] = useState(current != null ? String(current) : '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    setValue(current != null ? String(current) : '')
    setSavedAt(0)
  }, [ym]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = Number.parseFloat(value || 'NaN') !== (current ?? NaN)

  async function save() {
    const amount = Number.parseFloat(value)
    if (!isFinite(amount) || amount < 0) return
    setSaving(true)
    try {
      await api.setIncome(ym, amount)
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(0), 2000)
    } catch {
      window.alert('Could not save income. Check your database rules and connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle title="Cycle income" />
      <div className="flex items-end gap-2">
        <Field label={`Take-home received ${fmtDay(cycle.start)}`}>
          <Input
            inputMode="decimal"
            type="number"
            step="any"
            min="0"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Button onClick={save} disabled={saving || !dirty} className="mb-px shrink-0">
          Save
        </Button>
      </div>
      <p className="mt-2 h-4 text-xs text-emerald-600 dark:text-emerald-400">
        {savedAt > 0 && '✓ Saved'}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        This paycheck covers everything until {fmtDay(cycle.nextPayday)}.
      </p>
    </Card>
  )
}

function CycleSummaryCard({ plan }: { plan: ReturnType<typeof computeCyclePlan> }) {
  const { currency } = useAppData()

  const rows: Array<{
    label: string
    amount: string
    tone: string
    icon?: LucideIcon
    note?: string
  }> = [
    {
      label: 'Take-home income',
      amount: `+${fmtMoney(plan.income, currency)}`,
      tone: 'text-emerald-600 dark:text-emerald-400',
      icon: Wallet,
    },
    {
      label: 'Rent',
      amount: `−${fmtMoney(plan.rentTotal, currency)}`,
      tone: 'text-violet-600 dark:text-violet-400',
      icon: Home,
      note: `${plan.rentDates.length} weekly ${plan.rentDates.length === 1 ? 'payment' : 'payments'}`,
    },
    {
      label: 'Bills',
      amount: `−${fmtMoney(plan.billsTotal, currency)}`,
      tone: 'text-amber-600 dark:text-amber-400',
      icon: CalendarX2,
      note:
        plan.unpaidBills.length > 0
          ? `${fmtMoney(plan.unpaidTotal, currency)} still to pay`
          : plan.allBills.length > 0
            ? 'all paid'
            : undefined,
    },
    {
      label: 'Set-aside used',
      amount: `−${fmtMoney(plan.envelopeSpent, currency)}`,
      tone: 'text-teal-600 dark:text-teal-400',
      icon: ShoppingCart,
      note:
        plan.envelopeRemaining == null
          ? undefined
          : plan.envelopeRemaining >= 0
            ? `${fmtMoney(plan.envelopeRemaining, currency)} left of ${fmtMoney(plan.envelopeBudget, currency)}`
            : `${fmtMoney(-plan.envelopeRemaining, currency)} over set-aside`,
    },
  ]

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle title="Where this paycheck went" />
      <dl className="space-y-2.5 text-sm">
        {rows.map(({ label, amount, tone, icon: Icon, note }) => (
          <div key={label} className="flex items-center gap-2.5">
            {Icon && (
              <Icon size={14} className="shrink-0 text-zinc-400" aria-hidden />
            )}
            <dt className="min-w-0 flex-1 text-zinc-500 dark:text-zinc-400">
              {label}
              {note && <span className="ml-1.5 text-[11px] text-zinc-400">({note})</span>}
            </dt>
            <dd className={cx('shrink-0 font-semibold tabular-nums', tone)}>{amount}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
          <dt className="font-medium">Flexible left</dt>
          <dd
            className={cx(
              'font-bold tabular-nums',
              plan.available >= 0
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-rose-600 dark:text-rose-400',
            )}
          >
            {fmtMoney(plan.available, currency)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-zinc-400">
        Same numbers as the Planner — rent, bills and the daily set-aside are already committed.
      </p>
    </Card>
  )
}

export function MonthlyView({
  cycle,
  onNavigate,
}: {
  /** The globally selected pay cycle; this view manages its money. */
  cycle: Cycle
  onNavigate?: (v: ViewId) => void
}) {
  void onNavigate
  const ym = cycle.fundedYm
  const today = todayISO()
  const { settings, expenses, incomes, liabilities, currency, api } = useAppData()

  const plan = computeCyclePlan(cycle, settings, incomes, liabilities, expenses, today)

  // Bills are stored under the funded month of the selected cycle.
  const monthItems = Object.entries(liabilities[ym] ?? {}).map(([id, l]) => ({ ...l, id }))
  monthItems.sort((a, b) => a.name.localeCompare(b.name))

  const prevYm = addMonths(ym, -1)
  const prevItems = liabilities[prevYm]
  const canCopy = !!prevItems && Object.keys(prevItems).length > 0

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number.parseFloat(amount)
    if (!name.trim()) return setError('Give the bill a name.')
    if (!isFinite(amt) || amt <= 0) return setError('Enter an amount greater than zero.')
    try {
      await api.addLiability(ym, name.trim(), amt)
      setName('')
      setAmount('')
    } catch {
      window.alert('Could not add bill. Check your database rules and connection.')
    }
  }

  async function copyFromPrevCycle() {
    if (
      !prevItems ||
      !window.confirm(`Copy ${Object.keys(prevItems).length} bills from the previous cycle into this one?`)
    )
      return
    try {
      await Promise.all(
        Object.values(prevItems).map((l) => api.addLiability(ym, l.name, l.amount)),
      )
    } catch {
      window.alert('Could not copy bills. Check your database rules and connection.')
    }
  }

  void currency

  return (
    <div className="space-y-5">
      {/* Cycle header */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" aria-hidden>
            <Wallet size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Income & Bills</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Payday {fmtDay(cycle.start)} → next payday {fmtDay(cycle.nextPayday)} ·{' '}
              <b>{fmtMonth(ym)}</b>'s money
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <IncomeCard cycle={cycle} />

          {/* Cycle summary — identical to the Planner */}
          <CycleSummaryCard plan={plan} />
        </div>

        {/* Bills */}
        <section>
          <SectionTitle
            title={`Bills & liabilities · ${fmtMonth(ym)}`}
            action={
              canCopy ? (
                <button
                  onClick={copyFromPrevCycle}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  <CopyPlus size={14} /> Copy previous cycle
                </button>
              ) : undefined
            }
          />
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {monthItems.length === 0 ? (
              <EmptyState
                icon={<CalendarX2 size={22} />}
                title="No bills tracked for this cycle"
                subtitle="Add rent, utilities, subscriptions — anything you owe until the next payday."
              />
            ) : (
              monthItems.map((l) => (
                <div key={l.id} className="group flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => api.setLiabilityPaid(ym, l.id, !l.paid).catch(() => window.alert('Update failed.'))}
                    aria-label={l.paid ? `Mark ${l.name} unpaid` : `Mark ${l.name} paid`}
                    className={cx(
                      'shrink-0 transition',
                      l.paid
                        ? 'text-emerald-500 hover:text-emerald-600'
                        : 'text-zinc-300 hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-400',
                    )}
                  >
                    {l.paid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cx(
                        'truncate text-sm font-medium',
                        l.paid && 'text-zinc-400 line-through dark:text-zinc-500',
                      )}
                    >
                      {l.name}
                    </p>
                    <p className={cx('text-xs', l.paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400')}>
                      {l.paid ? 'Paid' : 'Unpaid'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {fmtMoney(l.amount, currency)}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${l.name}"?`)) {
                        api.deleteLiability(ym, l.id).catch(() =>
                          window.alert('Could not delete. Check your database rules.'),
                        )
                      }
                    }}
                    aria-label={`Delete ${l.name}`}
                    className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 lg:opacity-0 lg:group-hover:opacity-100 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
            {monthItems.length > 0 && (
              <div className="flex items-center gap-3 bg-zinc-50/60 px-4 py-3 text-xs dark:bg-zinc-800/40">
                <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <Banknote size={14} /> Total{' '}
                  <b className="tabular-nums">{fmtMoney(plan.billsTotal, currency)}</b>
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft size={14} /> Paid <b className="tabular-nums">{fmtMoney(plan.paidTotal, currency)}</b>
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  Unpaid <b className="tabular-nums">{fmtMoney(plan.unpaidTotal, currency)}</b>
                </span>
              </div>
            )}
          </Card>

          <Card className="mt-4 p-4 sm:p-5">
            <form onSubmit={addItem} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
                <Field label="Bill name">
                  <Input
                    type="text"
                    placeholder="e.g. Power bill, Insurance, Loan"
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Amount">
                  <Input
                    inputMode="decimal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
              </div>
              {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
              <Button type="submit" variant="subtle" className="w-full sm:w-auto">
                <Plus size={16} /> Add bill
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </div>
  )
}
