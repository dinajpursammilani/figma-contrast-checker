import { framer } from "@framer/plugin"
import { supabase } from "./supabase"

/** Reads every real Component in the currently-open Framer project and upserts them into the
 * catalog via sync-framer-components. Meant to be run by an admin with that source project
 * open and the Skela plugin loaded there — not a user-facing feature. */
export async function syncComponentsFromCurrentProject(): Promise<{ synced: number; skipped: string[] }> {
  const nodes = await framer.getNodesWithType("ComponentNode")
  const payload = nodes.map((n) => ({
    componentIdentifier: n.componentIdentifier,
    name: n.name,
    insertURL: n.insertURL,
  }))

  const { data, error } = await supabase.functions.invoke<{ synced: number; skipped: string[]; error?: string }>(
    "sync-framer-components",
    { body: { nodes: payload } }
  )
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return { synced: data?.synced ?? 0, skipped: data?.skipped ?? [] }
}
