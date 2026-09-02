// Matches Framer's own TextNodeTag union ("h1".."h6" | "p") — not exported from the SDK, so
// redeclared here rather than imported.
export type TextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p"

export interface TextScaleStep {
  tag: TextTag
  label: string
  sizePx: number
}

// H6→H1 climb the scale above the base size; P1 is the base; P2/P3 step down below it —
// matches the shape of a standard modular scale (Kompa's own H1-H6/P1-P3 split), not a
// literal copy of any specific tool's tuned numbers.
const HEADING_TAGS: TextTag[] = ["h6", "h5", "h4", "h3", "h2", "h1"]

export function generateTextScale(baseSizePx: number, ratio: number): TextScaleStep[] {
  const headings: TextScaleStep[] = HEADING_TAGS.map((tag, i) => ({
    tag,
    label: tag.toUpperCase(),
    sizePx: Math.round(baseSizePx * Math.pow(ratio, i + 1)),
  })).reverse() // H1 first, H6 last, for display

  const paragraphs: TextScaleStep[] = [
    { tag: "p", label: "P1", sizePx: Math.round(baseSizePx) },
    { tag: "p", label: "P2", sizePx: Math.round(baseSizePx / ratio) },
    { tag: "p", label: "P3", sizePx: Math.round(baseSizePx / (ratio * ratio)) },
  ]

  return [...headings, ...paragraphs]
}
