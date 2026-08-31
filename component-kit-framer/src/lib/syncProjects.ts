import { framer } from "@framer/plugin"
import { supabase } from "./supabase"
import { describeFunctionError } from "./functionError"

export interface AllowedSyncProject {
  id: string
  name: string
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("manage-sync-projects", { body })
  if (error) throw new Error(await describeFunctionError(error))
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error?: string }).error)
  return data as T
}

export async function listAllowedSyncProjects(): Promise<AllowedSyncProject[]> {
  const { projects } = await call<{ projects: AllowedSyncProject[] }>({ action: "list" })
  return projects
}

/** Adds the currently-open Framer project to the sync allowlist. */
export async function addCurrentProjectToAllowlist(): Promise<AllowedSyncProject> {
  const project = await framer.getProjectInfo()
  await call({ action: "add", projectId: project.id, projectName: project.name })
  return { id: project.id, name: project.name }
}

export async function removeAllowedSyncProject(projectId: string): Promise<void> {
  await call({ action: "remove", projectId })
}
