import { framer } from "@framer/plugin"
import { supabase } from "./supabase"
import { getComponentTag } from "./tierTag"

/** Reads every real Component in the currently-open Framer project and upserts them into the
 * catalog via sync-framer-components. Meant to be run by an admin with that source project
 * open and the Skela plugin loaded there — not a user-facing feature.
 *
 * Tier/category come from plugin data tagged directly on the node (see tierTag.ts) — confirmed
 * live that this persists independent of the display name, unlike naming-convention renames,
 * which turned out not to reliably update at all after a component's first creation. Falls
 * back to the old "Pro/<Category>/<Name>" naming convention on the name itself only when no
 * tag has been set, for backward compatibility with components created before this existed.
 * getParent-based page derivation was also tried and live-disproven (always returns null). */
export async function syncComponentsFromCurrentProject(): Promise<{ synced: number; skipped: string[] }> {
  const nodes = await framer.getNodesWithType("ComponentNode")
  const payload = await Promise.all(
    nodes.map(async (n) => {
      const tag = await getComponentTag(n).catch(() => ({ tier: null, category: null }))
      return {
        componentIdentifier: n.componentIdentifier,
        name: n.name,
        insertURL: n.insertURL,
        tag,
      }
    })
  )

  const { data, error } = await supabase.functions.invoke<{ synced: number; skipped: string[]; error?: string }>(
    "sync-framer-components",
    { body: { nodes: payload } }
  )
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return { synced: data?.synced ?? 0, skipped: data?.skipped ?? [] }
}
