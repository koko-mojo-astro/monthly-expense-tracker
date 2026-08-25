import { useState } from 'react'
import { Database, Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppDataProvider, useAppData } from './context/AppData'
import { useTheme } from './hooks/useTheme'
import { Header } from './components/Header'
import { AuthScreen } from './components/AuthScreen'
import { BottomNav, Sidebar, type ViewId } from './components/Nav'
import { SettingsModal } from './components/SettingsModal'
import { DashboardView } from './views/DashboardView'
import { PlannerView } from './views/PlannerView'
import { TransactionsView } from './views/TransactionsView'
import { MonthlyView } from './views/MonthlyView'
import { GoalView } from './views/GoalView'
import { currentYm } from './lib/stats'
import { todayISO } from './lib/format'

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
  const [ym, setYm] = useState(currentYm())
  const [view, setView] = useState<ViewId>('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const { user, signOut } = useAuth()

  if (!user) return <AuthScreen />

  return (
    <AppDataProvider>
      <div className="min-h-dvh">
        <Header
          ym={ym}
          setYm={setYm}
          theme={theme}
          toggleTheme={toggle}
          onOpenSettings={() => setSettingsOpen(true)}
          user={user}
          onSignOut={() => void signOut()}
        />
        <DeniedBanner />
        <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-5">
          <Sidebar active={view} onSelect={setView} />
          <main className="min-w-0 flex-1 pb-24 lg:pb-6">
            {view === 'dashboard' && <DashboardView ym={ym} theme={theme} onNavigate={setView} />}
            {view === 'planner' && <PlannerView today={todayISO()} onNavigate={setView} />}
            {view === 'transactions' && <TransactionsView key={ym} ym={ym} />}
            {view === 'monthly' && <MonthlyView key={ym} ym={ym} onNavigate={setView} />}
            {view === 'goal' && <GoalView key={ym} ym={ym} />}
          </main>
        </div>
        <BottomNav active={view} onSelect={setView} />
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </AppDataProvider>
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
