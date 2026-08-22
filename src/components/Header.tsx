import { useState } from 'react'
import { ChevronLeft, ChevronRight, LogOut, Moon, Settings, Sun, Wallet } from 'lucide-react'
import type { User } from 'firebase/auth'
import { fmtMonth } from '../lib/format'
import { currentYm, addMonths } from '../lib/stats'
import type { Theme } from '../hooks/useTheme'

export function Header({
  ym,
  setYm,
  theme,
  toggleTheme,
  onOpenSettings,
  user,
  onSignOut,
}: {
  ym: string
  setYm: (ym: string) => void
  theme: Theme
  toggleTheme: () => void
  onOpenSettings: () => void
  user: User
  onSignOut: () => void
}) {
  const atCurrent = ym >= currentYm()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user.displayName || user.email || 'Account'

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <Wallet size={17} strokeWidth={2.2} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">Mojo Money</p>
            <p className="hidden text-[11px] text-zinc-500 sm:block dark:text-zinc-400">
              Monthly expense tracker
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setYm(addMonths(ym, -1))}
              aria-label="Previous month"
              className="rounded-l-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="order-none min-w-[7.5rem] px-1 text-center text-sm font-semibold tabular-nums">
              {fmtMonth(ym)}
            </span>
            <button
              onClick={() => !atCurrent && setYm(addMonths(ym, 1))}
              disabled={atCurrent}
              aria-label="Next month"
              className="rounded-r-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-xl p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="rounded-xl p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <Settings size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="ml-0.5 flex items-center rounded-full ring-2 ring-transparent transition hover:ring-emerald-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-xs font-bold uppercase text-white">
                  {displayName.trim().charAt(0) || '?'}
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    {user.email && (
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onSignOut()
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
