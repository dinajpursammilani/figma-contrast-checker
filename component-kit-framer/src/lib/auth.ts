import { framer } from "@framer/plugin"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

const SESSION_KEY = "supabase-session"

async function persistSession(session: Session | null) {
  if (session) {
    await framer.setPluginData(SESSION_KEY, JSON.stringify(session))
  } else {
    await framer.setPluginData(SESSION_KEY, null)
  }
}

/** Call once on plugin startup: restores a saved session, if any, into the Supabase client. */
export async function restoreSession(): Promise<User | null> {
  const raw = await framer.getPluginData(SESSION_KEY)
  if (!raw) return null

  try {
    const session: Session = JSON.parse(raw)
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error || !data.session) {
      await persistSession(null)
      return null
    }
    // The SDK may have refreshed the token — persist the current version.
    await persistSession(data.session)
    return data.user
  } catch {
    await persistSession(null)
    return null
  }
}

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { user: null, error: error.message }
  if (data.session) await persistSession(data.session)
  return { user: data.user, error: null }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { user: null, error: error.message }
  await persistSession(data.session)
  return { user: data.user, error: null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  await persistSession(null)
}
