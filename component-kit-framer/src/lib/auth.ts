import { framer } from "@framer/plugin"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

const SESSION_KEY = "supabase-session"

/** Framer's setPluginData/getPluginData have been observed to hang indefinitely in some
 * plugin contexts instead of rejecting — this stops us waiting forever on them. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
}

/** Best-effort, non-blocking: login/logout should never hang waiting on this. */
function persistSessionInBackground(session: Session | null) {
  const value = session ? JSON.stringify(session) : null
  withTimeout(framer.setPluginData(SESSION_KEY, value), 3000, undefined).catch((err) => {
    console.warn("Failed to persist session:", err)
  })
}

/** Call once on plugin startup: restores a saved session, if any, into the Supabase client. */
export async function restoreSession(): Promise<User | null> {
  const raw = await withTimeout(framer.getPluginData(SESSION_KEY), 3000, null)
  if (!raw) return null

  try {
    const session: Session = JSON.parse(raw)
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error || !data.session) {
      persistSessionInBackground(null)
      return null
    }
    // The SDK may have refreshed the token — persist the current version.
    persistSessionInBackground(data.session)
    return data.user
  } catch {
    persistSessionInBackground(null)
    return null
  }
}

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { user: null, error: error.message }
  if (data.session) persistSessionInBackground(data.session)
  return { user: data.user, error: null }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { user: null, error: error.message }
  persistSessionInBackground(data.session)
  return { user: data.user, error: null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  persistSessionInBackground(null)
}
