import { framer, type CanvasNode } from "@framer/plugin"
import { hexToHsl, hslToHex } from "./color"

const NEUTRAL_SATURATION_THRESHOLD = 8 // below this, treat as gray/black/white — never touched
const HUE_BUCKET_SIZE = 12 // degrees — colors within this many degrees count as "the same family"

interface ColorHit {
  node: CanvasNode
  hex: string
  hue: number
}

async function collectDescendants(node: CanvasNode): Promise<CanvasNode[]> {
  const children = await framer.getChildren(node.id)
  const nested = await Promise.all(children.map(collectDescendants))
  return [node, ...children, ...nested.flat()]
}

function asPlainHex(value: unknown): string | null {
  // backgroundColor can be a raw hex string or a ColorStyle reference (an object) — only raw
  // hex is something we can safely rewrite here without touching a shared style everyone else
  // also uses. A ColorStyle would need a completely different (and much bigger) approach:
  // updating the style definition itself, not the node.
  if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) return value
  return null
}

/** Finds the most common non-neutral color family used as a plain hex backgroundColor across
 * the given component instance and everything inside it. This is what "recolor" treats as the
 * component's brand color — everything else (grays, blacks, whites) is left untouched since
 * those are almost always structural (text, borders, page background), not brand color. */
export async function detectBrandHue(rootNode: CanvasNode): Promise<number | null> {
  const nodes = await collectDescendants(rootNode)
  const hits = collectColorHits(nodes)
  if (hits.length === 0) return null
  return modalHueBucket(hits)
}

function collectColorHits(nodes: CanvasNode[]): ColorHit[] {
  const hits: ColorHit[] = []
  for (const node of nodes) {
    const bg = asPlainHex((node as { backgroundColor?: unknown }).backgroundColor)
    if (!bg) continue
    const { h, s } = hexToHsl(bg)
    if (s < NEUTRAL_SATURATION_THRESHOLD) continue
    hits.push({ node, hex: bg, hue: h })
  }
  return hits
}

function modalHueBucket(hits: ColorHit[]): number {
  const buckets = new Map<number, number>()
  for (const hit of hits) {
    const bucket = Math.round(hit.hue / HUE_BUCKET_SIZE) * HUE_BUCKET_SIZE
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1)
  }
  let best = hits[0].hue
  let bestCount = 0
  for (const [bucket, count] of buckets) {
    if (count > bestCount) {
      bestCount = count
      best = bucket
    }
  }
  return best
}

/** Rotates every node's brand-family color (same hue bucket as the detected brand hue) toward
 * targetHex, by the same hue delta for all of them — each node keeps its own saturation and
 * lightness, so a light hover-tint stays light and a dark button stays dark, just repainted to
 * the new hue. Neutrals (grays/black/white) are never touched. Returns how many nodes changed,
 * or throws if a node can't be written to (e.g. Framer refuses edits on instance descendants
 * without detaching first — unverified, needs a live test). */
export async function recolorSelection(targetHex: string): Promise<number> {
  if (!framer.isAllowedTo("setAttributes")) {
    throw new Error("This Framer workspace/plan doesn't allow plugins to edit layers.")
  }

  const selection = await framer.getSelection()
  const root = selection[0]
  if (!root) throw new Error("Select a component on the canvas first.")

  const nodes = await collectDescendants(root)
  const hits = collectColorHits(nodes)
  if (hits.length === 0) throw new Error("No colored fills found on this component to recolor.")

  const brandHue = modalHueBucket(hits)
  const targetHsl = hexToHsl(targetHex)
  const deltaHue = targetHsl.h - brandHue

  const toChange = hits.filter((hit) => {
    const diff = Math.abs(hit.hue - brandHue)
    return Math.min(diff, 360 - diff) <= HUE_BUCKET_SIZE
  })

  let changed = 0
  for (const hit of toChange) {
    const { s, l } = hexToHsl(hit.hex)
    const newHue = ((hit.hue + deltaHue) % 360 + 360) % 360
    const newHex = hslToHex({ h: newHue, s, l })
    try {
      // setAttributes resolving isn't proof it took effect — some node types (or instance
      // descendants specifically, unverified) may accept the call and silently no-op. Only
      // count it if the node's background actually reflects the color we just set.
      const updated = (await hit.node.setAttributes({ backgroundColor: newHex })) as { backgroundColor?: unknown } | null
      if (updated && typeof updated.backgroundColor === "string" && updated.backgroundColor.toLowerCase() === newHex.toLowerCase()) {
        changed++
      }
    } catch {
      // This node type (or this specific instance-descendant node) doesn't accept the write —
      // skip it, don't fail the whole batch.
    }
  }
  if (changed === 0) {
    throw new Error("Couldn't write any color changes — this component's layers may not be directly editable from a plugin.")
  }
  return changed
}
