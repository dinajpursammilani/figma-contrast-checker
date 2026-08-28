// Receives Polar's webhook events and flips profiles.is_pro accordingly. Runs with the
// service role key so it can write is_pro/polar_customer_id, which regular users are not
// granted UPDATE on (see schema-profiles-pro.sql).
import { createClient } from "npm:@supabase/supabase-js@2"
import { Webhooks } from "jsr:@polar-sh/deno"

const POLAR_WEBHOOK_SECRET = Deno.env.get("POLAR_WEBHOOK_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function setPro(externalCustomerId: string | null | undefined, isPro: boolean, polarCustomerId?: string) {
  if (!externalCustomerId) {
    console.warn("Webhook event had no external_customer_id — can't match a Supabase user, skipping.")
    return
  }
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: isPro, ...(polarCustomerId ? { polar_customer_id: polarCustomerId } : {}) })
    .eq("id", externalCustomerId)

  if (error) console.error("Failed to update is_pro:", error.message)
}

const handler = Webhooks({
  webhookSecret: POLAR_WEBHOOK_SECRET,
  onOrderPaid: async (payload) => {
    const customer = payload.data.customer
    await setPro(customer?.externalId, true, customer?.id)
  },
  onSubscriptionActive: async (payload) => {
    const customer = payload.data.customer
    await setPro(customer?.externalId, true, customer?.id)
  },
  onSubscriptionCanceled: async (payload) => {
    const customer = payload.data.customer
    await setPro(customer?.externalId, false)
  },
  onSubscriptionRevoked: async (payload) => {
    const customer = payload.data.customer
    await setPro(customer?.externalId, false)
  },
})

Deno.serve(handler)
