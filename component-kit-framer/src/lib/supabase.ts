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
  },
})
