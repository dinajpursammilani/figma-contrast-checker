import { supabase } from "./supabase"

// tsx_source deliberately isn't here — the client can't SELECT it directly (see
// schema-components-lock-source.sql), and Pro components' source is only ever fetched through
// the gated get-component-source Edge Function, at warm/insert time.
//
// A row is sourced one of two ways, never both: hand-written code (file_name + tsx_source,
// fetched separately when needed) or a real Framer component synced from Dominik's project
// (module_url, inserted directly — see nodeBuilders.ts's insertFromModuleUrl). preview_svg is
// only ever hand-drawn for the code path; module_url components render a fallback instead.
export interface ComponentRow {
  id: string
  name: string
  category: string
  is_pro: boolean
  preview_svg: string | null
  file_name: string | null
  module_url: string | null
  sort_order: number
}

export const COMPONENT_COLUMNS = "id, name, category, is_pro, preview_svg, file_name, module_url, sort_order"

export async function fetchComponents(): Promise<ComponentRow[]> {
  const { data, error } = await supabase
    .from("components")
    .select(COMPONENT_COLUMNS)
    .order("sort_order", { ascending: true })

  if (error) throw new Error(`Failed to load components: ${error.message}`)
  return data ?? []
}
