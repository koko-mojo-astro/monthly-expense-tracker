import { useMemo, useState } from 'react'
import { ReceiptText, Plus } from 'lucide-react'
import { useAppData } from '../context/AppData'
import { ExpenseRow } from '../components/ExpenseRow'
import { Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Select } from '../components/ui'
import { cx, fmtDay, fmtMoney, fmtMonth, todayISO } from '../lib/format'
import { CATEGORIES } from '../lib/categories'
import { buildCycle, currentCycleStart, currentYm } from '../lib/stats'
import type { Expense } from '../lib/types'

interface FormState {
  amount: string
  category: string
  date: string
  note: string
}

function emptyForm(ym: string): FormState {
  const isCurrentMonth = ym === currentYm()
  return {
    amount: '',
    category: CATEGORIES[0]?.label ?? 'Other',
    date: isCurrentMonth ? todayISO() : `${ym}-01`,
    note: '',
  }
}

export function TransactionsView({ ym }: { ym: string }) {
  const { expenses, currency, api, settings } = useAppData()
  const [form, setForm] = useState<FormState>(() => emptyForm(ym))
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)

  // Scope: calendar month or the current pay cycle
  const [scope, setScope] = useState<'month' | 'cycle'>('month')
  const cycle = useMemo(
    () => buildCycle(currentCycleStart(settings.paydayDay ?? 24, todayISO()), settings.paydayDay ?? 24),
    [settings.paydayDay],
  )

  const scopedExpenses = useMemo(() => {
    if (scope === 'month') return expenses.filter((e) => e.date.startsWith(ym))
    return expenses.filter((e) => e.date >= cycle.start && e.date <= cycle.end)
  }, [expenses, scope, ym, cycle])

  const total = scopedExpenses.reduce((acc, e) => acc + e.amount, 0)

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
      setForm((f) => ({ ...emptyForm(ym), category: f.category, date: f.date }))
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
        <SectionTitle title="Log an expense" />
        <Card className="p-4 sm:p-5">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => set('amount', e.target.value)}
                    required
                    autoFocus
                  />
                </div>
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
            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              <Plus size={16} /> Add expense
            </Button>
          </form>
        </Card>
      </section>

      {/* Month list */}
      <section>
        <SectionTitle
          title={
            scope === 'month'
              ? `Expenses · ${fmtMonth(ym)}`
              : `Expenses · pay cycle ${fmtDay(cycle.start)} → ${fmtDay(cycle.nextPayday)}`
          }
          action={
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-zinc-200 p-0.5 text-xs dark:border-zinc-800">
                {(['month', 'cycle'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={cx(
                      'rounded-md px-2.5 py-1 font-medium transition',
                      scope === s
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
                    )}
                  >
                    {s === 'month' ? 'Month' : 'Pay cycle'}
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                Total: {fmtMoney(total, currency)}
              </span>
            </div>
          }
        />

        {scopedExpenses.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ReceiptText size={22} />}
              title={scope === 'month' ? `No transactions in ${ym}` : 'No transactions this pay cycle'}
              subtitle="Use the form above to log your first daily expense."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {[...groups.entries()].map(([date, group]) => (
              <Card key={date}>
                <div
                  className={cx(
                    'flex items-center justify-between border-b border-zinc-100 px-4 py-2.5',
                    'dark:border-zinc-800',
                  )}
                >
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {fmtDay(date)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
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
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="subtle" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
