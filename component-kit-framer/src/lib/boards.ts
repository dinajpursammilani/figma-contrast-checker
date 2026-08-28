import { supabase } from "./supabase"
import type { ComponentRow } from "./components"

export interface Board {
  id: string
  name: string
  created_at: string
}

export interface SavedItem {
  id: string
  component_id: string
  board_id: string | null
  component: ComponentRow
}

export async function fetchBoards(): Promise<Board[]> {
  const { data, error } = await supabase.from("boards").select("id, name, created_at").order("created_at")
  if (error) throw new Error(`Failed to load boards: ${error.message}`)
  return data ?? []
}

export async function createBoard(name: string): Promise<Board> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  const { data, error } = await supabase
    .from("boards")
    .insert({ name, user_id: user.id })
    .select("id, name, created_at")
    .single()

  if (error) throw new Error(`Failed to create board: ${error.message}`)
  return data
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from("boards").delete().eq("id", boardId)
  if (error) throw new Error(`Failed to delete board: ${error.message}`)
}

/** Pass boardId to get just that board's items, or omit for every saved item (the "All saved" view). */
export async function fetchSavedItems(boardId?: string): Promise<SavedItem[]> {
  let query = supabase.from("saved_items").select("id, component_id, board_id, component:components(*)")

  if (boardId) query = query.eq("board_id", boardId)

  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) throw new Error(`Failed to load saved items: ${error.message}`)
  return (data ?? []) as unknown as SavedItem[]
}

export async function saveComponent(componentId: string, boardId: string | null = null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  const { error } = await supabase
    .from("saved_items")
    .insert({ user_id: user.id, component_id: componentId, board_id: boardId })

  // Unique constraint violation just means it's already saved there — not a real error.
  if (error && error.code !== "23505") {
    throw new Error(`Failed to save component: ${error.message}`)
  }
}

export async function unsaveComponent(savedItemId: string): Promise<void> {
  const { error } = await supabase.from("saved_items").delete().eq("id", savedItemId)
  if (error) throw new Error(`Failed to remove saved component: ${error.message}`)
}

export async function isComponentSaved(componentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("saved_items")
    .select("id")
    .eq("component_id", componentId)
    .is("board_id", null)
    .limit(1)

  if (error) return false
  return (data?.length ?? 0) > 0
}
