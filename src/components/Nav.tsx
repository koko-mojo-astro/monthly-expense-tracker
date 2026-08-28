import { useEffect } from 'react'
import { CalendarRange, Calculator, LayoutDashboard, PiggyBank, ReceiptText, X } from 'lucide-react'
import { cx } from '../lib/format'

export type ViewId = 'dashboard' | 'planner' | 'transactions' | 'monthly' | 'goal'

export const NAV_ITEMS: Array<{ id: ViewId; label: string; shortLabel: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Planner', shortLabel: 'Plan', icon: Calculator },
  { id: 'transactions', label: 'Transactions', shortLabel: 'Spend', icon: ReceiptText },
  { id: 'monthly', label: 'Income & Bills', shortLabel: 'Bills', icon: CalendarRange },
  { id: 'goal', label: 'Savings Goal', shortLabel: 'Goal', icon: PiggyBank },
]

export function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId
  onSelect: (v: ViewId) => void
}) {
  return (
    <nav className="sticky top-[108px] hidden w-[220px] shrink-0 self-start lg:block">
      <div className="rounded-[24px] border border-zinc-900/5 bg-white p-2 shadow-[0_8px_24px_rgba(11,13,20,0.06)] dark:border-white/5 dark:bg-zinc-900/60 dark:backdrop-blur">
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase">Navigate</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <li key={id}>
                <button
                  onClick={() => onSelect(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-[13px] font-semibold tracking-tight transition',
                    isActive
                      ? 'bg-[#0B0D14] text-white shadow-sm dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white',
                  )}
                >
                  <span className={cx('flex size-7 items-center justify-center rounded-full', isActive ? 'bg-white/15 dark:bg-zinc-900/10' : 'bg-zinc-900/5 dark:bg-white/10')}>
                    <Icon size={15} />
                  </span>
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mx-3 mt-3 rounded-2xl bg-gradient-to-br from-violet-600 to-[#7C3AED] p-4 text-white">
          <p className="font-display text-sm font-bold leading-tight">Stay on track</p>
          <p className="mt-1 text-xs leading-relaxed text-violet-100">Your pay-cycle plan updates live as you log spending.</p>
        </div>
      </div>
    </nav>
  )
}

export function MobileDrawer({
  open,
  active,
  onSelect,
  onClose,
}: {
  open: boolean
  active: ViewId
  onSelect: (v: ViewId) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-[#0B0D14]/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[84%] max-w-[320px] overflow-y-auto bg-[#FFFBF0] p-4 shadow-[0_16px_64px_rgba(0,0,0,0.24)] dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-base font-bold tracking-tight">Menu</p>
          <button onClick={onClose} aria-label="Close menu" className="rounded-full bg-zinc-900 p-2 text-white dark:bg-white dark:text-zinc-900">
            <X size={16} />
          </button>
        </div>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <li key={id}>
                <button
                  onClick={() => {
                    onSelect(id)
                    onClose()
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[#0B0D14] text-white dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10',
                  )}
                >
                  <Icon size={18} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-violet-600 to-[#7C3AED] p-4 text-white">
          <p className="text-sm font-bold">Mojo Money</p>
          <p className="mt-1 text-xs leading-relaxed text-violet-100">Pay-cycle budgeting that moves with your payday, not the calendar month.</p>
        </div>
      </div>
    </div>
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
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto max-w-lg rounded-[28px] border border-zinc-900/10 bg-white/90 p-1.5 shadow-[0_8px_32px_rgba(11,13,20,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80">
        <ul className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map(({ id, shortLabel, icon: Icon }) => {
            const isActive = active === id
            return (
              <li key={id}>
                <button
                  onClick={() => onSelect(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'flex w-full flex-col items-center gap-1 rounded-[20px] px-1 py-2 text-[10px] font-bold tracking-wide uppercase transition',
                    isActive
                      ? 'bg-[#0B0D14] text-white shadow-sm dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
                  )}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="leading-none">{shortLabel}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
