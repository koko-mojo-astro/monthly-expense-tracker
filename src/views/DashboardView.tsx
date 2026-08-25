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
} from 'lucide-react'
import { useAppData } from '../context/AppData'
import { ExpenseRow } from '../components/ExpenseRow'
import { CategoryDonut, TrendChart } from '../components/charts'
import { Button, Card, EmptyState, ProgressBar, SectionTitle, Skeleton } from '../components/ui'
import { cx, fmtDay, fmtMoney, fmtMonth, todayISO } from '../lib/format'
import {
  addMonths,
  categoryTotals,
  lastNMonths,
  monthlyCapacity,
  projectGoal,
  summarizeMonth,
} from '../lib/stats'
import { computeCyclePlan, defaultCycle } from '../lib/cycle'
import type { ViewId } from '../components/Nav'

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value == null || !isFinite(value)) return null
  const up = value >= 0
  const good = invert ? !up : up
  return (
    <span
      className={cx(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        good
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      )}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(Math.round(value))}% vs last month
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
  invertDelta,
}: {
  label: string
  value: string
  icon: typeof ReceiptText
  tone: string
  delta?: number | null
  invertDelta?: boolean
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cx('flex size-9 items-center justify-center rounded-xl', tone)} aria-hidden>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="truncate text-lg font-bold tabular-nums">{value}</p>
        </div>
      </div>
      {(delta != null) && (
        <div className="mt-2.5">
          <Delta value={delta} invert={invertDelta} />
        </div>
      )}
    </Card>
  )
}

function CycleCard({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const { settings, incomes, liabilities, expenses, currency } = useAppData()
  const today = todayISO()
  const pd = settings.paydayDay ?? 24
  const plan = computeCyclePlan(defaultCycle(pd, today), settings, incomes, liabilities, expenses, today)

  const badge = plan.isFuture
    ? { label: 'Upcoming', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' }
    : plan.isPast
      ? { label: 'Past', cls: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300' }
      : { label: 'Current', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-400' }

  const committedPct = plan.income > 0 ? (plan.committed / plan.income) * 100 : 0

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" aria-hidden>
          <CalendarCheck2 size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Pay cycle</p>
            <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', badge.cls)}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {fmtDay(plan.cycle.start)} → {fmtDay(plan.cycle.end)} · funds{' '}
            <b>{fmtMonth(plan.fundedYm)}</b>
            {plan.isCurrent && plan.daysToNextPayday >= 0 && (
              <>
                {' '}
                · payday in {plan.daysToNextPayday}{' '}
                {plan.daysToNextPayday === 1 ? 'day' : 'days'}
              </>
            )}
          </p>
        </div>
        <Button variant="subtle" onClick={() => onNavigate('planner')} className="ml-auto shrink-0">
          Open planner
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Income · {fmtMonth(plan.fundedYm)}
          </p>
          <p className="text-sm font-bold tabular-nums sm:text-base">
            {fmtMoney(plan.income, currency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Committed (rent+bills+food)</p>
          <p className="text-sm font-bold tabular-nums sm:text-base">
            {fmtMoney(plan.committed, currency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {plan.isPast ? 'Spent in cycle' : 'Spent so far'}
          </p>
          <p className="text-sm font-bold tabular-nums sm:text-base">
            {fmtMoney(plan.spent, currency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {plan.isPast ? 'Ended with' : 'Flexible left'}
          </p>
          <p
            className={cx(
              'text-sm font-bold tabular-nums sm:text-base',
              plan.available < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {fmtMoney(plan.available, currency)}
          </p>
        </div>
      </div>

      <ProgressBar value={committedPct} className="mt-3 h-1.5" />
    </Card>
  )
}

export function DashboardView({
  ym,
  theme,
  onNavigate,
}: {
  ym: string
  theme: 'light' | 'dark'
  onNavigate: (v: ViewId) => void
}) {
  const { expenses, incomes, liabilities, goal, currency, loading } = useAppData()

  const summary = summarizeMonth(expenses, incomes, liabilities, ym)
  const prev = summarizeMonth(expenses, incomes, liabilities, addMonths(ym, -1))
  const capacityInfo = monthlyCapacity(expenses, incomes, liabilities, ym)
  const projection = goal ? projectGoal(goal.targetAmount, goal.savedAmount, capacityInfo.capacity, ym, goal.targetDate) : null

  const monthExpenses = expenses.filter((e) => e.date.startsWith(ym))
  const recent = monthExpenses.slice(0, 5)
  const catTotals = categoryTotals(expenses, ym)

  const trendYms = lastNMonths(ym, 6)
  const trendSummaries = trendYms.map((m) => summarizeMonth(expenses, incomes, liabilities, m))

  const progress =
    goal && goal.targetAmount > 0 ? (Math.min(goal.savedAmount, goal.targetAmount) / goal.targetAmount) * 100 : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
        <Skeleton className="h-36" />
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
      <CycleCard onNavigate={onNavigate} />

      {/* Summary cards */}
      <section>
        <SectionTitle title={`${fmtMonth(ym)} overview`} />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Income"
            value={fmtMoney(summary.income, currency)}
            icon={BanknoteArrowUp}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            delta={pctChange(summary.income, prev.income)}
          />
          <StatCard
            label="Expenses"
            value={fmtMoney(summary.expenses, currency)}
            icon={BanknoteArrowDown}
            tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            delta={pctChange(summary.expenses, prev.expenses)}
            invertDelta
          />
          <StatCard
            label="Bills & Liabilities"
            value={fmtMoney(summary.liabilities, currency)}
            icon={CalendarX2}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Net Savings"
            value={fmtMoney(summary.net, currency)}
            icon={PiggyBank}
            tone={
              summary.net >= 0
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }
          />
        </div>
      </section>

      {/* Goal card */}
      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400" aria-hidden>
              <Target size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold">{goal?.title?.trim() || 'Savings Goal'}</p>
              {goal ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {fmtMoney(goal.savedAmount, currency)} saved of{' '}
                  {fmtMoney(goal.targetAmount, currency)}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No goal set yet</p>
              )}
            </div>
          </div>
          <Button variant="subtle" onClick={() => onNavigate('goal')}>
            {goal ? 'Manage' : 'Set a goal'}
          </Button>
        </div>

        {goal ? (
          <div className="mt-4 space-y-3">
            <ProgressBar value={progress} />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {projection?.kind === 'achieved' && '🎉 Goal reached — great work!'}
              {projection?.kind === 'on-track' &&
                `At your average pace you'll reach this in about ${projection.monthsNeeded} ${projection.monthsNeeded === 1 ? 'month' : 'months'} (${fmtMonth(projection.projectedYm)}).`}
              {projection?.kind === 'stalled' &&
                'No monthly surplus yet — increase income or cut spending to make progress.'}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Set a target and the app will estimate how many months of saving it will take.
          </p>
        )}
      </Card>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionTitle title="Where money went" />
          {loading ? <Skeleton className="h-48" /> : <CategoryDonut totals={catTotals} currency={currency} dark={theme === 'dark'} />}
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionTitle title="Last 6 months" />
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <TrendChart
              yms={trendYms}
              income={trendSummaries.map((s) => s.income)}
              expenses={trendSummaries.map((s) => s.expenses)}
              liabilities={trendSummaries.map((s) => s.liabilities)}
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
          action={
            monthExpenses.length > 5 ? (
              <button
                onClick={() => onNavigate('transactions')}
                className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
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
              title="Nothing logged yet this month"
              subtitle="Daily expenses will appear here as soon as you add them."
              action={<Button variant="subtle" onClick={() => onNavigate('transactions')}>Log an expense</Button>}
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
