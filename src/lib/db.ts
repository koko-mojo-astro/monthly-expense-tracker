import { ref, push, set, update, remove } from 'firebase/database'
import { db } from '../firebase'
import type { Expense, Goal, Settings } from './types'

type ExpenseDraft = Omit<Expense, 'id'>

export interface DbApi {
  addExpense(e: ExpenseDraft): Promise<string | null>
  updateExpense(id: string, patch: Partial<ExpenseDraft>): Promise<void>
  deleteExpense(id: string): Promise<void>
  setIncome(ym: string, amount: number): Promise<void>
  addLiability(ym: string, name: string, amount: number): Promise<string | null>
  setLiabilityPaid(ym: string, id: string, paid: boolean): Promise<void>
  deleteLiability(ym: string, id: string): Promise<void>
  saveGoal(patch: Partial<Omit<Goal, 'createdAt'>>): Promise<void>
  saveSettings(patch: Partial<Settings>): Promise<void>
  saveCurrency(currency: string): Promise<void>
  wipeAll(): Promise<void>
}

/**
 * All data lives under `users/{uid}/…` so the database rules can enforce
 * strict per-user isolation.
 */
export function createDbApi(uid: string): DbApi {
  const root = `users/${uid}`

  return {
    addExpense(e: ExpenseDraft): Promise<string | null> {
      return push(ref(db, `${root}/expenses`), { ...e, createdAt: Date.now() }).then((r) => r.key)
    },
    updateExpense(id: string, patch: Partial<ExpenseDraft>): Promise<void> {
      return update(ref(db, `${root}/expenses/${id}`), patch)
    },
    deleteExpense(id: string): Promise<void> {
      return remove(ref(db, `${root}/expenses/${id}`))
    },

    setIncome(ym: string, amount: number): Promise<void> {
      return set(ref(db, `${root}/incomes/${ym}`), { amount, updatedAt: Date.now() })
    },

    addLiability(ym: string, name: string, amount: number): Promise<string | null> {
      return push(ref(db, `${root}/liabilities/${ym}`), { name, amount, paid: false }).then(
        (r) => r.key,
      )
    },
    setLiabilityPaid(ym: string, id: string, paid: boolean): Promise<void> {
      return update(ref(db, `${root}/liabilities/${ym}/${id}`), { paid })
    },
    deleteLiability(ym: string, id: string): Promise<void> {
      return remove(ref(db, `${root}/liabilities/${ym}/${id}`))
    },

    saveGoal(patch: Partial<Omit<Goal, 'createdAt'>>): Promise<void> {
      return update(ref(db, `${root}/goal/current`), { ...patch, updatedAt: Date.now() })
    },

    saveSettings(patch: Partial<Settings>): Promise<void> {
      return update(ref(db, `${root}/settings`), patch)
    },

    saveCurrency(currency: string): Promise<void> {
      return set(ref(db, `${root}/settings/currency`), currency)
    },

    wipeAll(): Promise<void> {
      return remove(ref(db, root))
    },
  }
}
