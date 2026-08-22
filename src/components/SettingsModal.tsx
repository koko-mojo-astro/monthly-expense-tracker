import { useState } from 'react'
import { AlertTriangle, Database, Trash2 } from 'lucide-react'
import { useAppData } from '../context/AppData'
import { Button, Field, Modal, Select } from '../components/ui'
import { dbApi } from '../lib/db'
import { DB_URL } from '../firebase'
import { cx } from '../lib/format'

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'SGD', 'MYR', 'THB', 'VND',
  'PHP', 'IDR', 'INR', 'AUD', 'CAD', 'CHF', 'MMK', 'LAK', 'KHR',
]

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currency, status } = useAppData()
  const [confirmingWipe, setConfirmingWipe] = useState(false)

  async function wipe() {
    if (!confirmingWipe) {
      setConfirmingWipe(true)
      return
    }
    try {
      await dbApi.wipeAll()
    } catch {
      window.alert('Could not delete data. Check your database rules.')
    }
    setConfirmingWipe(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <Field label="Currency" hint="Used everywhere amounts are displayed.">
          <Select value={currency} onChange={(e) => void dbApi.saveCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-xl border border-zinc-200 p-3.5 text-sm dark:border-zinc-800">
          <p className="flex items-center gap-2 font-medium">
            <Database size={15} /> Firebase Realtime Database
          </p>
          <p className="mt-1 flex items-center gap-2 break-all text-xs text-zinc-500 dark:text-zinc-400">
            Status:{' '}
            <span
              className={cx(
                'font-semibold',
                status === 'online' && 'text-emerald-600 dark:text-emerald-400',
                status === 'connecting' && 'text-amber-600 dark:text-amber-400',
                status === 'denied' && 'text-rose-600 dark:text-rose-400',
              )}
            >
              {status}
            </span>
            · {DB_URL}
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/20">
          <p className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle size={15} /> Danger zone
          </p>
          <p className="mt-1 mb-3 text-xs text-rose-600/80 dark:text-rose-300/70">
            Permanently delete every expense, bill, income record and goal.
          </p>
          <Button variant={confirmingWipe ? 'danger' : 'subtle'} onClick={wipe} className="w-full sm:w-auto">
            <Trash2 size={15} />
            {confirmingWipe ? 'Tap again to delete everything' : 'Delete all data'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
