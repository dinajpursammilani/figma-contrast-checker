import { supabase } from "./supabase"

export async function getProStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("is_pro").eq("id", userId).single()
  if (error) return false
  return data?.is_pro ?? false
}

/** Calls the polar-checkout Edge Function and opens the hosted checkout in a new browser tab —
 * Framer's plugin iframe can't host Polar's checkout inline. Pro status updates via webhook,
 * so it won't reflect until the plugin is reopened/reloaded after payment. */
export async function startCheckout(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("polar-checkout")
  if (error) throw new Error(error.message)
  if (!data?.url) throw new Error(data?.error ?? "Couldn't start checkout")
  window.open(data.url, "_blank")
}
