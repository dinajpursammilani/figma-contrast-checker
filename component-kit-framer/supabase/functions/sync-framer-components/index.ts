// Upserts catalog components sourced from a real Framer-designed project, instead of anyone
// hand-writing tsx_source. The plugin itself reads the currently-open project's components
// (framer.getNodesWithType("ComponentNode") — the regular Plugin API, not the newer/beta Server
// API) and POSTs them here; this function just validates the caller is an admin and writes the
// rows.
//
// Deliberately asks nothing of whoever's designing: no naming convention required. Category
// comes from whichever page the component actually lives on (lib/sync.ts resolves this via
// getParent and sends it as pageName); tier always defaults to Free. The one optional escape
// hatch: naming a component "Pro/<Name>" still marks it Pro at sync time, for anyone who wants
// to signal that from Framer directly. Otherwise, tier/category live entirely in our own
// catalog and get corrected via Edit Components, not by touching Framer.
//
// IMPORTANT: a re-sync must never clobber a manual correction made in Edit Components — a
// component that already exists in the catalog only gets its name/module_url refreshed here;
// category and is_pro are only ever *set* on first insert, never overwritten by a later sync.
//
// IMPORTANT tradeoff, not an oversight: a Module URL is portable by design (Framer's own docs
// call this out) — once a URL is in our database, anyone who obtains it can insert it in any
// project, tier flag or not. There is no way to gate insertion server-side the way
// get-component-source gates tsx_source. Treat "Pro" here as a soft/organizational label, not
// real protection — don't put anything behind it you'd be upset to see leaked.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// Comma-separated allowlist — anyone signed into the plugin with one of these emails can sync
// components into the shared catalog. Set via `supabase secrets set ADMIN_EMAILS=...`.
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((e) => e.trim().toLowerCase())

function parseNew(rawName: string, pageName: string | null): { tier: "Pro" | "Free"; category: string; name: string } {
  // Only a leading "Pro/" is a recognized signal — everything else about the name is left
  // exactly as the designer wrote it, no forced structure.
  const isPro = /^pro\//i.test(rawName.trim())
  const name = isPro ? rawName.trim().replace(/^pro\//i, "").trim() : rawName.trim()
  return { tier: isPro ? "Pro" : "Free", category: pageName?.trim() || "Components", name: name || rawName }
}

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

    const { nodes } = await req.json()
    if (!Array.isArray(nodes)) throw new Error("Expected { nodes: [...] }")

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const skipped: string[] = []
    const candidates: { id: string; name: string; module_url: string; pageName: string | null }[] = []

    for (const node of nodes) {
      if (!node?.insertURL || !node?.name) {
        skipped.push(node?.name ?? node?.componentIdentifier ?? "unnamed")
        continue
      }
      candidates.push({
        id: node.componentIdentifier,
        name: node.name,
        module_url: node.insertURL,
        pageName: typeof node.pageName === "string" ? node.pageName : null,
      })
    }

    const { data: existingRows, error: existingError } = await admin
      .from("components")
      .select("id")
      .in("id", candidates.length > 0 ? candidates.map((c) => c.id) : [""])
    if (existingError) throw existingError
    const existingIds = new Set((existingRows ?? []).map((r) => r.id))

    const newRows = candidates
      .filter((c) => !existingIds.has(c.id))
      .map((c) => {
        const { tier, category, name } = parseNew(c.name, c.pageName)
        return { id: c.id, name, category, is_pro: tier === "Pro", module_url: c.module_url, sort_order: 0 }
      })
    const updateRows = candidates.filter((c) => existingIds.has(c.id))

    if (newRows.length > 0) {
      const { error } = await admin.from("components").insert(newRows)
      if (error) throw error
    }
    // Existing rows only get name/module_url refreshed — category and is_pro are left alone so
    // a re-sync can never undo a correction made in Edit Components.
    for (const row of updateRows) {
      const { name } = parseNew(row.name, row.pageName)
      const { error } = await admin.from("components").update({ name, module_url: row.module_url }).eq("id", row.id)
      if (error) throw error
    }

    return new Response(JSON.stringify({ synced: candidates.length, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
