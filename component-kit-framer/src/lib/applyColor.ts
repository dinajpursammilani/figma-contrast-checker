import { framer } from "@framer/plugin"

/** Applies a background color to every selected node that supports it (frames, SVGs, etc).
 * Text nodes and a few other node types don't have a settable backgroundColor and are silently
 * skipped rather than erroring the whole batch. Returns how many nodes were actually updated. */
export async function applyColorToSelection(hex: string): Promise<number> {
  if (!framer.isAllowedTo("setAttributes")) {
    throw new Error("This Framer workspace/plan doesn't allow plugins to edit layers.")
  }

  const selection = await framer.getSelection()
  if (selection.length === 0) {
    throw new Error("Select a layer on the canvas first.")
  }

  let applied = 0
  for (const node of selection) {
    if (!("setAttributes" in node)) continue
    try {
      const updated = await (
        node as { setAttributes: (attrs: Record<string, unknown>) => Promise<{ backgroundColor?: unknown } | null> }
      ).setAttributes({ backgroundColor: hex })
      // setAttributes resolving isn't proof it took effect — some node types accept the call
      // and silently no-op on attributes they don't support. Only count it if the node's
      // background actually reflects the color we just set.
      if (updated && typeof updated.backgroundColor === "string" && updated.backgroundColor.toLowerCase() === hex.toLowerCase()) {
        applied++
      }
    } catch {
      // Node type doesn't support backgroundColor — skip it, don't fail the whole batch.
    }
  }

  if (applied === 0) {
    throw new Error("None of the selected layers support a background color.")
  }
  return applied
}
