// Posts a Discord message whenever a new user signs up (auth.users insert). Triggered by the
// on_auth_user_created_notify_discord Postgres trigger (see schema-full.sql) via
// supabase_functions.http_request — not called by the plugin client at all. Authorization here
// is a shared secret header, not a Supabase JWT (see config.toml), since the caller is Postgres
// itself, same shape as polar-webhook verifying Polar's own signature instead of a JWT.
import { corsHeaders } from "../_shared/cors.ts"

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")!
const WEBHOOK_SHARED_SECRET = Deno.env.get("NEW_USER_WEBHOOK_SECRET")!

interface AuthUserRow {
  email?: string
  created_at?: string
  raw_user_meta_data?: { full_name?: string; name?: string; avatar_url?: string; picture?: string }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  // Anyone who discovers this function's URL could otherwise spam fake "new user" messages into
  // the client's Discord — this header is the only thing standing in for "request actually came
  // from our own database trigger."
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const body = await req.json()
    const user = (body.record ?? {}) as AuthUserRow
    const email = user.email ?? "unknown email"
    const name = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || null
    const avatarUrl = user.raw_user_meta_data?.avatar_url || user.raw_user_meta_data?.picture || undefined

    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New Skela user 🎉",
            description: name ? `**${name}**\n${email}` : email,
            color: 0xe4572e,
            thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
            timestamp: user.created_at ?? new Date().toISOString(),
          },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Discord responded ${res.status}: ${await res.text()}`)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to notify Discord"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
