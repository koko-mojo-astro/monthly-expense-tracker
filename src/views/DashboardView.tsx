import {
  ArrowDownRight,
  ArrowUpRight,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarCheck2,
  CalendarX2,
  PiggyBank,
  ReceiptText,
  Target,
  Sparkles,
} from 'lucide-react'
import { useAppData } from '../context/AppData'
import { ExpenseRow } from '../components/ExpenseRow'
import { CategoryDonut, TrendChart } from '../components/charts'
import { Button, Card, EmptyState, ProgressBar, SectionTitle, Skeleton } from '../components/ui'
import { cx, fmtDay, fmtMoney, fmtMonth, fmtMonthShort, todayISO } from '../lib/format'
import {
  addMonths,
  buildCycle,
  currentYm,
  paydayISOFor,
  monthlyCapacity,
  projectGoal,
  type Cycle,
} from '../lib/stats'
import { computeCyclePlan } from '../lib/cycle'
import type { ViewId } from '../components/Nav'

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value == null || !isFinite(value)) return null
  const up = value >= 0
  const good = invert ? !up : up
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
        good
          ? 'bg-emerald-500 text-white'
          : 'bg-rose-500 text-white',
      )}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(Math.round(value))}%
    </span>
  )
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  delta,
  subtitle,
}: {
  label: string
  value: string
  icon: typeof ReceiptText
  tone: string
  delta?: number | null
  subtitle?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={cx('flex size-10 items-center justify-center rounded-2xl', tone)} aria-hidden>
          <Icon size={18} />
        </span>
        {delta != null && <Delta value={delta} />}
      </div>
      <p className="mt-3 text-[11px] font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{label}</p>
      <p className="font-display text-[20px] font-bold tracking-tight tabular-nums sm:text-[22px]">{value}</p>
      {subtitle && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
    </Card>
  )
}

function CycleCard({ cycle, onNavigate }: { cycle: Cycle; onNavigate: (v: ViewId) => void }) {
  const { settings, incomes, liabilities, expenses, currency } = useAppData()
  const today = todayISO()
  const plan = computeCyclePlan(cycle, settings, incomes, liabilities, expenses, today)

  const badge = plan.isFuture
    ? { label: 'Upcoming', cls: 'bg-[#C6FF00] text-[#0B0D14]' }
    : plan.isPast
      ? { label: 'Past', cls: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' }
      : { label: 'Live now', cls: 'bg-violet-600 text-white' }

  const committedPct = plan.income > 0 ? (plan.committed / plan.income) * 100 : 0

  return (
    <Card className="overflow-hidden">
      <div className="bg-[#0B0D14] p-4 text-white sm:p-5 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur" aria-hidden>
              <CalendarCheck2 size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-bold">Pay cycle</p>
                <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase', badge.cls)}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                {fmtDay(plan.cycle.start)} → {fmtDay(plan.cycle.nextPayday)} · funds{' '}
                <b className="text-white">{fmtMonth(plan.fundedYm)}</b>
                {plan.isCurrent && plan.daysToNextPayday >= 0 && (
                  <> · payday in {plan.daysToNextPayday} {plan.daysToNextPayday === 1 ? 'day' : 'days'}</>
                )}
              </p>
            </div>
          </div>
          <Button variant="subtle" onClick={() => onNavigate('planner')} className="shrink-0 !bg-white !text-zinc-900 hover:!bg-zinc-100">
            Open planner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
          <p className="text-[11px] font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Income · {fmtMonth(plan.fundedYm)}
          </p>
          <p className="mt-1 font-display text-sm font-bold tabular-nums sm:text-[15px]">
            {fmtMoney(plan.income, currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
          <p className="text-[11px] font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Committed</p>
          <p className="mt-1 font-display text-sm font-bold tabular-nums sm:text-[15px]">
            {fmtMoney(plan.committed, currency)}
          </p>
          <p className="text-[11px] text-zinc-500">rent + bills + set-aside</p>
        </div>
        <div className="rounded-2xl bg-zinc-900/[0.04] p-3 dark:bg-white/5">
          <p className="text-[11px] font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Set-aside used</p>
          <p className="mt-1 font-display text-sm font-bold tabular-nums sm:text-[15px]">
            {fmtMoney(plan.envelopeSpent, currency)}
          </p>
          {plan.envelopeRemaining != null && (
            <p className={cx('text-[11px] font-medium', plan.envelopeRemaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500')}>
              {plan.envelopeRemaining >= 0
                ? `${fmtMoney(plan.envelopeRemaining, currency)} left`
                : `${fmtMoney(-plan.envelopeRemaining, currency)} over`}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-violet-600 p-3 text-white">
          <p className="text-[11px] font-bold tracking-wide text-violet-100 uppercase">
            {plan.isPast ? 'Ended with' : 'Flexible left'}
          </p>
          <p className="mt-1 font-display text-sm font-bold tabular-nums sm:text-[15px]">
            {fmtMoney(plan.available, currency)}
          </p>
          <p className="text-[11px] text-violet-100">{plan.isPast ? 'final balance' : 'to save or spend'}</p>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <ProgressBar value={committedPct} className="h-2" />
        <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {plan.income > 0 ? `${Math.round(committedPct)}% of income committed` : 'Add income to see commitment'}
        </p>
      </div>
    </Card>
  )
}

export function DashboardView({
  cycle,
  theme,
  onNavigate,
}: {
  /** The globally selected pay cycle (driven by the header navigator). */
  cycle: Cycle
  theme: 'light' | 'dark'
  onNavigate: (v: ViewId) => void
}) {
  const { expenses, incomes, liabilities, goal, currency, settings, loading } = useAppData()
  const today = todayISO()
  const ym = cycle.fundedYm
  const nowYm = currentYm()

  // Overview numbers come from the same plan the Planner shows, so every
  // surface reconciles: income, committed (rent+bills+groceries), flexible.
  const pd = settings.paydayDay ?? 24
  const plan = computeCyclePlan(cycle, settings, incomes, liabilities, expenses, today)
  const prevPlan = computeCyclePlan(
    buildCycle(addMonths(cycle.start, -1), pd),
    settings,
    incomes,
    liabilities,
    expenses,
    today,
  )

  // Goal pace is always anchored to *today*, not the viewed month.
  const capacityInfo = monthlyCapacity(expenses, incomes, liabilities, nowYm)
  const projection = goal ? projectGoal(goal.targetAmount, goal.savedAmount, capacityInfo.capacity, nowYm, goal.targetDate) : null

  const cycleExpenses = expenses.filter((e) => e.date >= cycle.start && e.date <= cycle.end)
  const recent = cycleExpenses.slice(0, 5)
  const catTotals = new Map<string, number>()
  for (const e of cycleExpenses) {
    catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + e.amount)
  }

  // Trend across the last 6 pay cycles (oldest -> selected)
  const trendCycles = Array.from({ length: 6 }, (_, i) => {
    const start = paydayISOFor(addMonths(cycle.start.slice(0, 7), i - 5), pd)
    return computeCyclePlan(
      buildCycle(start, pd),
      settings,
      incomes,
      liabilities,
      expenses,
      today,
    )
  })

  const progress =
    goal && goal.targetAmount > 0 ? (Math.min(goal.savedAmount, goal.targetAmount) / goal.targetAmount) * 100 : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[110px]" />
          ))}
        </div>
        <Skeleton className="h-44" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Pay cycle card */}
      <CycleCard cycle={cycle} onNavigate={onNavigate} />

      {/* Overview — identical to the Planner's numbers */}
      <section>
        <SectionTitle title={`Cycle overview · ${fmtMonth(ym)}`} kicker="At a glance" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Income"
            value={fmtMoney(plan.income, currency)}
            icon={BanknoteArrowUp}
            tone="bg-emerald-500 text-white"
            subtitle={fmtMonth(ym)}
            delta={pctChange(plan.income, prevPlan.income)}
          />
          <StatCard
            label="Daily spending"
            value={fmtMoney(plan.envelopeSpent, currency)}
            icon={BanknoteArrowDown}
            tone="bg-violet-600 text-white"
            subtitle={
              plan.envelopeRemaining == null
                ? 'no set-aside set'
                : plan.envelopeRemaining >= 0
                  ? `${fmtMoney(plan.envelopeRemaining, currency)} left of ${fmtMoney(plan.envelopeBudget, currency)}`
                  : `${fmtMoney(-plan.envelopeRemaining, currency)} over set-aside`
            }
          />
          <StatCard
            label="Bills"
            value={fmtMoney(plan.billsTotal, currency)}
            icon={CalendarX2}
            tone="bg-amber-500 text-white"
            subtitle={
              plan.unpaidBills.length > 0
                ? `${fmtMoney(plan.unpaidTotal, currency)} to pay`
                : plan.allBills.length > 0
                  ? 'All paid ✓'
                  : 'None tracked'
            }
          />
          <StatCard
            label="Flexible left"
            value={fmtMoney(plan.available, currency)}
            icon={PiggyBank}
            tone={
              plan.available >= 0
                ? 'bg-[#C6FF00] text-[#0B0D14]'
                : 'bg-rose-500 text-white'
            }
            subtitle={
              plan.isCurrent && plan.daysLeftInCycle > 0 && plan.available > 0
                ? `≈ ${fmtMoney(plan.available / plan.daysLeftInCycle, currency)}/day · ${plan.daysLeftInCycle} days left`
                : plan.available < 0 ? 'Over-committed' : 'Available to save'
            }
          />
        </div>
      </section>

      {/* Goal card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600 to-[#5B21B6] p-4 text-white sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur" aria-hidden>
                <Target size={18} />
              </span>
              <div>
                <p className="font-display text-sm font-bold">{goal?.title?.trim() || 'Savings Goal'}</p>
                {goal ? (
                  <p className="text-xs text-violet-100">
                    {fmtMoney(goal.savedAmount, currency)} of {fmtMoney(goal.targetAmount, currency)} · {progress.toFixed(0)}%
                  </p>
                ) : (
                  <p className="text-xs text-violet-100">No goal set yet</p>
                )}
              </div>
            </div>
            <Button variant="subtle" onClick={() => onNavigate('goal')} className="!bg-white !text-violet-700 hover:!bg-violet-50">
              {goal ? 'Manage' : 'Set a goal'}
              <Sparkles size={14} />
            </Button>
          </div>
          {goal && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[#C6FF00] transition-[width] duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-violet-100">
                {projection?.kind === 'achieved' && '🎉 Goal reached — great work!'}
                {projection?.kind === 'on-track' &&
                  `At your pace you'll reach this in ~${projection.monthsNeeded} ${projection.monthsNeeded === 1 ? 'month' : 'months'} (${fmtMonth(projection.projectedYm)}).`}
                {projection?.kind === 'stalled' &&
                  'No surplus yet — increase income or trim spending to make progress.'}
              </p>
            </div>
          )}
          {!goal && (
            <p className="mt-3 text-xs leading-relaxed text-violet-100">
              Set a target and we&apos;ll estimate how many pay cycles it will take.
            </p>
          )}
        </div>
      </Card>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionTitle title="Where money went" kicker="Breakdown" />
          {loading ? <Skeleton className="h-48" /> : <CategoryDonut totals={catTotals} currency={currency} dark={theme === 'dark'} />}
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionTitle title="Last 6 pay cycles" kicker="Trend" />
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <TrendChart
              labels={trendCycles.map((t) => fmtMonthShort(t.fundedYm))}
              income={trendCycles.map((t) => t.income)}
              spending={trendCycles.map((t) => t.envelopeSpent)}
              bills={trendCycles.map((t) => t.billsTotal)}
              currency={currency}
              dark={theme === 'dark'}
            />
          )}
        </Card>
      </section>

      {/* Recent transactions */}
      <section>
        <SectionTitle
          title="Recent transactions"
          kicker="This cycle"
          action={
            cycleExpenses.length > 5 ? (
              <button
                onClick={() => onNavigate('transactions')}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                View all
              </button>
            ) : undefined
          }
        />
        <Card>
          {recent.length === 0 ? (
            <EmptyState
              icon={<ReceiptText size={22} />}
              title="Nothing logged yet this cycle"
              subtitle="Daily expenses will appear here as soon as you add them."
              action={<Button variant="accent" onClick={() => onNavigate('transactions')}>Log an expense</Button>}
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recent.map((e) => (
                <ExpenseRow key={e.id} expense={e} currency={currency} />
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}
