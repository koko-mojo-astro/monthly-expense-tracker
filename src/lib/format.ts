export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Formats a number as currency using Intl defaults (handles zero-decimal currencies). */
export function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return `${n.toLocaleString()} ${currency}`
  }
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** "Fri, Aug 22" */
export function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseISODate(iso))
}

/** "Aug 2026" from YYYY-MM */
export function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(y ?? 1970, (m ?? 1) - 1, 1),
  )
}

/** "Aug" from YYYY-MM */
export function fmtMonthShort(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(
    new Date(y ?? 1970, (m ?? 1) - 1, 1),
  )
}
