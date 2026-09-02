import { framer } from "@framer/plugin"

// Matches Framer's own FontWeight union (100-900 in steps of 100) — not exported from the SDK.
type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
import { hexToRgbaString } from "./color"
import { generateTextScale } from "./textScale"

/** Creates one real, project-level Framer Color Style per scale step, each with both a light
 * and dark value — these show up natively in Framer's own Assets → Styles panel, reusable by
 * any component in the project (and Framer's own light/dark theme switching applies to them
 * automatically), not just something displayed inside this plugin. Organized into a folder via
 * "/" in the name, same convention Framer's own docs use. Unlike the abandoned per-instance
 * recolor attempt, this operates on project-level style definitions, not a component instance's
 * protected internals — createColorStyle is a first-class, documented Plugin API method, not
 * something we're reverse-engineering. */
export async function insertColorStyles(
  paletteName: string,
  scale: { step: number; lightHex: string; darkHex: string }[]
): Promise<number> {
  if (!framer.isAllowedTo("createColorStyle")) {
    throw new Error("This Framer workspace/plan doesn't allow plugins to create styles.")
  }
  const folder = paletteName.trim() || "Palette"
  let created = 0
  for (const { step, lightHex, darkHex } of scale) {
    try {
      await framer.createColorStyle({
        name: `${folder}/${step}`,
        light: hexToRgbaString(lightHex),
        dark: hexToRgbaString(darkHex),
      })
      created++
    } catch {
      // A style with this exact name may already exist, or this particular step failed for
      // some other reason — skip it, don't fail the whole batch.
    }
  }
  if (created === 0) throw new Error("Couldn't create any color styles.")
  return created
}

export interface TextStyleOptions {
  folderName: string
  baseSizePx: number
  ratio: number
  weight: number
  fontFamily: string
}

/** Creates one real Framer Text Style per step of the generated scale (H1-H6, P1-P3) — same
 * "shows up in Framer's own Assets panel" benefit as insertColorStyles. Font/weight is applied
 * via framer.getFont, which requires an actual round trip to resolve a real Font object before
 * createTextStyle will accept it — if that lookup fails (family not found, weight unavailable),
 * styles are still created using Framer's built-in default font rather than failing the whole
 * batch, just without the custom weight/family applied. */
export async function insertTextStyles(opts: TextStyleOptions): Promise<number> {
  if (!framer.isAllowedTo("createTextStyle")) {
    throw new Error("This Framer workspace/plan doesn't allow plugins to create styles.")
  }
  const folder = opts.folderName.trim() || "Type"
  const steps = generateTextScale(opts.baseSizePx, opts.ratio)

  let font = null
  try {
    const nearestWeight = [100, 200, 300, 400, 500, 600, 700, 800, 900].reduce((closest, w) =>
      Math.abs(w - opts.weight) < Math.abs(closest - opts.weight) ? w : closest
    ) as FontWeight
    font = await framer.getFont(opts.fontFamily, { weight: nearestWeight })
  } catch {
    // Falls through to Framer's default font below — not fatal.
  }

  let created = 0
  for (const step of steps) {
    try {
      await framer.createTextStyle({
        name: `${folder}/${step.label}`,
        tag: step.tag,
        fontSize: `${step.sizePx}px`,
        ...(font ? { font } : {}),
      })
      created++
    } catch {
      // Same name may already exist, or this step failed for some other reason — skip it.
    }
  }
  if (created === 0) throw new Error("Couldn't create any text styles.")
  return created
}
