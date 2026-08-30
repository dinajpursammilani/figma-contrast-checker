import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Framer's plugin iframe doesn't have a stable browser localStorage the way a normal
    // site does, so we manage session persistence ourselves via framer.setPluginData.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // PKCE needs to read back a "code verifier" it wrote to storage when the flow started —
    // but that write happens inside the plugin's iframe, whose storage is partitioned
    // separately from the popup tab that completes the exchange (different top-level site:
    // framer.com embedding vs. a direct top-level visit). That verifier is structurally
    // unreachable from the popup, so PKCE can't complete here. Implicit flow returns tokens
    // directly in the redirect URL instead, with no storage round-trip required.
    flowType: "implicit",
  },
})
