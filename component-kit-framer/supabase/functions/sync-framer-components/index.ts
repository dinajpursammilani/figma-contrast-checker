// Pulls every real Framer-designed component out of Dominik's own Framer project (via the
// Server API — a project-scoped API key, not the plugin API) and upserts them into the
// components table, instead of anyone hand-writing tsx_source. Dominik never touches code:
// he designs a component visually, names it "Free/<Category>/<Name>" or "Pro/<Category>/<Name>"
// (Framer's own "/" folder-naming convention, same one used for text/color styles), and the
// next sync picks it up automatically.
//
// IMPORTANT tradeoff, not an oversight: a Module URL is portable by design (Framer's own docs
// call this out) — once a URL is in our database, anyone who obtains it can insert it in any
// project, tier flag or not. There is no way to gate insertion server-side the way
// get-component-source gates tsx_source. Treat "Pro" here as a soft/organizational label, not
// real protection — don't put anything behind it you'd be upset to see leaked.
import { createClient } from "npm:@supabase/supabase-js@2"
import { connect } from "npm:framer-api"
import { corsHeaders } from "../_shared/cors.ts"

const FRAMER_PROJECT_URL = Deno.env.get("FRAMER_PROJECT_URL")!
const FRAMER_API_KEY = Deno.env.get("FRAMER_API_KEY")!
const ADMIN_SYNC_SECRET = Deno.env.get("ADMIN_SYNC_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

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
    if (req.headers.get("x-admin-key") !== ADMIN_SYNC_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const framer = await connect(FRAMER_PROJECT_URL, FRAMER_API_KEY)
    let nodes
    try {
      nodes = await framer.getNodesWithType("ComponentNode")
    } finally {
      await framer.disconnect()
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const skipped: string[] = []
    const rows = []

    for (const node of nodes) {
      if (!node.insertURL || !node.name) {
        skipped.push(node.name ?? node.componentIdentifier)
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
