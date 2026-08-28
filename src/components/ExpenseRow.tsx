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
    <li className="group flex items-center gap-3 px-4 py-3.5">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
        aria-hidden
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold leading-tight">{expense.note || expense.category}</p>
        {expense.note ? (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{expense.category}</p>
        ) : (
          <p className="text-xs text-zinc-400">No note</p>
        )}
      </div>
      <span className="shrink-0 text-[14px] font-bold tracking-tight tabular-nums">
        −{fmtMoney(expense.amount, currency)}
      </span>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(expense)}
              aria-label={`Edit ${expense.note || expense.category}`}
              className="rounded-full bg-zinc-900/5 p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-white dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white dark:hover:text-zinc-900"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(expense)}
              aria-label={`Delete ${expense.note || expense.category}`}
              className="rounded-full bg-zinc-900/5 p-2 text-zinc-500 transition hover:bg-rose-600 hover:text-white dark:bg-white/10 dark:text-zinc-300"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
