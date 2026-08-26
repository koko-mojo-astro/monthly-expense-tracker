import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { categoryOf } from '../lib/categories'
import { fmtMoney } from '../lib/format'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

function useChartTheme(dark: boolean) {
  return {
    tick: dark ? '#a1a1aa' : '#52525b',
    grid: dark ? 'rgba(63, 63, 70, 0.4)' : 'rgba(228, 228, 231, 0.8)',
    label: dark ? '#d4d4d8' : '#3f3f46',
  }
}

export function CategoryDonut({
  totals,
  currency,
  dark,
}: {
  /** Map of category label -> amount (only >0 entries). */
  totals: Map<string, number>
  currency: string
  dark: boolean
}) {
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const total = entries.reduce((acc, [, v]) => acc + v, 0)

  const data = {
    labels: entries.map(([label]) => label),
    datasets: [
      {
        data: entries.map(([, v]) => Math.round(v * 100) / 100),
        backgroundColor: entries.map(([label]) => categoryOf(label).color),
        borderWidth: 2,
        borderColor: dark ? '#18181b' : '#ffffff',
        hoverOffset: 6,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed as number
            const pct = total > 0 ? ` (${((value / total) * 100).toFixed(0)}%)` : ''
            return `${ctx.label}: ${fmtMoney(value, currency)}${pct}`
          },
        },
      },
    },
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        No expenses recorded this month.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative mx-auto h-44 w-44 shrink-0 sm:mx-0 sm:h-40 sm:w-40">
        <Doughnut data={data} options={options} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Spent</span>
          <span className="text-base font-bold tabular-nums">{fmtMoney(total, currency)}</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
        {entries.slice(0, 7).map(([label, value]) => {
          const cat = categoryOf(label)
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="truncate text-zinc-600 dark:text-zinc-300">{label}</span>
              <span className="ml-auto shrink-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {fmtMoney(value, currency)}
              </span>
            </li>
          )
        })}
        {entries.length > 7 && (
          <li className="col-span-full text-zinc-400">+{entries.length - 7} more…</li>
        )}
      </ul>
    </div>
  )
}

export function TrendChart({
  labels,
  income,
  spending,
  bills,
  currency,
  dark,
}: {
  /** One label per pay cycle (e.g. funded-month short names). */
  labels: string[]
  income: number[]
  spending: number[]
  bills: number[]
  currency: string
  dark: boolean
}) {
  const t = useChartTheme(dark)

  const data = {
    labels,
    datasets: [
      { label: 'Income', data: income, backgroundColor: '#10b981', borderRadius: 5 },
      { label: 'Daily spending', data: spending, backgroundColor: '#f43f5e', borderRadius: 5 },
      { label: 'Bills', data: bills, backgroundColor: '#f59e0b', borderRadius: 5 },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: t.tick, font: { size: 11 } },
        border: { color: t.grid },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: t.grid },
        ticks: {
          color: t.tick,
          font: { size: 10 },
          maxTicksLimit: 6,
          callback: (value) => {
            const n = Number(value)
            if (Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
            return String(n)
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: t.label,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 7,
          boxHeight: 7,
          padding: 16,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y as number, currency)}`,
        },
      },
    },
    interaction: { mode: 'index', intersect: false },
  }

  return (
    <div className="h-64 w-full sm:h-72">
      <Bar data={data} options={options} />
    </div>
  )
}
