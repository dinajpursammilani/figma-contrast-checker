import { supabase } from "./supabase"

export interface Palette {
  id: string
  name: string
  colors: string[]
  created_at: string
}

export async function fetchPalettes(): Promise<Palette[]> {
  const { data, error } = await supabase
    .from("palettes")
    .select("id, name, colors, created_at")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`Failed to load palettes: ${error.message}`)
  return (data ?? []) as Palette[]
}

export async function savePalette(name: string, colors: string[]): Promise<Palette> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  const { data, error } = await supabase
    .from("palettes")
    .insert({ user_id: user.id, name, colors })
    .select("id, name, colors, created_at")
    .single()
  if (error) throw new Error(`Failed to save palette: ${error.message}`)
  return data as Palette
}

export async function deletePalette(paletteId: string): Promise<void> {
  const { error } = await supabase.from("palettes").delete().eq("id", paletteId)
  if (error) throw new Error(`Failed to delete palette: ${error.message}`)
}
