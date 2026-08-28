import { supabase } from "./supabase"

export interface ComponentRow {
  id: string
  name: string
  category: string
  is_pro: boolean
  preview_svg: string
  tsx_source: string
  file_name: string
  sort_order: number
}

export async function fetchComponents(): Promise<ComponentRow[]> {
  const { data, error } = await supabase.from("components").select("*").order("sort_order", { ascending: true })

  if (error) throw new Error(`Failed to load components: ${error.message}`)
  return data ?? []
}
