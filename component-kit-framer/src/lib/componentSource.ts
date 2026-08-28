import { supabase } from "./supabase"

export interface ComponentSource {
  tsx_source: string
  file_name: string
}

/** Fetches a component's insertable source via the gated Edge Function. Returns null if the
 * component doesn't exist or (for Pro components) the caller isn't on the Pro plan. */
export async function fetchComponentSource(componentId: string): Promise<ComponentSource | null> {
  const { data, error } = await supabase.functions.invoke<ComponentSource & { error?: string }>(
    "get-component-source",
    { body: { componentId } }
  )
  if (error || !data || "error" in data) return null
  return data
}
