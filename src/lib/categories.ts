import {
  UtensilsCrossed,
  ShoppingCart,
  Bus,
  Home,
  Zap,
  Wifi,
  HeartPulse,
  ShoppingBag,
  Clapperboard,
  GraduationCap,
  Plane,
  Shapes,
  type LucideIcon,
} from 'lucide-react'

export interface Category {
  label: string
  icon: LucideIcon
  color: string
}

/** Tailwind classes for soft chips are derived from `color` via inline styles. */
export const CATEGORIES: Category[] = [
  { label: 'Food & Drink', icon: UtensilsCrossed, color: '#f97316' },
  { label: 'Groceries', icon: ShoppingCart, color: '#22c55e' },
  { label: 'Transport', icon: Bus, color: '#3b82f6' },
  { label: 'Housing & Rent', icon: Home, color: '#a855f7' },
  { label: 'Utilities', icon: Zap, color: '#eab308' },
  { label: 'Phone & Internet', icon: Wifi, color: '#06b6d4' },
  { label: 'Health', icon: HeartPulse, color: '#ef4444' },
  { label: 'Shopping', icon: ShoppingBag, color: '#ec4899' },
  { label: 'Entertainment', icon: Clapperboard, color: '#8b5cf6' },
  { label: 'Education', icon: GraduationCap, color: '#14b8a6' },
  { label: 'Travel', icon: Plane, color: '#0ea5e9' },
  { label: 'Other', icon: Shapes, color: '#71717a' },
]

const byLabel = new Map(CATEGORIES.map((c) => [c.label, c]))

export function categoryOf(label: string): Category {
  return (
    byLabel.get(label) ?? {
      label,
      icon: Shapes,
      color: '#71717a',
    }
  )
}
