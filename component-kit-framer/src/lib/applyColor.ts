import { framer, isTextNode, type TextNode, type TextStyle } from "@framer/plugin"
import { readableTextColor } from "./color"

type NodeWithChildQuery = { getNodesWithType: (type: "TextNode") => Promise<TextNode[]> }
type EditableTextNode = TextNode & { setAttributes: (attrs: { inlineTextStyle: TextStyle }) => Promise<unknown> }

/** Nice-to-have on top of the background apply: makes any text inside the selection legible
 * against the new background automatically, instead of leaving it to go invisible/low-contrast.
 * Best-effort only — never lets a text-color failure block the background color that already
 * succeeded, since that's the part the user actually asked for.
 *
 * Two approaches were tried and ruled out before this one:
 * - `TextNode.setHTML`/`getHTML`: confirmed at runtime to throw "Invalid method:
 *   INTERNAL_getHTMLForNode" — genuinely blocked for third-party plugins, not just risky.
 * - Assigning a freshly created Text Style with only `color` set: works, but a Text Style
 *   carries font/size/weight/alignment/decoration too, so it silently wiped all of a text
 *   node's other formatting, not just its color — confirmed as a real regression in testing.
 *
 * This version instead clones every field off the text node's *existing* Text Style (if it has
 * one) into a new style, changing only `color` — so nothing else about the text changes. A text
 * node with no assigned style (ad-hoc formatting via its `font` trait directly) is left alone
 * entirely rather than guessed at, since there's no reliable way to read+preserve that shape. */
async function applyComplementaryTextColor(node: unknown, backgroundHex: string): Promise<void> {
  if (!framer.isAllowedTo("createTextStyle")) return

  try {
    const textNodes: TextNode[] = []
    if (isTextNode(node)) textNodes.push(node)
    if (node && typeof node === "object" && "getNodesWithType" in node) {
      const found = await (node as NodeWithChildQuery).getNodesWithType("TextNode")
      textNodes.push(...found)
    }
    if (textNodes.length === 0) return

    const textColor = readableTextColor(backgroundHex)
    await Promise.all(
      textNodes.map(async (t) => {
        const existing = t.inlineTextStyle
        if (!existing) return // no style to safely clone — leave ad-hoc-formatted text untouched
        try {
          const cloned = await framer.createTextStyle({
            name: `Auto text color/${backgroundHex.replace("#", "")}`,
            tag: existing.tag,
            fontSize: existing.fontSize,
            letterSpacing: existing.letterSpacing,
            lineHeight: existing.lineHeight,
            paragraphSpacing: existing.paragraphSpacing,
            font: existing.font,
            boldFont: existing.boldFont,
            italicFont: existing.italicFont,
            boldItalicFont: existing.boldItalicFont,
            transform: existing.transform,
            alignment: existing.alignment,
            decoration: existing.decoration,
            decorationColor: typeof existing.decorationColor === "string" ? existing.decorationColor : existing.decorationColor.light,
            decorationThickness: existing.decorationThickness,
            decorationStyle: existing.decorationStyle,
            decorationSkipInk: existing.decorationSkipInk,
            color: textColor,
          })
          await (t as EditableTextNode).setAttributes({ inlineTextStyle: cloned })
        } catch {
          // Style name collision, or this node rejected the reassignment — skip it, not fatal.
        }
      })
    )
  } catch {
    // Best-effort — the background color already applied successfully regardless.
  }
}

/** Applies a background color to every selected node that supports it (frames, SVGs, etc), then
 * best-effort makes any text inside legible against it. Text nodes and a few other node types
 * don't have a settable backgroundColor and are silently skipped rather than erroring the whole
 * batch. Returns how many nodes were actually updated. */
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
        await applyComplementaryTextColor(node, hex)
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
