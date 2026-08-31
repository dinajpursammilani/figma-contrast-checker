import { supabase } from "./supabase"

async function callAdminUpdate(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    "admin-update-component",
    { body }
  )
  if (error) throw new Error(error.message)
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
