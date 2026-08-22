export interface Expense {
  id: string
  /** YYYY-MM-DD */
  date: string
  amount: number
  category: string
  note?: string
}

export interface IncomeRecord {
  amount: number
  updatedAt: number
}

/** Keyed by YYYY-MM in the database. */
export type IncomesMap = Record<string, IncomeRecord>

export interface Liability {
  id: string
  name: string
  amount: number
  paid: boolean
}

/** liabilities[ym][pushId] */
export type LiabilitiesMap = Record<string, Record<string, Liability>>

export interface Goal {
  title?: string
  targetAmount: number
  savedAmount: number
  /** YYYY-MM-DD or null */
  targetDate?: string | null
  createdAt?: number
  updatedAt?: number
}

export interface Settings {
  currency?: string
}

export interface MonthSummary {
  income: number
  expenses: number
  liabilities: number
  net: number
}
