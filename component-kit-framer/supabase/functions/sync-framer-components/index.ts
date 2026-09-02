// Reads catalog components from a real Framer-designed project and stages them into
// components_staging for review — NOT the live components table users actually see. A sync bug
// or a component mis-tagged Free/Pro used to go live to every user the instant sync ran; now an
// admin has to explicitly review and import each row (see import-staged-components) before it's
// ever visible in the plugin. The plugin itself reads the currently-open project's components
// (framer.getNodesWithType("ComponentNode") — the regular Plugin API, not the newer/beta Server
// API) and POSTs them here; this function just validates the caller is an admin and stages the
// rows.
//
// Tier comes from a plain "pro-" / "free-" prefix on the component's own name (e.g.
// "pro-hero-banner"), not a "/" separator — "/" is Framer's own folder-nesting character, and
// using it in a component name caused renames to visually re-nest the component into folders in
// the Assets panel instead of behaving like a normal rename. A dash has no special meaning to
// Framer, so it doesn't have that side effect. No prefix at all defaults to Free. Category isn't
// parsed from the name at all — it defaults to "Components" and is set later in Edit Components
// or Review Sync; deriving it from the containing page was tried and live-disproven (getParent
// returns null for every Component — master components don't live under the page tree the way
// regular frames do).
//
// Older components synced before this existed may still use the "/" convention
// ("Pro/<Category>/<Name>") — still parsed here for backward compatibility.
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

    const { nodes, projectId, projectName } = await req.json()
    if (!Array.isArray(nodes)) throw new Error("Expected { nodes: [...] }")

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Admin-managed allowlist (sync_allowed_projects, editable from Settings) — guards against an
    // admin account accidentally running Sync from the wrong Framer project (a personal test
    // file, a client demo copy) and polluting the shared catalog. An empty allowlist means
    // unrestricted, so this doesn't lock anyone out before any project has been added.
    const { count: allowedCount, error: allowedError } = await admin
      .from("sync_allowed_projects")
      .select("id", { count: "exact", head: true })
    if (allowedError) throw allowedError
    if ((allowedCount ?? 0) > 0) {
      const { data: allowedRow } = await admin.from("sync_allowed_projects").select("id").eq("id", projectId).maybeSingle()
      if (!allowedRow) {
        return new Response(
          JSON.stringify({ error: `"${projectName ?? "This project"}" isn't an allowed source project for the catalog — sync refused.` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }
    const skipped: string[] = []
    const stagedRows: { id: string; name: string; category: string; is_pro: boolean; module_url: string; synced_at: string }[] = []

    const now = new Date().toISOString()
    for (const node of nodes) {
      if (!node?.insertURL || !node?.name) {
        skipped.push(node?.name ?? node?.componentIdentifier ?? "unnamed")
        continue
      }
      const { tier, category, name } = parseName(node.name)
      stagedRows.push({
        id: node.componentIdentifier,
        name,
        category,
        is_pro: tier === "Pro",
        module_url: node.insertURL,
        synced_at: now,
      })
    }

    if (stagedRows.length > 0) {
      const { error } = await admin.from("components_staging").upsert(stagedRows)
      if (error) throw error
    }

    return new Response(JSON.stringify({ staged: stagedRows.length, skipped, projectId, projectName }), {
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
