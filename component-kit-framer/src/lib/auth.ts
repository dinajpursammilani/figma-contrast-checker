import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { getData, setDataInBackground } from "./pluginStorage"
import { saveFullName } from "./profile"

const SESSION_KEY = "supabase-session"
const AUTH_TIMEOUT_MS = 10000

function persistSessionInBackground(session: Session | null) {
  setDataInBackground(SESSION_KEY, session ? JSON.stringify(session) : null)
}

/** Guards against a genuine network-level hang, not just an unexpected throw — a stuck login
 * button is worse than a clear "request timed out" error the user can retry. */
function withAuthTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out — check your connection and try again.")), AUTH_TIMEOUT_MS)
    ),
  ])
}

/** Call once on plugin startup: restores a saved session, if any, into the Supabase client. */
export async function restoreSession(): Promise<User | null> {
  const raw = await getData(SESSION_KEY)
  if (!raw) return null

  try {
    const session: Session = JSON.parse(raw)
    const { data, error } = await withAuthTimeout(
      supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    )
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

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await withAuthTimeout(supabase.auth.signUp({ email, password }))
  if (error) return { user: null, error: error.message }
  if (data.session) persistSessionInBackground(data.session)
  // The profiles row is created by a DB trigger the instant auth.users gets the new row, so
  // it already exists here — safe to save the name right away, no race condition.
  if (data.user) await saveFullName(data.user.id, fullName)
  return { user: data.user, error: null }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await withAuthTimeout(supabase.auth.signInWithPassword({ email, password }))
  if (error) return { user: null, error: error.message }
  persistSessionInBackground(data.session)
  return { user: data.user, error: null }
}

/** Starts Google sign-in without navigating this page away (we're inside Framer's plugin
 * iframe) — returns the OAuth URL to open in a separate tab instead. See OAuthCallback.tsx for
 * how that tab hands the resulting session back to us. */
export async function signInWithGoogle(): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await withAuthTimeout(
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { skipBrowserRedirect: true, redirectTo: window.location.origin },
    })
  )
  if (error) return { url: null, error: error.message }
  return { url: data.url, error: null }
}

/** Called once the OAuth callback tab posts back a session — completes sign-in on this (the
 * plugin's own) Supabase client instance, same as a normal email/password login from here on. */
export async function completeGoogleSignIn(
  accessToken: string,
  refreshToken: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await withAuthTimeout(
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  )
  if (error) return { user: null, error: error.message }
  persistSessionInBackground(data.session)
  return { user: data.user, error: null }
}

export async function signOut(): Promise<void> {
  await withAuthTimeout(supabase.auth.signOut())
  persistSessionInBackground(null)
}
