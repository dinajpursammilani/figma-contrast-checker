import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

export async function getProStatus(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase.from("profiles").select("is_pro").eq("id", user.id).single()
  if (error) return false
  return data?.is_pro ?? false
}

/** Calls the polar-checkout Edge Function and opens the hosted checkout in a new browser tab —
 * Framer's plugin iframe can't host Polar's checkout inline. Pro status updates via webhook,
 * so it won't reflect until the plugin is reopened/reloaded after payment.
 *
 * Returns the checkout URL so the caller can show a manual "click here" fallback — window.open
 * can be silently blocked by a popup blocker, or the tab can just get lost/closed by accident,
 * with nothing telling the user why nothing happened. */
export async function startCheckout(): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("polar-checkout")
  if (error) throw new Error(await describeFunctionError(error))
  if (!data?.url) throw new Error(data?.error ?? "Couldn't start checkout")
  window.open(data.url, "_blank")
  return data.url
}
