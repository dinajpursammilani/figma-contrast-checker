// Upserts catalog components sourced from a real Framer-designed project, instead of anyone
// hand-writing tsx_source. The plugin itself reads the currently-open project's components
// (framer.getNodesWithType("ComponentNode") — the regular Plugin API, not the newer/beta Server
// API) and POSTs them here; this function just validates the caller is an admin and writes the
// rows. Dominik never touches code: he designs a component visually, names it
// "Free/<Category>/<Name>" or "Pro/<Category>/<Name>" (Framer's own "/" folder-naming
// convention, same one used for text/color styles), opens that project with the Skela plugin,
// and hits Sync.
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
  const segments = rawName.split("/").map((s) => s.trim()).filter(Boolean)
  const [first, ...rest] = segments
  const tier: "Pro" | "Free" = first?.toLowerCase() === "pro" ? "Pro" : "Free"
  const afterTier = first?.toLowerCase() === "pro" || first?.toLowerCase() === "free" ? rest : segments

  if (afterTier.length >= 2) {
    return { tier, category: afterTier[0], name: afterTier.slice(1).join(" / ") }
  }
  return { tier, category: "Components", name: afterTier[0] ?? rawName }
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
    const rows = []

    for (const node of nodes) {
      if (!node?.insertURL || !node?.name) {
        skipped.push(node?.name ?? node?.componentIdentifier ?? "unnamed")
        continue
      }
      const { tier, category, name } = parseName(node.name)
      rows.push({
        id: node.componentIdentifier,
        name,
        category,
        is_pro: tier === "Pro",
        module_url: node.insertURL,
        sort_order: 0,
      })
    }

    if (rows.length > 0) {
      const { error } = await admin.from("components").upsert(rows, { onConflict: "id" })
      if (error) throw error
    }

    return new Response(JSON.stringify({ synced: rows.length, skipped }), {
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
