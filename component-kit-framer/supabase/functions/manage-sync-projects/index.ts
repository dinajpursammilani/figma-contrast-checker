// Admin-managed allowlist of Framer project ids that "Sync from this project" is allowed to run
// from (see sync_allowed_projects, schema-sync-allowed-projects.sql). Lets an admin add/remove
// projects from Settings instead of editing a Supabase secret by hand. Same ADMIN_EMAILS auth
// pattern as the other admin-* functions.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase())

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

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json()

    if (body.action === "list") {
      const { data, error } = await admin.from("sync_allowed_projects").select("id, name").order("created_at")
      if (error) throw error
      return new Response(JSON.stringify({ projects: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "add") {
      if (!body.projectId || !body.projectName) throw new Error("Missing projectId or projectName")
      const { error } = await admin
        .from("sync_allowed_projects")
        .upsert({ id: body.projectId, name: body.projectName })
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "remove") {
      if (!body.projectId) throw new Error("Missing projectId")
      const { error } = await admin.from("sync_allowed_projects").delete().eq("id", body.projectId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    throw new Error(`Unknown action: ${body.action}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
