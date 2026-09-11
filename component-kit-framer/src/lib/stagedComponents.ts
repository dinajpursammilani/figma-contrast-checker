import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

export interface StagedComponent {
  id: string
  name: string
  category: string
  is_pro: boolean
  module_url: string
  synced_at: string
  status: "new" | "existing"
  locked: boolean
  liveCategory: string | null
  liveIsPro: boolean | null
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("import-staged-components", { body })
  if (error) throw new Error(await describeFunctionError(error))
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error?: string }).error)
  return data as T
}

export async function fetchStagedComponents(): Promise<StagedComponent[]> {
  const { rows } = await call<{ rows: StagedComponent[] }>({ action: "list" })
  return rows
}

export async function updateStagedComponent(id: string, fields: { category?: string; is_pro?: boolean }): Promise<void> {
  await call({ action: "update", id, ...fields })
}

export async function discardStagedComponent(id: string): Promise<void> {
  await call({ action: "discard", id })
}

export async function discardStagedComponents(ids: string[] | "all"): Promise<number> {
  const { discarded } = await call<{ discarded: number }>({ action: "discard", ids })
  return discarded
}

export async function importStagedComponents(ids: string[] | "all"): Promise<number> {
  const { imported } = await call<{ imported: number }>({ action: "import", ids })
  return imported
}
