import { framer } from "@framer/plugin"
import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

/** Reads every real Component in the currently-open Framer project and stages them into
 * components_staging via sync-framer-components — NOT the live catalog. An admin has to
 * explicitly review and import from Review Sync before anything here is visible to real users;
 * see components_staging in schema-full.sql for why. Meant to be run by an admin with the
 * source project open and the Skela plugin loaded there — not a user-facing feature. */
export async function syncComponentsFromCurrentProject(): Promise<{ staged: number; skipped: string[]; projectId: string; projectName: string }> {
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
  return {
    staged: data?.staged ?? 0,
    skipped: data?.skipped ?? [],
    projectId: data?.projectId ?? project.id,
    projectName: data?.projectName ?? project.name,
  }
}
