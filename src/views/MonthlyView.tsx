import { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  Banknote,
  CalendarX2,
  CheckCircle2,
  Circle,
  CopyPlus,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAppData } from '../context/AppData'
import type { ViewId } from '../components/Nav'
import { Button, Card, EmptyState, Field, Input, SectionTitle } from '../components/ui'
import { cx, fmtDay, fmtMoney, fmtMonth } from '../lib/format'
import { addMonths, summarizeMonth } from '../lib/stats'
import { cycleForMonth } from '../lib/cycle'

function IncomeCard({
  ym,
  onNavigate,
}: {
  ym: string
  onNavigate?: (v: ViewId) => void
}) {
  const { incomes, api, settings } = useAppData()
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
      <SectionTitle title="Monthly income" />
      <div className="flex items-end gap-2">
        <Field label={`Income for ${fmtMonth(ym)}`}>
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
      {(() => {
        const funding = cycleForMonth(ym, settings.paydayDay ?? 24)
        return (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Covered by the pay cycle <b>{fmtDay(funding.start)} → {fmtDay(funding.nextPayday)}</b> —
              plan it in the Planner.
            </span>
            {onNavigate && (
              <button
                onClick={() => onNavigate('planner')}
                className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Open in Planner →
              </button>
            )}
          </div>
        )
      })()}
    </Card>
  )
}

export function MonthlyView({
  ym,
  onNavigate,
}: {
  ym: string
  onNavigate?: (v: ViewId) => void
}) {
  const { liabilities, expenses, incomes, currency, api } = useAppData()
  const monthItems = Object.entries(liabilities[ym] ?? {}).map(([id, l]) => ({ ...l, id }))
  monthItems.sort((a, b) => a.name.localeCompare(b.name))

  const prevYm = addMonths(ym, -1)
  const prevItems = liabilities[prevYm]
  const canCopy = !!prevItems && Object.keys(prevItems).length > 0

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const totalLiabilities = monthItems.reduce((acc, l) => acc + l.amount, 0)
  const paid = monthItems.filter((l) => l.paid).reduce((acc, l) => acc + l.amount, 0)
  const summary = summarizeMonth(expenses, incomes, liabilities, ym)

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

  async function copyFromLastMonth() {
    if (!prevItems || !window.confirm(`Copy all bills from ${fmtMonth(prevYm)} to ${fmtMonth(ym)}?`))
      return
    try {
      await Promise.all(
        Object.values(prevItems).map((l) => api.addLiability(ym, l.name, l.amount)),
      )
    } catch {
      window.alert('Could not copy bills. Check your database rules and connection.')
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <IncomeCard ym={ym} onNavigate={onNavigate} />

        {/* Net position */}
        <Card className="p-4 sm:p-5">
          <SectionTitle title={`Net position · ${fmtMonth(ym)}`} />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Income</dt>
              <dd className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{fmtMoney(summary.income, currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Daily expenses</dt>
              <dd className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                −{fmtMoney(summary.expenses, currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Bills & liabilities</dt>
              <dd className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                −{fmtMoney(summary.liabilities, currency)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <dt className="font-medium">Net savings</dt>
              <dd
                className={cx(
                  'font-bold tabular-nums',
                  summary.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {summary.net >= 0 ? '+' : ''}
                {fmtMoney(summary.net, currency)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Liabilities */}
      <section>
        <SectionTitle
          title={`Bills & liabilities · ${fmtMonth(ym)}`}
          action={
            canCopy ? (
              <button
                onClick={copyFromLastMonth}
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                <CopyPlus size={14} /> Copy last month
              </button>
            ) : undefined
          }
        />
        <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {monthItems.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 size={22} />}
              title="No bills tracked this month"
              subtitle="Add rent, utilities, subscriptions — anything you owe every month."
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
                <b className="tabular-nums">{fmtMoney(totalLiabilities, currency)}</b>
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={14} /> Paid <b className="tabular-nums">{fmtMoney(paid, currency)}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                Unpaid <b className="tabular-nums">{fmtMoney(totalLiabilities - paid, currency)}</b>
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
                  placeholder="e.g. Rent, Netflix, Loan"
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
  )
}
