import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

export interface Pricing {
  amountCents: number
  currency: string
}

/** Reads the current Pro price. Public — anyone signed in can see it (they need to, to decide
 * whether to upgrade), but only admin-update-pricing (service role) can change it. */
export async function fetchPricing(): Promise<Pricing> {
  const { data, error } = await supabase.from("pricing").select("amount_cents, currency").eq("id", "pro").single()
  if (error || !data) throw new Error(error?.message ?? "Couldn't load pricing")
  return { amountCents: data.amount_cents, currency: data.currency }
}

export async function updatePricing(amountCents: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("admin-update-pricing", {
    body: { amountCents },
  })
  if (error) throw new Error(await describeFunctionError(error))
  if (!data?.ok) throw new Error(data?.error ?? "Update failed")
}

/** "8900" cents, "usd" → "$89". Whole-dollar prices only (this app doesn't need cents
 * precision in the display), formatted via Intl so the currency symbol is always correct. */
export function formatPrice({ amountCents, currency }: Pricing): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100)
}
