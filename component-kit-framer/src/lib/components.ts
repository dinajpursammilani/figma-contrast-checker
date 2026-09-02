import { supabase } from "./supabase"

// tsx_source deliberately isn't here — the client can't SELECT it directly (see
// schema-components-lock-source.sql), and Pro components' source is only ever fetched through
// the gated get-component-source Edge Function, at warm/insert time.
//
// A row is sourced one of two ways, never both: hand-written code (file_name + tsx_source,
// fetched separately when needed) or a real Framer component synced from Dominik's project
// (module_url, inserted directly — see nodeBuilders.ts's insertFromModuleUrl). Rendering
// preference everywhere: preview_image_url (a real uploaded screenshot) > preview_svg
// (hand-drawn, code path only) > a category-icon fallback.
export interface ComponentRow {
  id: string
  name: string
  category: string
  is_pro: boolean
  preview_svg: string | null
  preview_image_url: string | null
  file_name: string | null
  module_url: string | null
  sort_order: number
  // True once an admin has explicitly set category/is_pro in Edit Components — sync then
  // leaves those two fields alone forever for this row, instead of re-deriving them from
  // Framer on every sync. See sync-framer-components.
  tier_manually_set: boolean
  created_at: string
  updated_at: string
}

export const COMPONENT_COLUMNS =
  "id, name, category, is_pro, preview_svg, preview_image_url, file_name, module_url, sort_order, tier_manually_set, created_at, updated_at"

export async function fetchComponents(): Promise<ComponentRow[]> {
  const { data, error } = await supabase
    .from("components")
    .select(COMPONENT_COLUMNS)
    .order("sort_order", { ascending: true })

  if (error) throw new Error(`Failed to load components: ${error.message}`)
  return data ?? []
}
