import { framer } from "@framer/plugin"
import { supabase } from "./supabase"

/** Reads every real Component in the currently-open Framer project and upserts them into the
 * catalog via sync-framer-components. Meant to be run by an admin with that source project
 * open and the Skela plugin loaded there — not a user-facing feature.
 *
 * Tier and category both come from the component's own name, using Framer's "/" convention
 * directly on it — e.g. "Pro/Buttons/PrimaryButton". Deriving category from the containing
 * page instead (via getParent) was tried and live-confirmed not to work: getParent returns
 * null for every Component, since master components apparently don't live under the page tree
 * the way regular frames do. */
export async function syncComponentsFromCurrentProject(): Promise<{ synced: number; skipped: string[]; projectId: string; projectName: string }> {
  const project = await framer.getProjectInfo()
  const nodes = await framer.getNodesWithType("ComponentNode")
  const payload = nodes.map((n) => ({
    componentIdentifier: n.componentIdentifier,
    name: n.name,
    insertURL: n.insertURL,
  }))

  const { data, error } = await supabase.functions.invoke<{
    synced: number
    skipped: string[]
    projectId: string
    projectName: string
    error?: string
  }>("sync-framer-components", { body: { projectId: project.id, projectName: project.name, nodes: payload } })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return {
    synced: data?.synced ?? 0,
    skipped: data?.skipped ?? [],
    projectId: data?.projectId ?? project.id,
    projectName: data?.projectName ?? project.name,
  }
}
