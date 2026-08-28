import { framer, isCodeFileComponentExport } from "@framer/plugin"

const insertUrlCache = new Map<string, string>()

async function getInsertUrl(fileName: string, tsxSource: string): Promise<string> {
  const cached = insertUrlCache.get(fileName)
  if (cached) return cached

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
  if (!framer.isAllowedTo("createCodeFile", "addComponentInstance")) {
    throw new Error(
      "This Framer workspace/plan doesn't allow plugins to create code components. This isn't a bug in the plugin — it's a permission gate on the workspace."
    )
  }

  const url = await getInsertUrl(fileName, tsxSource)

  // Inserted as a linked instance, not detached layers. Confirmed (both by testing and by
  // Framer's own example plugin's source) that addDetachedComponentLayers only works on
  // pre-published, Framer-built module URLs — a CodeFile created at runtime via createCodeFile
  // is never structurally analyzable for detaching, preload or not. To free-form edit an
  // inserted component's text, use "Edit Code" in Framer's own right-click menu on the instance.
  await framer.addComponentInstance({ url })
}
