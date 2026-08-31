// Upserts catalog components sourced from a real Framer-designed project, instead of anyone
// hand-writing tsx_source. The plugin itself reads the currently-open project's components
// (framer.getNodesWithType("ComponentNode") — the regular Plugin API, not the newer/beta Server
// API) and POSTs them here; this function just validates the caller is an admin and writes the
// rows.
//
// Tier comes from a plain "pro-" / "free-" prefix on the component's own name (e.g.
// "pro-hero-banner"), not a "/" separator — "/" is Framer's own folder-nesting character, and
// using it in a component name caused renames to visually re-nest the component into folders in
// the Assets panel instead of behaving like a normal rename. A dash has no special meaning to
// Framer, so it doesn't have that side effect. No prefix at all defaults to Free. Category isn't
// parsed from the name at all — it defaults to "Components" and is set later in Edit Components;
// deriving it from the containing page was tried and live-disproven (getParent returns null for
// every Component — master components don't live under the page tree the way regular frames do).
//
// Older components synced before this existed may still use the "/" convention
// ("Pro/<Category>/<Name>") — still parsed here for backward compatibility.
//
// IMPORTANT: a re-sync must never clobber a manual correction made in Edit Components, but it
// also can't just freeze category/is_pro forever after first insert — that would block a
// legitimate signal change too (renaming a component to add "pro/", or moving it to a
// different page). tier_manually_set (schema-components-tier-override.sql) distinguishes the
// two: false means "still sync-derived, keep re-deriving it every sync"; true means "a human
// set this in Edit Components, stop touching it."
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

function parseName(rawName: string): { tier: "Pro" | "Free"; category: string; name: string } {
  const trimmed = rawName.trim()
  const lower = trimmed.toLowerCase()

  if (lower.startsWith("pro-") || lower.startsWith("free-")) {
    const tier: "Pro" | "Free" = lower.startsWith("pro-") ? "Pro" : "Free"
    const name = trimmed.slice(trimmed.indexOf("-") + 1).trim()
    return { tier, category: "Components", name: name || trimmed }
  }

  // Backward compatibility with the old "/" convention.
  const segments = trimmed.split("/").map((s) => s.trim()).filter(Boolean)
  const isPro = segments[0]?.toLowerCase() === "pro"
  const afterTier = isPro ? segments.slice(1) : segments
  const tier: "Pro" | "Free" = isPro ? "Pro" : "Free"

  if (afterTier.length >= 2) {
    return { tier, category: afterTier[0], name: afterTier.slice(1).join(" / ") }
  }
  return { tier, category: "Components", name: afterTier[0] ?? trimmed }
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
    const candidates: { id: string; name: string; module_url: string }[] = []

    for (const node of nodes) {
      if (!node?.insertURL || !node?.name) {
        skipped.push(node?.name ?? node?.componentIdentifier ?? "unnamed")
        continue
      }
      candidates.push({ id: node.componentIdentifier, name: node.name, module_url: node.insertURL })
    }

    const { data: existingRows, error: existingError } = await admin
      .from("components")
      .select("id, tier_manually_set")
      .in("id", candidates.length > 0 ? candidates.map((c) => c.id) : [""])
    if (existingError) throw existingError
    const existingById = new Map((existingRows ?? []).map((r) => [r.id, r]))

    const newRows = candidates
      .filter((c) => !existingById.has(c.id))
      .map((c) => {
        const { tier, category, name } = parseName(c.name)
        return { id: c.id, name, category, is_pro: tier === "Pro", module_url: c.module_url, sort_order: 0 }
      })
    const updateRows = candidates.filter((c) => existingById.has(c.id))

    if (newRows.length > 0) {
      const { error } = await admin.from("components").insert(newRows)
      if (error) throw error
    }
    for (const row of updateRows) {
      const existing = existingById.get(row.id)!
      const { name, category, tier } = parseName(row.name)
      const fields: Record<string, unknown> = { name, module_url: row.module_url }
      // Only re-derive category/is_pro if nobody has manually overridden them in Edit
      // Components — that override always wins over whatever Framer currently says.
      if (!existing.tier_manually_set) {
        fields.category = category
        fields.is_pro = tier === "Pro"
      }
      const { error } = await admin.from("components").update(fields).eq("id", row.id)
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
