import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { saveFullName } from "./profile"

const SESSION_KEY = "skela-supabase-session"
const AUTH_TIMEOUT_MS = 10000

// localStorage, not framer.setPluginData: that API is project-level storage shared between
// every collaborator on the project (confirmed against Framer's own docs, which explicitly
// warn against using it for exactly this — access tokens). It was also the reason sessions
// weren't surviving reopening the plugin at all: project-scoped data doesn't follow "the same
// person, any project" the way a login session needs to. localStorage is per-plugin-origin and
// private to this browser/user, which is what an auth session actually needs.
function persistSessionInBackground(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch (err) {
    console.warn("Failed to persist session:", err)
  }
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
  let raw: string | null
  try {
    raw = localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
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
 * iframe) — returns the OAuth URL to open in a separate tab instead, plus a relayId the caller
 * polls the oauth-relay Edge Function with. Not window.opener/BroadcastChannel: both turned out
 * to be partitioned separately for this iframe vs. the popup tab, so a server-side relay is the
 * only thing that actually crosses that boundary. See OAuthCallback.tsx for the other side. */
export async function signInWithGoogle(): Promise<{ url: string | null; relayId: string; error: string | null }> {
  const relayId = crypto.randomUUID()
  const { data, error } = await withAuthTimeout(
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { skipBrowserRedirect: true, redirectTo: `${window.location.origin}/?relay=${relayId}` },
    })
  )
  if (error) return { url: null, relayId, error: error.message }
  return { url: data.url, relayId, error: null }
}

/** Polls the oauth-relay Edge Function until the callback tab has stored the session under
 * relayId (or times out) — same shape as refetching Pro status on refocus after Polar
 * checkout, just polled directly since there's no "switch back to Framer" moment to hook. */
export async function pollGoogleRelay(relayId: string, timeoutMs = 90000): Promise<{ user: User | null; error: string | null }> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { data, error } = await supabase.functions.invoke<{
      ready: boolean
      accessToken?: string
      refreshToken?: string
      error?: string
    }>("oauth-relay", { body: { action: "fetch", relayId } })

    if (!error && data?.ready && data.accessToken && data.refreshToken) {
      return completeGoogleSignIn(data.accessToken, data.refreshToken)
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  return { user: null, error: "Timed out waiting for Google sign-in — try again." }
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
