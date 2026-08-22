import { Pencil, Trash2 } from 'lucide-react'
import { categoryOf } from '../lib/categories'
import { fmtMoney } from '../lib/format'
import type { Expense } from '../lib/types'

export function ExpenseRow({
  expense,
  currency,
  onEdit,
  onDelete,
}: {
  expense: Expense
  currency: string
  onEdit?: (e: Expense) => void
  onDelete?: (e: Expense) => void
}) {
  const cat = categoryOf(expense.category)
  const Icon = cat.icon

  return (
    <li className="group flex items-center gap-3 px-4 py-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}
        aria-hidden
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{expense.note || expense.category}</p>
        {expense.note && (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{expense.category}</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        −{fmtMoney(expense.amount, currency)}
      </span>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(expense)}
              aria-label={`Edit ${expense.note || expense.category}`}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(expense)}
              aria-label={`Delete ${expense.note || expense.category}`}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
