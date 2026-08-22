export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists — try signing in instead.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google popup. Allow popups and try again.'
    case 'auth/unauthorized-domain':
      return 'This site isn’t authorized for Google sign-in yet. Add it under Firebase Console → Authentication → Settings → Authorized domains.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase Console → Authentication → Sign-in method.'
    case 'auth/admin-restricted-operation':
      return 'Sign-ups are restricted for this project.'
    default:
      return (error as Error)?.message || 'Something went wrong. Please try again.'
  }
}
