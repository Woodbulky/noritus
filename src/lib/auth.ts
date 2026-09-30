import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Optional Google sign-in. Identity only: nothing here ever sees a file.
 * supabase-js is loaded on the first click of "Sign in", or when a session
 * already exists, so signed-out visitors never download it.
 */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const authConfigured = Boolean(URL_ && KEY)

let client: Promise<SupabaseClient> | undefined
const getClient = () =>
  (client ??= import('@supabase/supabase-js').then((m) => m.createClient(URL_!, KEY!)))

/** A stored session, or an OAuth redirect landing on this page. */
export function hasSession() {
  if (!authConfigured) return false
  if (/access_token=|[?&]code=/.test(location.hash + location.search)) return true
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

/** Calls `cb` with the current user now and on every change. Returns an unsubscribe. */
export async function watchUser(cb: (user: User | null) => void) {
  const sb = await getClient()
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

/** Redirects to Google. Throws if Supabase is unreachable (e.g. a paused free-tier project). */
export async function signIn() {
  const health = await fetch(`${URL_}/auth/v1/health`, { headers: { apikey: KEY! } }).catch(() => null)
  if (!health?.ok) throw new Error('auth unavailable')
  const sb = await getClient()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  })
  if (error) throw error
}

export async function signOut() {
  await (await getClient()).auth.signOut()
}
