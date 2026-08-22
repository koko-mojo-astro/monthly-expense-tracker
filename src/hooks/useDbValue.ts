import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db } from '../firebase'

export interface DbValue<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Subscribes to a Realtime Database path and keeps local state in sync. */
export function useDbValue<T>(path: string): DbValue<T> {
  const [state, setState] = useState<DbValue<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, path),
      (snapshot) => {
        setState({ data: snapshot.val() as T | null, loading: false, error: null })
      },
      (err) => {
        const code = (err as unknown as { code?: string }).code
        setState((s) => ({ ...s, loading: false, error: code || err.message }))
      },
    )
    return unsubscribe
  }, [path])

  return state
}
