// Admin-only edits to a catalog component: rename, recategorize, change tier, or clear its
// preview image. Same ADMIN_EMAILS auth pattern as sync-framer-components and
// upload-component-preview.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase())
const BUCKET = "component-previews"

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
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Not an admin account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { action, componentId } = body
    if (!componentId) throw new Error("Missing componentId")

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (action === "update") {
      const fields: Record<string, unknown> = {}
      if (typeof body.name === "string") fields.name = body.name.trim()
      if (typeof body.category === "string") fields.category = body.category.trim()
      if (typeof body.is_pro === "boolean") fields.is_pro = body.is_pro
      if (Object.keys(fields).length === 0) throw new Error("Nothing to update")
      // A human explicitly setting tier/category here means future syncs should stop
      // re-deriving those fields for this component — this edit wins from now on.
      if ("category" in fields || "is_pro" in fields) fields.tier_manually_set = true

      const { error } = await admin.from("components").update(fields).eq("id", componentId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "reset_tier_override") {
      // Undoes the "manually set" lock from the update action above — the next sync will go
      // back to re-deriving category/is_pro from Framer's own "/" naming again.
      const { error } = await admin.from("components").update({ tier_manually_set: false }).eq("id", componentId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "delete_image") {
      // Best-effort cleanup — try every plausible extension, ignore misses. Not knowing the
      // exact stored extension here (only the componentId) is an acceptable tradeoff for how
      // rarely this runs.
      await Promise.all(
        ["png", "jpg", "webp", "gif"].map((ext) => admin.storage.from(BUCKET).remove([`${componentId}.${ext}`]))
      )
      const { error } = await admin.from("components").update({ preview_image_url: null }).eq("id", componentId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "delete_component") {
      // Best-effort cleanup of its preview image before removing the row — same
      // don't-know-the-exact-extension tradeoff as delete_image above.
      await Promise.all(
        ["png", "jpg", "webp", "gif"].map((ext) => admin.storage.from(BUCKET).remove([`${componentId}.${ext}`]))
      )
      const { error } = await admin.from("components").delete().eq("id", componentId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
