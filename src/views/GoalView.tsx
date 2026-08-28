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
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Form */}
      <Card className="p-4 sm:p-5 lg:col-span-3">
        <SectionTitle title="Your savings goal" kicker="Goal" />
        {!goal && (
          <p className="mb-4 rounded-2xl bg-violet-600 px-3.5 py-2.5 text-sm leading-relaxed text-white">
            No goal yet — set a target and we&apos;ll calculate how many pay cycles it will take.
          </p>
        )}
        <form onSubmit={save} className="space-y-4">
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
                placeholder="0.00"
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
                placeholder="0.00"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Target date (optional)" hint="We'll tell you how much to save per month to hit it.">
            <Input type="date" value={targetDate} min={todayISO()} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          {error && <p className="rounded-2xl bg-rose-500 px-3.5 py-2.5 text-sm font-medium text-white">{error}</p>}
          <Button type="submit" disabled={saving} variant="accent" className="w-full sm:w-auto">
            <Sparkles size={16} /> {goal ? 'Update goal' : 'Create goal'}
          </Button>
        </form>

        {goal && (
          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <Field label="Add a contribution">
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  type="number"
                  step="any"
                  placeholder={`e.g. ${Math.round(remaining / Math.max(1, projection?.kind === 'on-track' ? projection.monthsNeeded : 1))}`}
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  className="flex-1"
                />
                <Button variant="primary" onClick={contribute} className="shrink-0">
                  Add
                </Button>
              </div>
            </Field>
            <p className="mt-1.5 text-xs text-zinc-500">Adds to your saved amount immediately.</p>
          </div>
        )}
      </Card>

      {/* Projection */}
      <div className="space-y-4 lg:col-span-2">
        <Card className="overflow-hidden">
          <div className="bg-[#0B0D14] p-4 text-white sm:p-5 dark:bg-zinc-900">
            <SectionTitle title="Projection" kicker="Forecast" />
            <div className="-mt-3">
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
                      <p className="text-xs font-bold tracking-wide text-violet-300 uppercase">Progress</p>
                      <p className="font-display text-3xl font-bold tabular-nums">{progress.toFixed(0)}%</p>
                    </div>
                    <p className="text-right text-sm tabular-nums text-zinc-300">
                      {fmtMoney(savedNum, currency)} / {fmtMoney(targetNum, currency)}
                      <br />
                      <span className="text-[#C6FF00]">{fmtMoney(remaining, currency)} to go</span>
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-[#C6FF00] transition-[width] duration-700" style={{ width: `${progress}%` }} />
                  </div>

                  {projection?.kind === 'achieved' && (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-[#C6FF00] p-3.5 text-sm font-bold text-[#0B0D14]">
                      <CheckCircle2 size={18} className="shrink-0" />
                      Goal achieved — time for a new one? 🎉
                    </div>
                  )}

                  {projection?.kind === 'on-track' && (
                    <>
                      <div className="rounded-2xl bg-white/10 p-3.5 text-sm leading-relaxed text-white backdrop-blur">
                        <div className="flex gap-2.5">
                          <CalendarClock size={18} className="mt-0.5 shrink-0 text-[#C6FF00]" />
                          <span>
                            Save <b className="text-[#C6FF00]">{fmtMoney(Math.ceil(remaining / projection.monthsNeeded), currency)}</b> per
                            month and you&apos;ll get there in{' '}
                            <b className="text-white">
                              {projection.monthsNeeded} {projection.monthsNeeded === 1 ? 'month' : 'months'}
                            </b>{' '}
                            — by <b className="text-white">{fmtMonth(projection.projectedYm)}</b>.
                          </span>
                        </div>
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
                      <div className="flex gap-2.5 rounded-2xl bg-amber-500 p-3.5 text-sm font-medium text-white">
                        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                        <span>
                          Not enough monthly surplus yet. Log income and bills so we can estimate your
                          pace.
                        </span>
                      </div>
                      {projection.requiredPerMonth != null && (
                        <p className="rounded-2xl bg-white/10 px-3.5 py-2.5 text-sm text-zinc-200">
                          To finish by your target date you&apos;d need{' '}
                          <b className="text-white">{fmtMoney(projection.requiredPerMonth, currency)}</b> per month.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle title="How this is calculated" kicker="Method" />
          <ul className="space-y-3 text-sm leading-relaxed">
            <li className="flex gap-3 rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
              <PiggyBank size={16} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
              <span className="text-zinc-600 dark:text-zinc-400">Average monthly surplus = income − expenses − bills across recent months with data.</span>
            </li>
            <li className="flex gap-3 rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
              <TrendingUp size={16} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
              <span className="text-zinc-600 dark:text-zinc-400">Months needed = amount still to save ÷ average surplus, rounded up.</span>
            </li>
            <li className="flex gap-3 rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
              <CalendarClock size={16} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
              <span className="text-zinc-600 dark:text-zinc-400">
                Currently using{' '}
                <b className="text-zinc-900 dark:text-white">
                  {capacityInfo.capacity == null
                    ? 'no data yet'
                    : `${fmtMoney(capacityInfo.capacity, currency)}/mo`}
                </b>
                {capacityInfo.monthsCounted > 1 && <> across {capacityInfo.monthsCounted} months.</>}
              </span>
            </li>
          </ul>
          <div className="mt-4">
            <ProgressBar value={progress} />
          </div>
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
        'flex gap-2.5 rounded-2xl p-3.5 text-sm font-medium',
        onSchedule
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white',
      )}
    >
      <TrendingUp size={18} className="mt-0.5 shrink-0" />
      <span>
        {onSchedule ? 'You are on track.' : 'Behind schedule.'} Target date requires{' '}
        <b>{fmtMoney(required, currency)}</b> per month.
      </span>
    </div>
  )
}
