import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, PiggyBank, Sparkles, Target, TrendingUp, TriangleAlert } from 'lucide-react'
import { useAppData } from '../context/AppData'
import { Button, Card, EmptyState, Field, Input, ProgressBar, SectionTitle } from '../components/ui'
import { cx, fmtMoney, fmtMonth, todayISO } from '../lib/format'
import { currentYm, monthlyCapacity, projectGoal } from '../lib/stats'

export function GoalView() {
  // Goal pace is always projected from today, regardless of the viewed cycle.
  const ym = currentYm()
  const { goal, expenses, incomes, liabilities, currency, api } = useAppData()

  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [contribution, setContribution] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (goal) {
      setTitle(goal.title ?? '')
      setTarget(goal.targetAmount ? String(goal.targetAmount) : '')
      setSaved(String(goal.savedAmount ?? 0))
      setTargetDate(goal.targetDate ?? '')
    }
  }, [goal])

  const capacityInfo = monthlyCapacity(expenses, incomes, liabilities, ym)
  const targetNum = Number.parseFloat(target) || 0
  const savedNum = Number.parseFloat(saved) || 0
  const projection =
    targetNum > 0
      ? projectGoal(targetNum, savedNum, capacityInfo.capacity, ym, targetDate || null)
      : null

  const remaining = Math.max(0, targetNum - savedNum)
  const progress = targetNum > 0 ? Math.min(100, (Math.min(savedNum, targetNum) / targetNum) * 100) : 0

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isFinite(targetNum) || targetNum <= 0) return setError('Set a target amount greater than zero.')
    if (savedNum < 0) return setError('Saved amount cannot be negative.')
    setSaving(true)
    try {
      await api.saveGoal({
        title: title.trim() || undefined,
        targetAmount: targetNum,
        savedAmount: savedNum,
        targetDate: targetDate || null,
      })
    } catch {
      window.alert('Could not save the goal. Check your database rules and connection.')
    } finally {
      setSaving(false)
    }
  }

  async function contribute() {
    const amt = Number.parseFloat(contribution)
    if (!isFinite(amt) || amt === 0) return
    try {
      await api.saveGoal({ savedAmount: Math.max(0, savedNum + amt), targetAmount: targetNum })
      setContribution('')
    } catch {
      window.alert('Could not add contribution. Check your database rules.')
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Form */}
      <Card className="p-4 sm:p-5">
        <SectionTitle title="Your savings goal" />
        {!goal && (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            No goal yet — set a target below and this app will calculate how many months it will
            take based on your average monthly surplus.
          </p>
        )}
        <form onSubmit={save} className="space-y-3">
          <Field label="Goal name">
            <Input
              type="text"
              placeholder="e.g. Emergency fund, New laptop"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Target amount">
              <Input
                inputMode="decimal"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              />
            </Field>
            <Field label="Already saved">
              <Input
                inputMode="decimal"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Target date (optional)" hint="We'll tell you how much to save per month to hit it.">
            <Input type="date" value={targetDate} min={todayISO()} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <Button type="submit" disabled={saving}>
            <Sparkles size={16} /> {goal ? 'Update goal' : 'Create goal'}
          </Button>
        </form>

        {goal && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Field label="Add a contribution">
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  type="number"
                  step="any"
                  placeholder={`e.g. ${Math.round(remaining / Math.max(1, projection?.kind === 'on-track' ? projection.monthsNeeded : 1))}`}
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                />
                <Button variant="subtle" onClick={contribute} className="shrink-0">
                  Add
                </Button>
              </div>
            </Field>
            <p className="mt-1.5 text-xs text-zinc-400">Adds to your saved amount immediately.</p>
          </div>
        )}
      </Card>

      {/* Projection */}
      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <SectionTitle title="Projection" />
          {targetNum <= 0 ? (
            <EmptyState
              icon={<Target size={22} />}
              title="Enter a target amount"
              subtitle="The projection appears once you set a goal."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Progress</p>
                  <p className="text-2xl font-bold tabular-nums">{progress.toFixed(1)}%</p>
                </div>
                <p className="text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                  {fmtMoney(savedNum, currency)} / {fmtMoney(targetNum, currency)}
                  <br />
                  {fmtMoney(remaining, currency)} to go
                </p>
              </div>
              <ProgressBar value={progress} />

              {projection?.kind === 'achieved' && (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={18} className="shrink-0" />
                  Goal achieved — time for a new one? 🎉
                </div>
              )}

              {projection?.kind === 'on-track' && (
                <>
                  <div className="flex items-center gap-2.5 rounded-xl bg-teal-500/10 p-3.5 text-sm text-teal-800 dark:text-teal-300">
                    <CalendarClock size={18} className="shrink-0" />
                    <span>
                      Keep saving{' '}
                      <b>{fmtMoney(Math.ceil(remaining / projection.monthsNeeded), currency)}</b> per
                      month and you'll get there in about{' '}
                      <b>
                        {projection.monthsNeeded} {projection.monthsNeeded === 1 ? 'month' : 'months'}
                      </b>{' '}
                      — by <b>{fmtMonth(projection.projectedYm)}</b>.
                    </span>
                  </div>
                  {projection.requiredPerMonth != null && (
                    <StatusLine
                      onSchedule={projection.onSchedule ?? true}
                      required={projection.requiredPerMonth}
                      currency={currency}
                    />
                  )}
                </>
              )}

              {projection?.kind === 'stalled' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-300">
                    <TriangleAlert size={18} className="shrink-0" />
                    <span>
                      Not enough monthly surplus yet. Log income and bills so we can estimate your
                      pace, or increase what's left after expenses.
                    </span>
                  </div>
                  {projection.requiredPerMonth != null && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      To finish by your target date you'd need to save{' '}
                      <b>{fmtMoney(projection.requiredPerMonth, currency)}</b> per month.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle title="How this is calculated" />
          <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <li className="flex gap-2.5">
              <PiggyBank size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Average monthly surplus = income − expenses − bills across recent months with data.
            </li>
            <li className="flex gap-2.5">
              <TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Months needed = amount still to save ÷ average surplus, rounded up.
            </li>
            <li className="flex gap-2.5">
              <CalendarClock size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Currently using{' '}
              <b>
                {capacityInfo.capacity == null
                  ? 'no data yet'
                  : `${fmtMoney(capacityInfo.capacity, currency)}/mo`}
              </b>
              {capacityInfo.monthsCounted > 1 && <> across {capacityInfo.monthsCounted} months.</>}
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function StatusLine({
  onSchedule,
  required,
  currency,
}: {
  onSchedule: boolean
  required: number
  currency: string
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-2.5 rounded-xl p-3.5 text-sm',
        onSchedule
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
      )}
    >
      <TrendingUp size={18} className="shrink-0" />
      <span>
        {onSchedule ? 'You are on track.' : 'Behind schedule.'} Target date requires{' '}
        <b>{fmtMoney(required, currency)}</b> per month.
      </span>
    </div>
  )
}
