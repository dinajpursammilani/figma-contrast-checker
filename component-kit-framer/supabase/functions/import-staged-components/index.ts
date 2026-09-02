// Manages the review queue between sync-framer-components and the live components table (see
// components_staging in schema-full.sql). Actions:
//   - list: every staged row, each flagged with whether it already exists live and whether
//     that live row is tier_manually_set-locked — Review Sync uses this to show "new" vs
//     "existing" vs "locked" badges.
//   - update: an admin corrects a staged row's category/is_pro before importing it — catches a
//     sync mis-tag before it ever goes live, which is the whole point of this queue existing.
//   - discard: drops a staged row without importing it (e.g. a test component that shouldn't
//     be in the catalog at all).
//   - import: the actual promotion into components. For each requested id (or every staged
//     row, if ids is "all"): if a live row already exists AND is tier_manually_set, only
//     name/module_url are updated — the manual override on category/is_pro always wins over
//     whatever's staged. Otherwise the staged category/is_pro/name/module_url fully replace the
//     live row (or create it, for a brand-new component). Either way updated_at is stamped and
//     the row is removed from staging once imported.
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
      const { data: staged, error: stagedError } = await admin
        .from("components_staging")
        .select("id, name, category, is_pro, module_url, synced_at")
        .order("synced_at", { ascending: false })
      if (stagedError) throw stagedError

      const ids = (staged ?? []).map((r) => r.id)
      const { data: liveRows, error: liveError } = await admin
        .from("components")
        .select("id, category, is_pro, tier_manually_set")
        .in("id", ids.length > 0 ? ids : [""])
      if (liveError) throw liveError
      const liveById = new Map((liveRows ?? []).map((r) => [r.id, r]))

      const rows = (staged ?? []).map((s) => {
        const live = liveById.get(s.id)
        return {
          ...s,
          status: live ? "existing" : "new",
          locked: live?.tier_manually_set ?? false,
          liveCategory: live?.category ?? null,
          liveIsPro: live?.is_pro ?? null,
        }
      })

      return new Response(JSON.stringify({ rows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "update") {
      const { id, category, is_pro } = body
      if (!id) throw new Error("Missing id")
      const fields: Record<string, unknown> = {}
      if (typeof category === "string") fields.category = category.trim()
      if (typeof is_pro === "boolean") fields.is_pro = is_pro
      if (Object.keys(fields).length === 0) throw new Error("Nothing to update")

      const { error } = await admin.from("components_staging").update(fields).eq("id", id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "discard") {
      const { id } = body
      if (!id) throw new Error("Missing id")
      const { error } = await admin.from("components_staging").delete().eq("id", id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "import") {
      const { ids } = body
      let query = admin.from("components_staging").select("id, name, category, is_pro, module_url")
      if (ids !== "all") {
        if (!Array.isArray(ids) || ids.length === 0) throw new Error("Expected ids: string[] or 'all'")
        query = query.in("id", ids)
      }
      const { data: toImport, error: fetchError } = await query
      if (fetchError) throw fetchError
      if (!toImport || toImport.length === 0) {
        return new Response(JSON.stringify({ imported: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: existingRows, error: existingError } = await admin
        .from("components")
        .select("id, tier_manually_set")
        .in("id", toImport.map((r) => r.id))
      if (existingError) throw existingError
      const existingById = new Map((existingRows ?? []).map((r) => [r.id, r]))

      const now = new Date().toISOString()
      for (const row of toImport) {
        const existing = existingById.get(row.id)
        const fields: Record<string, unknown> = {
          id: row.id,
          name: row.name,
          module_url: row.module_url,
          updated_at: now,
        }
        // A manual override in Edit Components always wins over whatever's staged — only
        // name/module_url (never tier/category) get refreshed for a locked row.
        if (!existing?.tier_manually_set) {
          fields.category = row.category
          fields.is_pro = row.is_pro
        }
        if (!existing) {
          fields.category = row.category
          fields.is_pro = row.is_pro
          fields.sort_order = 0
        }
        const { error } = await admin.from("components").upsert(fields)
        if (error) throw error
      }

      const { error: deleteError } = await admin
        .from("components_staging")
        .delete()
        .in("id", toImport.map((r) => r.id))
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ imported: toImport.length }), {
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
