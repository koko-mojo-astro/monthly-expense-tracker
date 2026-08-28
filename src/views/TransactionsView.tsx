import { useMemo, useState } from 'react'
import { ReceiptText, Plus } from 'lucide-react'
import { useAppData } from '../context/AppData'
import { ExpenseRow } from '../components/ExpenseRow'
import { Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Select } from '../components/ui'
import { cx, fmtDay, fmtDayShort, fmtMoney, fmtMonth, todayISO } from '../lib/format'
import { CATEGORIES } from '../lib/categories'
import type { Cycle } from '../lib/stats'
import type { Expense } from '../lib/types'

interface FormState {
  amount: string
  category: string
  date: string
  note: string
}

/**
 * Default expense date: today when it falls inside the selected pay cycle,
 * otherwise clamped into the cycle (first day for upcoming cycles, last day
 * for past ones) so new expenses always land in the cycle you're viewing.
 */
function defaultExpenseDate(cycle: Cycle, today: string): string {
  if (today >= cycle.start && today <= cycle.end) return today
  return today < cycle.start ? cycle.start : cycle.end
}

function emptyForm(cycle: Cycle, today: string): FormState {
  return {
    amount: '',
    category: CATEGORIES[0]?.label ?? 'Other',
    date: defaultExpenseDate(cycle, today),
    note: '',
  }
}

export function TransactionsView({ cycle }: { cycle: Cycle }) {
  const { expenses, currency, api, settings } = useAppData()
  const today = todayISO()
  const [form, setForm] = useState<FormState>(() => emptyForm(cycle, today))
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)

  // Scope: the selected pay cycle (default) or its funded calendar month
  const [scope, setScope] = useState<'month' | 'cycle'>('cycle')
  const ym = cycle.fundedYm

  const scopedExpenses = useMemo(() => {
    if (scope === 'month') return expenses.filter((e) => e.date.startsWith(ym))
    return expenses.filter((e) => e.date >= cycle.start && e.date <= cycle.end)
  }, [expenses, scope, ym, cycle])

  const total = scopedExpenses.reduce((acc, e) => acc + e.amount, 0)

  // Daily set-aside envelope draw-down for the selected cycle (all expenses)
  const envelopeBudget = settings.groceriesBudget ?? 0
  const envelopeSpent = total
  const envelopeLeft = envelopeBudget - envelopeSpent

  const groups = new Map<string, { items: Expense[]; total: number }>()
  for (const e of scopedExpenses) {
    const g = groups.get(e.date) ?? { items: [], total: 0 }
    g.items.push(e)
    g.total += e.amount
    groups.set(e.date, g)
  }

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amount = Number.parseFloat(form.amount)
    if (!isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    if (!form.date) return setError('Pick a date.')
    setSaving(true)
    try {
      await api.addExpense({
        amount,
        category: form.category,
        date: form.date,
        note: form.note.trim() || undefined,
      })
      setForm((f) => ({ ...emptyForm(cycle, today), category: f.category, date: f.date }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    const amount = Number.parseFloat(form.amount)
    if (!isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    if (!form.date) return setError('Pick a date.')
    setSaving(true)
    try {
      await api.updateExpense(editing.id, {
        amount,
        category: form.category,
        date: form.date,
        note: form.note.trim() || undefined,
      })
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(expense: Expense) {
    if (!window.confirm(`Delete "${expense.note || expense.category}"?`)) return
    try {
      await api.deleteExpense(expense.id)
    } catch {
      window.alert('Could not delete. Check your database rules and connection.')
    }
  }

  function startEdit(expense: Expense) {
    setEditing(expense)
    setForm({
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      note: expense.note ?? '',
    })
  }

  return (
    <div className="space-y-5">
      {/* Add expense */}
      <section>
        <SectionTitle title="Log an expense" kicker="Quick add" />
        <Card className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount">
                <Input
                  inputMode="decimal"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Category">
                <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
              </Field>
              <Field label="Note (optional)">
                <Input
                  type="text"
                  placeholder="e.g. Lunch with team"
                  maxLength={80}
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                />
              </Field>
            </div>
            {error && <p className="rounded-2xl bg-rose-500 px-3.5 py-2.5 text-sm font-medium text-white">{error}</p>}
            <Button type="submit" disabled={saving} variant="accent" className="w-full sm:w-auto">
              <Plus size={16} /> Add expense
            </Button>
          </form>
        </Card>
      </section>

      {/* Month list */}
      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-violet-600 uppercase dark:text-violet-400">History</p>
            <h2 className="font-display text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {scope === 'month'
                ? `Expenses · ${fmtMonth(ym)}`
                : `Pay cycle ${fmtDayShort(cycle.start)} → ${fmtDayShort(cycle.nextPayday)}`}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-zinc-900/10 bg-zinc-900/[0.04] p-1 dark:border-white/10 dark:bg-white/5">
              {(['cycle', 'month'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cx(
                    'rounded-full px-3.5 py-1.5 text-xs font-bold transition',
                    scope === s
                      ? 'bg-[#0B0D14] text-white shadow-sm dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
                  )}
                >
                  {s === 'month' ? 'Month' : 'Pay cycle'}
                </button>
              ))}
            </div>
            <span className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">
              {fmtMoney(total, currency)}
            </span>
          </div>
        </div>

        {scope === 'cycle' && envelopeBudget > 0 && (
          <div
            className={cx(
              'mb-3 rounded-2xl border px-3.5 py-2.5 text-xs font-medium leading-relaxed',
              envelopeLeft < 0
                ? 'border-rose-200 bg-rose-500 text-white dark:border-rose-800'
                : 'border-zinc-900/10 bg-zinc-900/[0.04] text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400',
            )}
          >
            Daily set-aside: {fmtMoney(envelopeSpent, currency)} of {fmtMoney(envelopeBudget, currency)} used —{' '}
            {envelopeLeft >= 0
              ? `${fmtMoney(envelopeLeft, currency)} left`
              : `${fmtMoney(-envelopeLeft, currency)} over`}
            .
          </div>
        )}

        {scopedExpenses.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ReceiptText size={22} />}
              title={scope === 'month' ? `No transactions in ${ym}` : 'No transactions this pay cycle'}
              subtitle="Use the form above to log your first daily expense."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {[...groups.entries()].map(([date, group]) => (
              <Card key={date} className="overflow-hidden">
                <div className="flex items-center justify-between bg-zinc-900 px-4 py-2.5 dark:bg-zinc-800">
                  <span className="text-xs font-bold tracking-wide text-white">
                    {fmtDay(date)}
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
                    {fmtMoney(group.total, currency)}
                  </span>
                </div>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {group.items.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      currency={currency}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Edit modal */}
      <Modal open={editing != null} onClose={() => setEditing(null)} title="Edit expense">
        <form onSubmit={handleUpdate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount">
              <Input
                inputMode="decimal"
                type="number"
                step="any"
                min="0"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
              />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </Field>
            <Field label="Note (optional)">
              <Input
                type="text"
                maxLength={80}
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
              />
            </Field>
          </div>
          {error && <p className="rounded-2xl bg-rose-500 px-3.5 py-2.5 text-sm font-medium text-white">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="subtle" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant="accent" className="flex-1">
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
