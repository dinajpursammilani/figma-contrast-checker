// Returns a component's tsx_source — gated server-side so a free user can't read a Pro
// component's source just by inspecting network traffic. The components table itself also
// revokes client SELECT on tsx_source (schema-components-lock-source.sql); this function uses
// the service role to read it, and only hands it back after checking profiles.is_pro.
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing Authorization header")

    const { componentId } = await req.json()
    if (!componentId) throw new Error("Missing componentId")

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) throw new Error("Not authenticated")

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: component, error: componentError } = await admin
      .from("components")
      .select("tsx_source, file_name, is_pro")
      .eq("id", componentId)
      .single()
    if (componentError || !component) throw new Error("Component not found")

    if (component.is_pro) {
      const { data: profile } = await admin.from("profiles").select("is_pro").eq("id", user.id).single()
      if (!profile?.is_pro) {
        return new Response(JSON.stringify({ error: "Pro plan required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    return new Response(JSON.stringify({ tsx_source: component.tsx_source, file_name: component.file_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load component"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
