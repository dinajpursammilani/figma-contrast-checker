import { supabase } from "./supabase"

// tsx_source deliberately isn't here — the client can't SELECT it directly (see
// schema-components-lock-source.sql), and Pro components' source is only ever fetched through
// the gated get-component-source Edge Function, at warm/insert time.
export interface ComponentRow {
  id: string
  name: string
  category: string
  is_pro: boolean
  preview_svg: string
  file_name: string
  sort_order: number
}

export const COMPONENT_COLUMNS = "id, name, category, is_pro, preview_svg, file_name, sort_order"

export async function fetchComponents(): Promise<ComponentRow[]> {
  const { data, error } = await supabase
    .from("components")
    .select(COMPONENT_COLUMNS)
    .order("sort_order", { ascending: true })

  if (error) throw new Error(`Failed to load components: ${error.message}`)
  return data ?? []
}
