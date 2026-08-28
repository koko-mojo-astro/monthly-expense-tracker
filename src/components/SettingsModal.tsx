import { useState } from 'react'
import { AlertTriangle, Database, Trash2 } from 'lucide-react'
import { useAppData } from '../context/AppData'
import { Button, Field, Select } from '../components/ui'
import { Modal } from '../components/ui'
import { DB_URL } from '../firebase'
import { cx } from '../lib/format'

const CURRENCIES = [
  'NZD', 'AUD', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'SGD', 'MYR', 'THB', 'VND',
  'PHP', 'IDR', 'INR', 'CAD', 'CHF', 'MMK', 'LAK', 'KHR',
]

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currency, status, api } = useAppData()
  const [confirmingWipe, setConfirmingWipe] = useState(false)

  async function wipe() {
    if (!confirmingWipe) {
      setConfirmingWipe(true)
      return
    }
    try {
      await api.wipeAll()
    } catch {
      window.alert('Could not delete data. Check your database rules.')
    }
    setConfirmingWipe(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <Field label="Currency" hint="Used everywhere amounts are displayed.">
          <Select value={currency} onChange={(e) => void api.saveCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-2xl border border-zinc-900/10 bg-zinc-900/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <p className="flex items-center gap-2 font-semibold">
            <Database size={15} /> Firebase Realtime Database
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 break-all text-xs text-zinc-500 dark:text-zinc-400">
            Status:{' '}
            <span
              className={cx(
                'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
                status === 'online' && 'bg-emerald-500 text-white',
                status === 'connecting' && 'bg-amber-500 text-white',
                status === 'denied' && 'bg-rose-600 text-white',
              )}
            >
              {status}
            </span>
            <span className="break-all">{DB_URL}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
            <AlertTriangle size={16} /> Danger zone
          </p>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-rose-600/80 dark:text-rose-300/70">
            Permanently delete every expense, bill, income record and goal. This cannot be undone.
          </p>
          <Button variant={confirmingWipe ? 'danger' : 'subtle'} onClick={wipe} className="w-full !rounded-full sm:w-auto">
            <Trash2 size={15} />
            {confirmingWipe ? 'Tap again to delete everything' : 'Delete all data'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
