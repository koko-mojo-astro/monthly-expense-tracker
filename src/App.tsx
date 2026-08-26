import { useMemo, useState } from 'react'
import { Database, Loader2 } from 'lucide-react'
import type { User } from 'firebase/auth'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppDataProvider, useAppData } from './context/AppData'
import { useTheme } from './hooks/useTheme'
import { Header, cycleStateOf } from './components/Header'
import { AuthScreen } from './components/AuthScreen'
import { BottomNav, Sidebar, type ViewId } from './components/Nav'
import { SettingsModal } from './components/SettingsModal'
import { DashboardView } from './views/DashboardView'
import { PlannerView } from './views/PlannerView'
import { TransactionsView } from './views/TransactionsView'
import { MonthlyView } from './views/MonthlyView'
import { GoalView } from './views/GoalView'
import { todayISO } from './lib/format'
import { addMonths, buildCycle, monthsUntil, paydayISOFor, type Cycle } from './lib/stats'
import { defaultCycle } from './lib/cycle'

const RULES_SNIPPET = `{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth !== null && auth.uid === $uid",
        ".write": "auth !== null && auth.uid === $uid"
      }
    }
  }
}`

function DeniedBanner() {
  const { status } = useAppData()
  if (status !== 'denied') return null
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
        <Database size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1 text-amber-800 dark:text-amber-200">
          <p className="font-semibold">Firebase denied access (permission_denied)</p>
          <p className="text-[13px] leading-relaxed">
            Your Realtime Database rules need to allow signed-in users to access their own data.
            In the Firebase Console open <b>Realtime Database → Rules</b>, paste:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-amber-100 p-2.5 font-mono text-xs leading-relaxed dark:bg-black/20">
            {RULES_SNIPPET}
          </pre>
          <p className="text-[13px]">and click Publish. This page will connect automatically.</p>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [view, setView] = useState<ViewId>('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!user) return <AuthScreen />

  return (
    <AppDataProvider>
      <AppShell
        user={user}
        view={view}
        setView={setView}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        theme={theme}
        toggleTheme={toggle}
        onSignOut={() => void signOut()}
      />
    </AppDataProvider>
  )
}

/**
 * Lives inside AppDataProvider so every view shares ONE selected pay cycle.
 * The header navigates cycles; Dashboard, Planner, Transactions and
 * Income & Bills all derive from it.
 */
function AppShell({
  user,
  view,
  setView,
  settingsOpen,
  setSettingsOpen,
  theme,
  toggleTheme,
  onSignOut,
}: {
  user: User
  view: ViewId
  setView: (v: ViewId) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  onSignOut: () => void
}) {
  const { settings } = useAppData()
  const today = todayISO()
  const pd = settings.paydayDay ?? 24

  // null = follow the smart default (upcoming cycle when payday is near)
  const [cycleStart, setCycleStart] = useState<string | null>(null)

  const cycle: Cycle = useMemo(() => {
    if (!cycleStart) return defaultCycle(pd, today)
    // Re-clamp the stored month against the current payday day so changing
    // the payday in the Planner keeps the selected cycle coherent.
    return buildCycle(paydayISOFor(cycleStart.slice(0, 7), pd), pd)
  }, [cycleStart, pd, today])

  const latest = defaultCycle(pd, today)
  const canGoNext = monthsUntil(latest.start.slice(0, 7), cycle.start.slice(0, 7)) < 2

  const shiftCycle = (delta: number) => {
    const base = cycleStart ?? cycle.start
    setCycleStart(paydayISOFor(addMonths(base.slice(0, 7), delta), pd))
  }

  return (
    <div className="min-h-dvh">
      <Header
        cycle={cycle}
        cycleState={cycleStateOf(cycle, today)}
        canGoNext={canGoNext}
        onPrevCycle={() => shiftCycle(-1)}
        onNextCycle={() => shiftCycle(1)}
        onResetCycle={() => setCycleStart(null)}
        showReset={cycleStart !== null}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        user={user}
        onSignOut={onSignOut}
      />
      <DeniedBanner />
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-5">
        <Sidebar active={view} onSelect={setView} />
        <main className="min-w-0 flex-1 pb-24 lg:pb-6">
          {view === 'dashboard' && <DashboardView cycle={cycle} theme={theme} onNavigate={setView} />}
          {view === 'planner' && <PlannerView key={cycle.start} cycle={cycle} onNavigate={setView} />}
          {view === 'transactions' && <TransactionsView key={cycle.start} cycle={cycle} />}
          {view === 'monthly' && <MonthlyView key={cycle.start} cycle={cycle} onNavigate={setView} />}
          {view === 'goal' && <GoalView />}
        </main>
      </div>
      <BottomNav active={view} onSelect={setView} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function Boot() {
  const { initializing } = useAuth()
  if (initializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    )
  }
  return <Shell />
}

export default function App() {
  return (
    <AuthProvider>
      <Boot />
    </AuthProvider>
  )
}
