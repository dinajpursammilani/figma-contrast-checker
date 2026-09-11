// Admin-only edit of the single app_settings row. Two fields, two different permission levels:
//   - pro_available: ADMIN_EMAILS (same list as the other admin-* functions)
//   - ui_opacity: SUPER_ADMIN_EMAILS only — stricter list, same one delete_component in
//     admin-update-component checks. Rejects the whole request if a caller sends a field they
//     aren't allowed to touch, rather than silently dropping it.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase())
const SUPER_ADMIN_EMAILS = (Deno.env.get("SUPER_ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase())

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing Authorization header")

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user?.email) throw new Error("Not authenticated")
    const email = user.email.toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) {
      return new Response(JSON.stringify({ error: "Not an admin account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const fields: Record<string, unknown> = {}

    if ("proAvailable" in body) {
      if (typeof body.proAvailable !== "boolean") throw new Error("proAvailable must be a boolean")
      fields.pro_available = body.proAvailable
    }

    if ("uiOpacity" in body) {
      if (!SUPER_ADMIN_EMAILS.includes(email)) {
        return new Response(JSON.stringify({ error: "Not a super admin account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const opacity = body.uiOpacity
      if (typeof opacity !== "number" || !Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
        throw new Error("uiOpacity must be a number between 0 and 1")
      }
      fields.ui_opacity = opacity
    }

    if (Object.keys(fields).length === 0) throw new Error("Nothing to update")
    fields.updated_at = new Date().toISOString()

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await admin.from("app_settings").update(fields).eq("id", "global")
    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
