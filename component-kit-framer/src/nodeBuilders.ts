import { framer, isCodeFileComponentExport } from "@framer/plugin"

const insertUrlCache = new Map<string, string>()

async function getInsertUrl(fileName: string, tsxSource: string): Promise<string> {
  const cached = insertUrlCache.get(fileName)
  if (cached) return cached

  if (!framer.isAllowedTo("createCodeFile", "addComponentInstance")) {
    throw new Error(
      "This Framer workspace/plan doesn't allow plugins to create code components. This isn't a bug in the plugin — it's a permission gate on the workspace."
    )
  }

  // Reuse the code file across sessions/reloads instead of creating a duplicate every time.
  // If it already exists but the catalog's source has since changed, sync it — otherwise a
  // stale version would keep getting inserted.
  let codeFile = await framer.getCodeFile(fileName)
  if (!codeFile) {
    codeFile = await framer.createCodeFile(fileName, tsxSource)
  } else if (codeFile.content !== tsxSource) {
    codeFile = await codeFile.setFileContent(tsxSource)
  }

  const componentExport = codeFile.exports.find(isCodeFileComponentExport)
  if (!componentExport) {
    throw new Error(`"${fileName}" has no component export — this shouldn't happen.`)
  }

  insertUrlCache.set(fileName, componentExport.insertURL)
  return componentExport.insertURL
}

export async function insertComponent(fileName: string, tsxSource: string) {
  const url = await getInsertUrl(fileName, tsxSource)

  // Inserted as a linked instance, not detached layers. Confirmed (both by testing and by
  // Framer's own example plugin's source) that addDetachedComponentLayers only works on
  // pre-published, Framer-built module URLs — a CodeFile created at runtime via createCodeFile
  // is never structurally analyzable for detaching, preload or not. To free-form edit an
  // inserted component's text, use "Edit Code" in Framer's own right-click menu on the instance.
  await framer.addComponentInstance({ url })
}

/** Pre-fetches (and caches) a component's insert URL without inserting it — call this for
 * every visible card up front, so drag-to-canvas (which needs the URL synchronously, not as
 * a promise) has it ready by the time the user actually starts dragging. */
export async function warmInsertUrl(fileName: string, tsxSource: string): Promise<string | null> {
  try {
    return await getInsertUrl(fileName, tsxSource)
  } catch (err) {
    console.warn(`Failed to warm insert URL for "${fileName}":`, err)
    return null
  }
}

export function getCachedInsertUrl(fileName: string): string | undefined {
  return insertUrlCache.get(fileName)
}

/** Dev-panel test helper: insert any published component's Module URL as a linked instance —
 * same call insertComponent uses under the hood, for comparing against detached insertion. */
export async function insertLinkedFromUrl(url: string) {
  if (!framer.isAllowedTo("addComponentInstance")) {
    throw new Error("This workspace doesn't allow inserting component instances.")
  }
  await framer.addComponentInstance({ url })
}

/** Insert a real Framer-designed component's Module URL as detached, freely-editable layers —
 * unlike insertComponent's linked instances, this only works for a component that actually
 * lives in Framer's canvas (a real ComponentNode), not a runtime-created CodeFile. Used both by
 * the Settings dev panel and for catalog components synced from Dominik's Framer project
 * (ComponentRow.module_url) — see sync-framer-components. */
export async function insertFromModuleUrl(url: string) {
  if (!framer.isAllowedTo("addDetachedComponentLayers")) {
    throw new Error("This workspace doesn't allow inserting detached component layers.")
  }
  await framer.addDetachedComponentLayers({ url, layout: true })
}
