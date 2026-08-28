// Creates a Polar checkout session for the calling user and returns its hosted URL.
// The plugin opens that URL in a new browser tab (Framer's iframe can't host checkout inline).
import { createClient } from "npm:@supabase/supabase-js@2"
import { Polar } from "npm:@polar-sh/sdk"
import { corsHeaders } from "../_shared/cors.ts"

const POLAR_ACCESS_TOKEN = Deno.env.get("POLAR_ACCESS_TOKEN")!
const POLAR_PRODUCT_ID = Deno.env.get("POLAR_PRODUCT_ID")!
const POLAR_SUCCESS_URL = Deno.env.get("POLAR_SUCCESS_URL") ?? "https://polar.sh/"
const POLAR_SERVER = Deno.env.get("POLAR_SERVER") ?? "sandbox" // "sandbox" while testing, "production" once live

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing Authorization header")

    // Verify the caller's own Supabase session token (not a service role key) so we know who
    // to attach the checkout to — never trust a user_id passed in the request body.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error("Not authenticated")

    const polar = new Polar({ accessToken: POLAR_ACCESS_TOKEN, server: POLAR_SERVER as "sandbox" | "production" })

    const checkout = await polar.checkouts.create({
      products: [POLAR_PRODUCT_ID],
      successUrl: POLAR_SUCCESS_URL,
      externalCustomerId: user.id,
    })

    return new Response(JSON.stringify({ url: checkout.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't start checkout"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
