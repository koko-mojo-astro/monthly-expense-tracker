import { X } from 'lucide-react'
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cx } from '../lib/format'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-[20px] border bg-white shadow-[0_1px_2px_rgba(11,13,20,0.04),0_8px_24px_rgba(11,13,20,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.4)]',
        'border-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-900/80 dark:backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-[20px] border backdrop-blur-xl',
        'border-white/60 bg-white/75 shadow-[0_8px_32px_rgba(11,13,20,0.08)]',
        'dark:border-zinc-800 dark:bg-zinc-900/60',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  title,
  action,
  kicker,
}: {
  title: string
  action?: ReactNode
  kicker?: string
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {kicker && (
          <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-violet-600 uppercase dark:text-violet-400">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-[13px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold tracking-tight transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const buttonVariants = {
  primary:
    'bg-[#0B0D14] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.12)] hover:bg-zinc-800 active:bg-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100',
  accent:
    'bg-[#C6FF00] text-[#0B0D14] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(198,255,0,0.35)] hover:bg-[#D4FF33] active:bg-[#B8E600] dark:shadow-[0_4px_20px_rgba(198,255,0,0.25)]',
  subtle:
    'bg-zinc-900/5 text-zinc-900 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 border border-zinc-900/5 dark:border-white/10',
  ghost:
    'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:bg-rose-700',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
}

export function Button({ variant = 'primary', className, ...rest }: ButtonProps) {
  return <button className={cx(buttonBase, buttonVariants[variant], className)} {...rest} />
}

const inputCls =
  'w-full rounded-2xl border bg-white px-3.5 py-2.5 text-[14px] font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputCls, className)} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(inputCls, 'appearance-none pr-9 bg-no-repeat', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 12px center',
      }}
      {...rest}
    />
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-relaxed text-zinc-400">{hint}</span>}
    </label>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B0D14]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-zinc-200 bg-[#FFFBF0] p-6 shadow-[0_16px_64px_rgba(0,0,0,0.16)] sm:rounded-[28px] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-[17px] font-bold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-zinc-900/5 p-2 text-zinc-500 transition hover:bg-zinc-900/10 hover:text-zinc-900 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-white/15 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('h-2 w-full overflow-hidden rounded-full bg-zinc-900/8 dark:bg-white/10', className)}
    >
      <div
        className="h-full rounded-full bg-[#0B0D14] transition-[width] duration-700 ease-out dark:bg-white"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function AccentProgress({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('h-2 w-full overflow-hidden rounded-full bg-zinc-900/8 dark:bg-white/10', className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-[#C6FF00] transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'animate-pulse rounded-[20px] bg-zinc-900/5 dark:bg-white/5',
        className,
      )}
    />
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-[18px] bg-zinc-900/5 p-4 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
        {icon}
      </div>
      <p className="font-display text-[15px] font-semibold tracking-tight">{title}</p>
      {subtitle && <p className="max-w-xs text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
    accent: 'bg-violet-600 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
  } as const
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase', tones[tone])}>{children}</span>
}
