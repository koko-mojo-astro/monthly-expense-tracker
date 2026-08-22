import { useState, type FormEvent } from 'react'
import { Loader2, Wallet } from 'lucide-react'
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
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 via-zinc-100 to-teal-50 p-4 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md">
            <Wallet size={24} strokeWidth={2.2} />
          </span>
          <h1 className="text-xl font-bold tracking-tight">Mojo Money</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Track spending, hit savings goals.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <Button
            type="button"
            variant="subtle"
            className="w-full"
            disabled={busy !== 'none'}
            onClick={() => void run(signInWithGoogle, 'google')}
          >
            {busy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            or with email
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={submitEmail} className="space-y-3">
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
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy !== 'none'} className="w-full">
              {busy === 'email' && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
