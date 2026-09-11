import { framer } from "@framer/plugin"
import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"
import { fetchStagedComponents } from "./stagedComponents"

/** Reads every real Component in the currently-open Framer project and stages them into
 * components_staging via sync-framer-components — NOT the live catalog. An admin has to
 * explicitly review and import from Review Sync before anything here is visible to real users;
 * see components_staging in schema-full.sql for why. Meant to be run by an admin with the
 * source project open and the Skela plugin loaded there — not a user-facing feature. */
export async function syncComponentsFromCurrentProject(): Promise<{
  staged: number
  newCount: number
  existingCount: number
  skipped: string[]
  projectId: string
  projectName: string
}> {
  const project = await framer.getProjectInfo()
  const nodes = await framer.getNodesWithType("ComponentNode")
  const payload = nodes.map((n) => ({
    componentIdentifier: n.componentIdentifier,
    name: n.name,
    insertURL: n.insertURL,
  }))

  const { data, error } = await supabase.functions.invoke<{
    staged: number
    skipped: string[]
    projectId: string
    projectName: string
    error?: string
  }>("sync-framer-components", { body: { projectId: project.id, projectName: project.name, nodes: payload } })
  if (error) throw new Error(await describeFunctionError(error))
  if (data?.error) throw new Error(data.error)

  // A sync run re-stages every component in the project every time (not incremental), so the
  // full staging table right after this call is exactly what was "just synced" — reuse Review
  // Sync's own new-vs-existing computation instead of duplicating that join in the edge
  // function. Best-effort: if this fetch fails, still report the raw staged count rather than
  // failing the whole sync over a follow-up read.
  let newCount = 0
  let existingCount = 0
  try {
    const staged = await fetchStagedComponents()
    for (const row of staged) {
      if (row.status === "new") newCount++
      else existingCount++
    }
  } catch {
    // Non-fatal — caller falls back to the plain staged count.
  }

  return {
    staged: data?.staged ?? 0,
    newCount,
    existingCount,
    skipped: data?.skipped ?? [],
    projectId: data?.projectId ?? project.id,
    projectName: data?.projectName ?? project.name,
  }
}
