import { useState } from 'react'
import { ChevronLeft, ChevronRight, LogOut, Menu, Moon, Settings, Sun, Wallet, X } from 'lucide-react'
import type { User } from 'firebase/auth'
import { cx, fmtDayShort } from '../lib/format'
import type { Cycle } from '../lib/stats'
import type { Theme } from '../hooks/useTheme'

export type CycleState = 'past' | 'current' | 'future'

export function cycleStateOf(cycle: Cycle, today: string): CycleState {
  if (cycle.end < today) return 'past'
  if (cycle.start > today) return 'future'
  return 'current'
}

const BADGES: Record<CycleState, { label: string; cls: string; dot: string }> = {
  past: {
    label: 'Past',
    cls: 'bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
    dot: 'bg-zinc-400',
  },
  current: {
    label: 'Live',
    cls: 'bg-violet-600 text-white',
    dot: 'bg-violet-500',
  },
  future: {
    label: 'Upcoming',
    cls: 'bg-[#C6FF00] text-[#0B0D14]',
    dot: 'bg-[#C6FF00]',
  },
}

export function Header({
  cycle,
  cycleState,
  canGoNext,
  onPrevCycle,
  onNextCycle,
  onResetCycle,
  showReset,
  theme,
  toggleTheme,
  onOpenSettings,
  user,
  onSignOut,
  onOpenNav,
}: {
  cycle: Cycle
  cycleState: CycleState
  canGoNext: boolean
  onPrevCycle: () => void
  onNextCycle: () => void
  onResetCycle: () => void
  showReset: boolean
  theme: Theme
  toggleTheme: () => void
  onOpenSettings: () => void
  user: User
  onSignOut: () => void
  onOpenNav?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = user.displayName || user.email || 'Account'
  const badge = BADGES[cycleState]

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900/5 bg-[#FFFBF0]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FFFBF0]/70 dark:border-white/5 dark:bg-[#080A12]/80">
      {/* Top row */}
      <div className="mx-auto flex h-[56px] max-w-[1280px] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="inline-flex size-9 items-center justify-center rounded-full bg-zinc-900 text-white lg:hidden dark:bg-white dark:text-zinc-900"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-[#0B0D14] text-[#C6FF00] shadow-sm dark:bg-white dark:text-zinc-900">
            <Wallet size={17} strokeWidth={2.2} />
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="font-display text-[14px] font-bold tracking-tight">Mojo Money</p>
            <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Pay-cycle budgeting
            </p>
          </div>
          <div className="leading-tight sm:hidden">
            <p className="font-display text-[14px] font-bold tracking-tight">Mojo</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="hidden size-9 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition hover:bg-zinc-900/10 sm:inline-flex dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="inline-flex size-9 items-center justify-center rounded-full bg-zinc-900/5 text-zinc-600 transition hover:bg-zinc-900/10 sm:bg-zinc-900/5 dark:bg-white/10 dark:text-zinc-300"
          >
            <Settings size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="ml-1 flex items-center rounded-full ring-2 ring-transparent transition hover:ring-violet-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-[#7C3AED] text-xs font-bold uppercase text-white">
                  {displayName.trim().charAt(0) || '?'}
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    {user.email && (
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                    )}
                  </div>
                  <div className="p-2">
                    <button
                      onClick={toggleTheme}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5 sm:hidden"
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onSignOut()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cycle navigator — full-width pill on mobile, inline on desktop */}
      <div className="border-t border-zinc-900/5 bg-white/60 px-3 py-2.5 backdrop-blur dark:border-white/5 dark:bg-white/[0.03] sm:px-4 lg:px-6">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2">
          <div className="flex flex-1 items-center justify-between gap-2 rounded-full border border-zinc-900/10 bg-white p-1 shadow-sm sm:flex-initial sm:justify-start dark:border-white/10 dark:bg-zinc-900">
            <button
              onClick={onPrevCycle}
              aria-label="Previous pay cycle"
              className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-900"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={onResetCycle}
              disabled={!showReset}
              title={showReset ? 'Back to the current cycle' : undefined}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 py-1 text-center disabled:cursor-default sm:min-w-[220px]"
            >
              <span className={cx('hidden size-2 shrink-0 rounded-full sm:block', badge.dot)} aria-hidden />
              <span className="truncate text-[13px] font-bold tracking-tight tabular-nums">
                {fmtDayShort(cycle.start)} — {fmtDayShort(cycle.nextPayday)}
              </span>
              <span className={cx('hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase sm:inline-flex', badge.cls)}>
                {badge.label}
              </span>
            </button>

            <button
              onClick={onNextCycle}
              disabled={!canGoNext}
              aria-label="Next pay cycle"
              className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 active:scale-95 disabled:pointer-events-none disabled:opacity-30 dark:bg-white dark:text-zinc-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* inline badge on very small screens */}
          <span className={cx('inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase sm:hidden', badge.cls)}>
            {badge.label}
          </span>

          {showReset && (
            <button
              onClick={onResetCycle}
              className="hidden items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700 sm:inline-flex"
            >
              <X size={12} /> Today
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
