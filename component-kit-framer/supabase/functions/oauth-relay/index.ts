// Hands the Google OAuth session from the callback tab back to the plugin iframe — not via
// any browser cross-context API (window.opener, BroadcastChannel), both of which turned out to
// be partitioned separately for a top-level tab vs. an iframe embedded under a different site
// (framer.com). A relayId is generated client-side (an unguessable UUID) before the OAuth
// popup opens; the callback tab stores the tokens under it, and the plugin polls for them —
// same "poll after a separate tab does its thing" shape already used for Polar checkout.
// Deliberately unauthenticated: knowledge of the relayId is the credential (nothing useful can
// be done with it before the tokens are stored, and the row is deleted the instant it's
// fetched), backstopped by a short TTL.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RELAY_TTL_MS = 2 * 60 * 1000

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, relayId } = body
    if (typeof relayId !== "string" || relayId.length < 10) throw new Error("Missing or invalid relayId")

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (action === "store") {
      const { accessToken, refreshToken } = body
      if (!accessToken || !refreshToken) throw new Error("Missing tokens")
      const { error } = await admin.from("oauth_relay").insert({
        id: relayId,
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "fetch") {
      const { data: row } = await admin.from("oauth_relay").select("*").eq("id", relayId).single()
      // Single-use: delete on first read whether or not it's still fresh, so a leaked relayId
      // is worthless after the real poller consumes it.
      if (row) await admin.from("oauth_relay").delete().eq("id", relayId)

      if (!row || Date.now() - new Date(row.created_at).getTime() > RELAY_TTL_MS) {
        return new Response(JSON.stringify({ ready: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      return new Response(
        JSON.stringify({ ready: true, accessToken: row.access_token, refreshToken: row.refresh_token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Relay error"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
