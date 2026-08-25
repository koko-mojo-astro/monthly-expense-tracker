# Monthly Expense Tracker

A mobile-first, dark-mode-ready expense tracker that syncs in real time with Firebase
Realtime Database. Set a savings goal and instantly see how many months it will take
to reach based on your average monthly surplus.

Self-contained and self-hostable: clone it, plug in your own Firebase project, and run
it on localhost as a personal/internal tool or deploy the static build to any hosting
provider you like.

## Features

- **Authentication** — Google one-tap sign-in plus email/password registration via
  Firebase Auth; every account gets an isolated data folder (`users/{uid}/…`)
- **Dashboard** — a pay-cycle summary card plus a cycle overview that mirrors the
  Planner exactly (income, daily expenses, bills, flexible left), category breakdown
  (donut), 6-month trend chart and recent transactions
- **Pay-cycle planner** — plans your money the way you actually live it: from one payday
  to the next rather than calendar months. Enter expected take-home and it auto-splits:
  weekly rent (counts every rent day that lands in the cycle — 4 or 5 automatically),
  unpaid bills for the funded month (paid bills stay committed — the money is
  already gone), groceries set-aside, then shows what's left as
  flexible/emergency savings with per-week allowance and mid-cycle "spent so far".
  Opens on the upcoming cycle when payday is near, quick-adds bills inline, tracks
  groceries actuals against the budget, and pushes income to the month it funds.
  The top-bar navigator switches pay cycles globally — Dashboard, Planner, Transactions
  and Income & Bills all follow the selected cycle
- **Daily expenses** — log, edit and delete expenses with categories, dates and notes,
  grouped by day; filter by calendar month **or** by pay cycle
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

## Running on localhost

### Prerequisites

- **Node.js 20+** (22 recommended) and npm
- A free **Firebase** project — the app stores all data in *your* project, nothing is
  shared with anyone else

### 1. Clone and install

```bash
git clone https://github.com/koko-mojo-astro/monthly-expense-tracker.git
cd monthly-expense-tracker
npm install
```

### 2. Connect your Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**
   (skip Google Analytics if you don't need it).
2. In the project, register a Web app: **Project settings → General → Your apps →
   Web app (`</>`)** → copy the `firebaseConfig` object.
3. Open **Build → Realtime Database → Create database**, then **Rules** tab and paste:

   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth !== null && auth.uid === $uid",
           ".write": "auth !== null && auth.uid === $uid"
         }
       }
     }
   }
   ```

   Each signed-in user can only read/write their own `users/{uid}/…` subtree.
4. Enable sign-in methods under **Build → Authentication → Sign-in method**:
   enable **Google** and **Email/Password**.
5. Under **Authentication → Settings → Authorized domains**, make sure `localhost`
   is listed (it is by default).
6. Paste your config into [`src/firebase.ts`](src/firebase.ts), replacing the existing
   `firebaseConfig`.

> The committed `src/firebase.ts` points at the author's personal project. For private
> or team use, always use your own project — you fully control and own the data.

### 3. Start the dev server

```bash
npm run dev
```

Open **http://localhost:5173**, sign in with Google or email/password, and start
tracking. Hot reload is enabled — changes apply instantly.

## Production build

```bash
npm run build    # typechecks, then bundles into dist/
npm run preview  # serves dist/ locally at http://localhost:4173
```

## Hosting it anywhere

The production build is a plain static bundle in `dist/` — there is no backend of your
own to run, since Firebase provides auth and the database. That means you can host it
wherever you like, or keep it entirely internal:

- **Internal tool**: put `dist/` on any machine and serve the folder with any static
  file server (nginx, Apache, Caddy, `npx serve dist`, …) — ideal for family/self-hosted
  use on a LAN.
- **Any static host**: upload/deploy `dist/` to the static hosting provider of your
  choice (build command `npm install && npm run build`, publish directory `dist` is all
  they need).

One step after deploying somewhere new: add your site's domain under
**Firebase → Authentication → Settings → Authorized domains**, otherwise Google
sign-in will fail with `auth/unauthorized-domain`. Email/password sign-in works
regardless. There are no server-side redirects to configure — it's a single-page app
with a single route.

## Data model (RTDB)

```
users/{uid}
├── expenses/{pushId}          { date, amount, category, note?, createdAt }
├── incomes/{YYYY-MM}          { amount, updatedAt }
├── liabilities/{YYYY-MM}/{id} { name, amount, paid }
├── goal/current               { title?, targetAmount, savedAmount, targetDate? }
└── settings
    ├── currency               "NZD" (default)
    ├── paydayDay              24        // pay cycle starts this day
    ├── weeklyRent             520       // auto-multiplied by rent days in cycle
    ├── rentWeekday            1         // 0=Sun … 6=Sat
    └── groceriesBudget        180
```

### Pay cycles

A cycle starts on `paydayDay` of one month and ends the day before the next payday.
The salary received at the start funds the month its final week falls in — e.g. the
Aug 24 → Sep 23 cycle is your "September money", so it is saved as **September income**
and covers September's bills.
