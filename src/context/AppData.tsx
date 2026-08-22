import { createContext, useContext, type ReactNode } from 'react'
import { useDbValue } from '../hooks/useDbValue'
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
}

const FALLBACK_CURRENCY = 'USD'

const AppDataContext = createContext<AppData>({
  status: 'connecting',
  loading: true,
  expenses: [],
  incomes: {},
  liabilities: {},
  goal: null,
  currency: FALLBACK_CURRENCY,
})

function toExpenses(raw: Record<string, Omit<Expense, 'id'>> | null): Expense[] {
  if (!raw) return []
  const list = Object.entries(raw).map(([id, e]) => ({ ...e, id }))
  list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return 0
  })
  return list
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const expensesQ = useDbValue<Record<string, Omit<Expense, 'id'>>>('expenses')
  const incomesQ = useDbValue<IncomesMap>('incomes')
  const liabilitiesQ = useDbValue<LiabilitiesMap>('liabilities')
  const goalQ = useDbValue<Goal>('goal/current')
  const settingsQ = useDbValue<Settings>('settings')

  const queries = [expensesQ, incomesQ, liabilitiesQ, goalQ, settingsQ]
  const denied = queries.some((q) => q.error?.includes('permission'))
  const loading = queries.some((q) => q.loading)

  const value: AppData = {
    status: denied ? 'denied' : loading ? 'connecting' : 'online',
    loading,
    expenses: toExpenses(expensesQ.data),
    incomes: incomesQ.data ?? {},
    liabilities: liabilitiesQ.data ?? {},
    goal: goalQ.data,
    currency: settingsQ.data?.currency ?? FALLBACK_CURRENCY,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  return useContext(AppDataContext)
}
