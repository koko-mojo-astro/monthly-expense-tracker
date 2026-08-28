import { useState, type FormEvent } from 'react'
import { ArrowRight, Loader2, ShieldCheck, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { friendlyAuthError } from '../lib/authErrors'
import { Button, Field, Input } from './ui'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  )
}

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const { signInWithGoogle, signInEmail, signUpEmail } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'none' | 'google' | 'email'>('none')

  async function run(fn: () => Promise<void>, kind: 'google' | 'email') {
    setError(null)
    setBusy(kind)
    try {
      await fn()
    } catch (err) {
      const msg = friendlyAuthError(err)
      if (msg) setError(msg)
    } finally {
      setBusy('none')
    }
  }

  function submitEmail(e: FormEvent) {
    e.preventDefault()
    void run(
      () =>
        mode === 'signup' ? signUpEmail(name, email, password) : signInEmail(email, password),
      'email',
    )
  }

  return (
    <div className="min-h-dvh bg-[#FFFBF0] dark:bg-[#080A12]">
      <div className="mx-auto grid min-h-dvh max-w-[1100px] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — brand / hero */}
        <div className="relative hidden overflow-hidden bg-[#0B0D14] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-[#C6FF00]/10" />
          <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-violet-600/20 blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 size-[420px] rounded-full bg-[#C6FF00]/10 blur-[80px]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-zinc-900">
                <Wallet size={20} strokeWidth={2.2} />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">Mojo Money</span>
            </div>
          </div>

          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur">
              <span className="size-2 rounded-full bg-[#C6FF00]" /> Pay-cycle budgeting
            </p>
            <h1 className="mt-4 font-display text-[42px] font-bold leading-[0.95] tracking-[-0.03em]">
              Budget by
              <br />
              <span className="font-fraunces italic font-bold text-[#C6FF00]">payday,</span> not
              <br />
              the calendar.
            </h1>
            <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-zinc-300">
              Track rent, bills and daily spending inside each pay cycle. See what&apos;s actually left to save.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                { icon: TrendingUp, title: 'Live pay-cycle plan', desc: 'Income → rent → bills → set-aside → flexible' },
                { icon: ShieldCheck, title: 'Private by default', desc: 'Your data lives in your Firebase — nobody else sees it.' },
                { icon: Sparkles, title: 'Savings projection', desc: 'Know exactly how many months until your goal.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs leading-relaxed text-zinc-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} Mojo Money — built for the way you get paid.</p>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-[420px]">
            {/* Mobile brand */}
            <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#0B0D14] text-[#C6FF00] shadow-md dark:bg-white dark:text-zinc-900">
                <Wallet size={22} strokeWidth={2.2} />
              </span>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">Mojo Money</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Budget by payday, not the calendar.</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-900/5 bg-white p-6 shadow-[0_8px_32px_rgba(11,13,20,0.08)] sm:p-7 dark:border-white/10 dark:bg-zinc-900">
              <div className="mb-6">
                <h2 className="font-display text-[22px] font-bold tracking-tight">
                  {mode === 'signup' ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {mode === 'signup' ? 'Start budgeting in under a minute.' : 'Sign in to your pay-cycle workspace.'}
                </p>
              </div>

              <Button
                type="button"
                variant="subtle"
                className="w-full !rounded-full !py-3"
                disabled={busy !== 'none'}
                onClick={() => void run(signInWithGoogle, 'google')}
              >
                {busy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                or with email
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <form onSubmit={submitEmail} className="space-y-3.5">
                {mode === 'signup' && (
                  <Field label="Name">
                    <Input
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Email">
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>

                {error && (
                  <p className="rounded-2xl bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={busy !== 'none'} variant="accent" className="w-full !py-3">
                  {busy === 'email' && <Loader2 size={16} className="animate-spin" />}
                  {mode === 'signup' ? 'Create account' : 'Sign in'}
                  <ArrowRight size={16} />
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  className="font-bold text-zinc-900 underline decoration-zinc-900/20 underline-offset-4 hover:decoration-zinc-900 dark:text-white dark:decoration-white/20 dark:hover:decoration-white"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                    setError(null)
                  }}
                >
                  {mode === 'signin' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-zinc-400">Secure — your data is isolated per account.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
