import { CalendarRange, Calculator, LayoutDashboard, PiggyBank, ReceiptText } from 'lucide-react'
import { cx } from '../lib/format'

export type ViewId = 'dashboard' | 'planner' | 'transactions' | 'monthly' | 'goal'

export const NAV_ITEMS: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planner', label: 'Planner', icon: Calculator },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'monthly', label: 'Income & Bills', icon: CalendarRange },
  { id: 'goal', label: 'Savings Goal', icon: PiggyBank },
]

export function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId
  onSelect: (v: ViewId) => void
}) {
  return (
    <nav className="sticky top-20 hidden self-start lg:block">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              onClick={() => onSelect(id)}
              aria-current={active === id ? 'page' : undefined}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active === id
                  ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50',
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function BottomNav({
  active,
  onSelect,
}: {
  active: ViewId
  onSelect: (v: ViewId) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              onClick={() => onSelect(id)}
              aria-current={active === id ? 'page' : undefined}
              className={cx(
                'flex w-full flex-col items-center gap-0.5 px-0.5 py-2.5 text-[10px] font-medium transition sm:text-[11px]',
                active === id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400',
              )}
            >
              <Icon size={20} />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
