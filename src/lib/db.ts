import { ref, push, set, update, remove } from 'firebase/database'
import { db } from '../firebase'
import type { Expense, Goal } from './types'

type ExpenseDraft = Omit<Expense, 'id'>

export const dbApi = {
  addExpense(e: ExpenseDraft): Promise<string | null> {
    return push(ref(db, 'expenses'), { ...e, createdAt: Date.now() }).then((r) => r.key)
  },
  updateExpense(id: string, patch: Partial<ExpenseDraft>): Promise<void> {
    return update(ref(db, `expenses/${id}`), patch)
  },
  deleteExpense(id: string): Promise<void> {
    return remove(ref(db, `expenses/${id}`))
  },

  setIncome(ym: string, amount: number): Promise<void> {
    return set(ref(db, `incomes/${ym}`), { amount, updatedAt: Date.now() })
  },

  addLiability(ym: string, name: string, amount: number): Promise<string | null> {
    return push(ref(db, `liabilities/${ym}`), { name, amount, paid: false }).then((r) => r.key)
  },
  copyLiabilities(fromYm: string, toYm: string): Promise<void> {
    // Handled by caller reading the local cache; kept for symmetry.
    void fromYm
    void toYm
    return Promise.resolve()
  },
  setLiabilityPaid(ym: string, id: string, paid: boolean): Promise<void> {
    return update(ref(db, `liabilities/${ym}/${id}`), { paid })
  },
  deleteLiability(ym: string, id: string): Promise<void> {
    return remove(ref(db, `liabilities/${ym}/${id}`))
  },

  saveGoal(patch: Partial<Omit<Goal, 'createdAt'>>): Promise<void> {
    return update(ref(db, 'goal/current'), { ...patch, updatedAt: Date.now() })
  },

  saveCurrency(currency: string): Promise<void> {
    return set(ref(db, 'settings/currency'), currency)
  },

  wipeAll(): Promise<void> {
    return remove(ref(db, '/'))
  },
}
