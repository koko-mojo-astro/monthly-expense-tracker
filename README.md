# Monthly Expense Tracker

A mobile-first, dark-mode-ready expense tracker that syncs in real time with Firebase
Realtime Database. Set a savings goal and instantly see how many months it will take
to reach based on your average monthly surplus.

## Features

- **Dashboard** — income, expenses, bills and net savings for any month, plus category
  breakdown (donut), 6-month trend chart and recent transactions
- **Daily expenses** — log, edit and delete expenses with categories, dates and notes,
  grouped by day
- **Monthly income** — store your income per month
- **Bills & liabilities** — track monthly obligations, mark them paid, copy last month's
  bills forward
- **Savings goal** — auto-calculates months-to-goal from average monthly surplus,
  supports optional target dates with required-monthly-saving feedback, and quick
  contributions
- **Light / Dark mode** — follows system preference, toggleable, persisted
- **Currency switcher** — 19 currencies via `Intl.NumberFormat`
- **Real-time sync** — every change streams through Firebase RTDB

## Tech stack

| Tool | Version |
| --- | --- |
| Vite | 8 |
| React | 19 |
| TypeScript | 7 (native compiler) |
| Tailwind CSS | 4 |
| Firebase JS SDK | 12 |
| Chart.js + react-chartjs-2 | 4 / 5 |

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build into dist/
```

## Firebase setup

Create a Realtime Database and allow read/write in **Realtime Database → Rules**:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ These rules are open on purpose for a personal/demo app. Lock them down with
> Firebase Authentication before storing anything sensitive.

Update `src/firebase.ts` with your own project config if you fork this.

## Data model (RTDB)

```
expenses/{pushId}          { date, amount, category, note?, createdAt }
incomes/{YYYY-MM}          { amount, updatedAt }
liabilities/{YYYY-MM}/{id} { name, amount, paid }
goal/current               { title?, targetAmount, savedAmount, targetDate? }
settings/currency          "USD"
```

## Deployment

Static build (`dist/`) hosted on [Render](https://render.com):

- Build command: `npm install && npm run build`
- Publish directory: `dist`
