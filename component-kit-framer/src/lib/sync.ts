import { framer } from "@framer/plugin"
import { supabase } from "./supabase"

/** Reads every real Component in the currently-open Framer project and upserts them into the
 * catalog via sync-framer-components. Meant to be run by an admin with that source project
 * open and the Skela plugin loaded there — not a user-facing feature.
 *
 * Deliberately asks nothing of whoever's designing: category comes from whatever page the
 * component actually lives on (e.g. a component on the "hero" page becomes category "hero"),
 * not a naming convention someone has to remember. Tier still defaults to Free with no
 * convention required either — see sync-framer-components for the one optional "Pro/" prefix
 * escape hatch, and Edit Components for flipping specific ones to Pro after the fact. */
export async function syncComponentsFromCurrentProject(): Promise<{ synced: number; skipped: string[] }> {
  const nodes = await framer.getNodesWithType("ComponentNode")
  const payload = await Promise.all(
    nodes.map(async (n) => {
      let pageName: string | null = null
      try {
        const parent = await framer.getParent(n.id)
        if (parent && "name" in parent && typeof parent.name === "string") pageName = parent.name
      } catch {
        // No parent, or getParent unsupported here — falls back to the default category
        // server-side. Not worth failing the whole sync over.
      }
      return {
        componentIdentifier: n.componentIdentifier,
        name: n.name,
        insertURL: n.insertURL,
        pageName,
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
