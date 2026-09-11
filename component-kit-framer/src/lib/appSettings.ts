import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

export interface AppSettings {
  proAvailable: boolean
  uiOpacity: number
}

/** Public — every signed-in user needs this to know whether to show real Pro upsells or "Coming
 * soon", and how transparent to render the whole app. Writes only via admin-update-app-settings. */
export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from("app_settings").select("pro_available, ui_opacity").eq("id", "global").single()
  if (error || !data) throw new Error(error?.message ?? "Couldn't load app settings")
  return { proAvailable: data.pro_available, uiOpacity: data.ui_opacity }
}

export async function updateProAvailable(proAvailable: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("admin-update-app-settings", {
    body: { proAvailable },
  })
  if (error) throw new Error(await describeFunctionError(error))
  if (!data?.ok) throw new Error(data?.error ?? "Update failed")
}

export async function updateUiOpacity(uiOpacity: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("admin-update-app-settings", {
    body: { uiOpacity },
  })
  if (error) throw new Error(await describeFunctionError(error))
  if (!data?.ok) throw new Error(data?.error ?? "Update failed")
}
