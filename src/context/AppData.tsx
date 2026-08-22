import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useDbValue } from '../hooks/useDbValue'
import { createDbApi, type DbApi } from '../lib/db'
import type { Expense, Goal, IncomesMap, LiabilitiesMap, Settings } from '../lib/types'

export interface AppData {
  /** 'denied' means the database rules block reads/writes. */
  status: 'connecting' | 'online' | 'denied'
  loading: boolean
  expenses: Expense[]
  incomes: IncomesMap
  liabilities: LiabilitiesMap
  goal: Goal | null
  currency: string
  api: DbApi
}

const FALLBACK_CURRENCY = 'USD'

const noop = () => Promise.resolve()

const AppDataContext = createContext<AppData>({
  status: 'connecting',
  loading: true,
  expenses: [],
  incomes: {},
  liabilities: {},
  goal: null,
  currency: FALLBACK_CURRENCY,
  api: {
    addExpense: () => Promise.resolve(null),
    updateExpense: noop,
    deleteExpense: noop,
    setIncome: noop,
    addLiability: () => Promise.resolve(null),
    setLiabilityPaid: noop,
    deleteLiability: noop,
    saveGoal: noop,
    saveCurrency: noop,
    wipeAll: noop,
  },
})

function toExpenses(raw: Record<string, Omit<Expense, 'id'>> | null): Expense[] {
  if (!raw) return []
  const list = Object.entries(raw).map(([id, e]) => ({ ...e, id }))
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  return list
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  // Hooks must run unconditionally; paths are only valid while signed in.
  const expensesQ = useDbValue<Record<string, Omit<Expense, 'id'>>>(
    uid ? `users/${uid}/expenses` : '__signed_out__',
  )
  const incomesQ = useDbValue<IncomesMap>(uid ? `users/${uid}/incomes` : '__signed_out__')
  const liabilitiesQ = useDbValue<LiabilitiesMap>(uid ? `users/${uid}/liabilities` : '__signed_out__')
  const goalQ = useDbValue<Goal>(uid ? `users/${uid}/goal/current` : '__signed_out__')
  const settingsQ = useDbValue<Settings>(uid ? `users/${uid}/settings` : '__signed_out__')

  const queries = [expensesQ, incomesQ, liabilitiesQ, goalQ, settingsQ]
  const denied = queries.some((q) => q.error?.includes('permission'))
  const loading = !uid || queries.some((q) => q.loading)

  const value: AppData = {
    status: denied ? 'denied' : loading ? 'connecting' : 'online',
    loading,
    expenses: toExpenses(expensesQ.data),
    incomes: incomesQ.data ?? {},
    liabilities: liabilitiesQ.data ?? {},
    goal: goalQ.data,
    currency: settingsQ.data?.currency ?? FALLBACK_CURRENCY,
    api: createDbApi(uid || 'anonymous'),
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  return useContext(AppDataContext)
}
