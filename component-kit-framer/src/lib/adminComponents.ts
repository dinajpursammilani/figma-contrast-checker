import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

async function callAdminUpdate(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    "admin-update-component",
    { body }
  )
  if (error) throw new Error(await describeFunctionError(error))
  if (!data?.ok) throw new Error(data?.error ?? "Update failed")
}

export async function updateComponentFields(
  componentId: string,
  fields: { name?: string; category?: string; is_pro?: boolean }
): Promise<void> {
  await callAdminUpdate({ action: "update", componentId, ...fields })
}

export async function deleteComponentPreviewImage(componentId: string): Promise<void> {
  await callAdminUpdate({ action: "delete_image", componentId })
}

/** Undoes the "manually set" lock from updateComponentFields — the next sync will go back to
 * re-deriving category/is_pro from Framer's own naming instead of leaving them frozen. */
export async function resetComponentTierOverride(componentId: string): Promise<void> {
  await callAdminUpdate({ action: "reset_tier_override", componentId })
}

/** Removes a component from the catalog entirely (and its preview image, if any). Doesn't touch
 * the actual Component in Framer — if it's still there, a future sync will re-add it. */
export async function deleteComponent(componentId: string): Promise<void> {
  await callAdminUpdate({ action: "delete_component", componentId })
}
