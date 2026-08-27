import { framer } from "@framer/plugin"
import * as opentype from "opentype.js"

const COLOR = {
  ink: "#17171A",
  inkMuted: "#73737A",
  white: "#FFFFFF",
  surface: "#F7F7F8",
  border: "#E6E6E8",
  accent: "#4A5AFF",
  accentSoft: "#ECEEFF",
  banner: "#17171A",
  bannerMuted: "#BEBEC3",
}

type Weight = "regular" | "semibold" | "bold"

const FONT_URLS: Record<Weight, string> = {
  regular: "/fonts/Inter-Regular.ttf",
  semibold: "/fonts/Inter-SemiBold.ttf",
  bold: "/fonts/Inter-Bold.ttf",
}

const fontCache = new Map<Weight, opentype.Font>()

async function loadFont(weight: Weight): Promise<opentype.Font> {
  const cached = fontCache.get(weight)
  if (cached) return cached
  const res = await fetch(FONT_URLS[weight])
  const buffer = await res.arrayBuffer()
  const font = opentype.parse(buffer)
  fontCache.set(weight, font)
  return font
}

async function loadAllFonts(): Promise<void> {
  await Promise.all((Object.keys(FONT_URLS) as Weight[]).map(loadFont))
}

/**
 * Renders a line of text as a filled SVG <path>, since Framer's addSVG doesn't support <text>.
 * Builds glyph-by-glyph (not font.getPath on the whole string) because Inter's GSUB tables use a
 * substitution format opentype.js can't parse, which throws on font.stringToGlyphs / font.getPath.
 * This loses ligatures/kerning, which is fine for UI copy.
 */
function measureText(font: opentype.Font, content: string, size: number): number {
  const scale = size / font.unitsPerEm
  let width = 0
  for (const ch of content) {
    width += (font.charToGlyph(ch).advanceWidth ?? 0) * scale
  }
  return width
}

function glyphsToPath(font: opentype.Font, content: string, x: number, y: number, size: number): string {
  const scale = size / font.unitsPerEm
  let cursor = x
  const parts: string[] = []
  for (const ch of content) {
    const glyph = font.charToGlyph(ch)
    parts.push(glyph.getPath(cursor, y, size).toPathData(2))
    cursor += (glyph.advanceWidth ?? 0) * scale
  }
  return parts.join(" ")
}

async function text(
  x: number,
  y: number,
  content: string,
  opts: { size: number; weight?: Weight; color?: string; anchor?: "start" | "middle" | "end" }
): Promise<string> {
  const { size, weight = "regular", color = COLOR.ink, anchor = "start" } = opts
  const font = await loadFont(weight)
  const advance = measureText(font, content, size)
  const drawX = anchor === "middle" ? x - advance / 2 : anchor === "end" ? x - advance : x
  const d = glyphsToPath(font, content, drawX, y, size)
  return `<path d="${d}" fill="${color}"/>`
}

function rect(x: number, y: number, w: number, h: number, opts: { fill?: string; rx?: number; stroke?: string } = {}) {
  const { fill = "none", rx = 0, stroke } = opts
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="1"` : ""
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${strokeAttr}/>`
}

function svgWrap(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

async function button(x: number, y: number, label: string, filled: boolean): Promise<{ svg: string; width: number }> {
  const font = await loadFont("semibold")
  const size = 14
  const textW = measureText(font, label, size)
  const w = textW + 44
  const h = 38
  const bg = filled ? COLOR.accent : COLOR.white
  const stroke = filled ? undefined : COLOR.border
  const labelColor = filled ? COLOR.white : COLOR.ink
  let body = rect(x, y, w, h, { fill: bg, rx: 8, stroke })
  body += await text(x + w / 2, y + h / 2 + size * 0.35, label, { size, weight: "semibold", color: labelColor, anchor: "middle" })
  return { svg: body, width: w }
}

// ---- Component templates ----

async function buildHero(): Promise<string> {
  const w = 640
  const h = 340
  let body = rect(0, 0, w, h, { fill: COLOR.white })
  body += await text(w / 2, 60, "NEW · V2.0", { size: 12, weight: "bold", color: COLOR.accent, anchor: "middle" })
  body += await text(w / 2, 106, "Design faster,", { size: 34, weight: "bold", color: COLOR.ink, anchor: "middle" })
  body += await text(w / 2, 148, "ship with confidence", { size: 34, weight: "bold", color: COLOR.ink, anchor: "middle" })
  body += await text(w / 2, 186, "A component library built for teams who care about", { size: 15, weight: "regular", color: COLOR.inkMuted, anchor: "middle" })
  body += await text(w / 2, 208, "speed and craft in equal measure.", { size: 15, weight: "regular", color: COLOR.inkMuted, anchor: "middle" })

  const btn1 = await button(w / 2 - 155, 244, "Get started", true)
  const btn2 = await button(w / 2 - 155 + btn1.width + 12, 244, "View docs", false)
  body += btn1.svg + btn2.svg

  return svgWrap(w, h, body)
}

async function buildNavbar(): Promise<string> {
  const w = 720
  const h = 64
  let body = rect(0, 0, w, h, { fill: COLOR.white, stroke: COLOR.border })
  body += await text(32, 38, "Acme", { size: 18, weight: "bold", color: COLOR.ink })

  const linkFont = await loadFont("semibold")
  let lx = 300
  for (const link of ["Product", "Pricing", "Docs", "Blog"]) {
    body += await text(lx, 38, link, { size: 14, weight: "semibold", color: COLOR.inkMuted })
    lx += measureText(linkFont, link, 14) + 32
  }

  body += await text(w - 168, 38, "Log in", { size: 14, weight: "semibold", color: COLOR.ink })
  const btn = await button(w - 108, 13, "Sign up", true)
  body += btn.svg
  return svgWrap(w, h, body)
}

async function buildPricingCard(): Promise<string> {
  const w = 280
  const h = 340
  let body = rect(0, 0, w, h, { fill: COLOR.white, rx: 16, stroke: COLOR.border })
  body += await text(28, 52, "Pro", { size: 14, weight: "bold", color: COLOR.accent })
  body += await text(28, 100, "$24", { size: 36, weight: "bold", color: COLOR.ink })
  const priceFont = await loadFont("bold")
  const priceW = measureText(priceFont, "$24", 36)
  body += await text(28 + priceW + 6, 100, "/mo", { size: 14, weight: "regular", color: COLOR.inkMuted })

  const features = ["Unlimited projects", "Priority support", "Team collaboration", "Advanced analytics"]
  let fy = 138
  for (const f of features) {
    body += `<circle cx="34" cy="${fy - 5}" r="7" fill="${COLOR.accentSoft}"/>`
    body += await text(46, fy, f, { size: 13, weight: "regular", color: COLOR.ink })
    fy += 26
  }

  body += rect(28, h - 62, w - 56, 38, { fill: COLOR.accent, rx: 8 })
  body += await text(w / 2, h - 62 + 24, "Choose plan", { size: 13, weight: "semibold", color: COLOR.white, anchor: "middle" })
  return svgWrap(w, h, body)
}

async function buildTestimonial(): Promise<string> {
  const w = 420
  const h = 200
  let body = rect(0, 0, w, h, { fill: COLOR.surface, rx: 16 })
  body += await text(32, 50, "“This tool cut our design-to-dev handoff time", { size: 16, weight: "semibold", color: COLOR.ink })
  body += await text(32, 74, "in half. It's become part of how we ship every week.”", { size: 16, weight: "semibold", color: COLOR.ink })
  body += `<circle cx="50" cy="140" r="18" fill="${COLOR.accentSoft}"/>`
  body += await text(80, 134, "Jordan Lee", { size: 13, weight: "bold", color: COLOR.ink })
  body += await text(80, 152, "Design Lead, Northwind", { size: 12, weight: "regular", color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

async function buildFeatureCard(): Promise<string> {
  const w = 240
  const h = 190
  let body = rect(0, 0, w, h, { fill: COLOR.white, rx: 14, stroke: COLOR.border })
  body += rect(24, 24, 40, 40, { fill: COLOR.accentSoft, rx: 10 })
  body += `<circle cx="44" cy="44" r="6" fill="${COLOR.accent}"/>`
  body += await text(24, 100, "Real-time sync", { size: 15, weight: "bold", color: COLOR.ink })
  body += await text(24, 122, "Changes reflect instantly across every", { size: 12, weight: "regular", color: COLOR.inkMuted })
  body += await text(24, 140, "teammate's canvas, no refresh needed.", { size: 12, weight: "regular", color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

async function buildCtaBanner(): Promise<string> {
  const w = 680
  const h = 140
  let body = rect(0, 0, w, h, { fill: COLOR.banner, rx: 20 })
  body += await text(48, 60, "Ready to get started?", { size: 22, weight: "bold", color: COLOR.white })
  body += await text(48, 88, "Join thousands of teams already shipping faster.", { size: 14, weight: "regular", color: COLOR.bannerMuted })
  body += rect(w - 208, 50, 160, 42, { fill: COLOR.white, rx: 8 })
  body += await text(w - 128, 76, "Start free trial", { size: 14, weight: "semibold", color: COLOR.ink, anchor: "middle" })
  return svgWrap(w, h, body)
}

async function buildFooter(): Promise<string> {
  const w = 720
  const h = 200
  let body = rect(0, 0, w, h, { fill: COLOR.white })
  const groups: [string, string[]][] = [
    ["Product", ["Overview", "Pricing", "Changelog"]],
    ["Company", ["About", "Careers", "Press"]],
    ["Resources", ["Docs", "Guides", "Support"]],
  ]
  let gx = 48
  for (const [title, links] of groups) {
    body += await text(gx, 50, title, { size: 13, weight: "bold", color: COLOR.ink })
    let ly = 76
    for (const l of links) {
      body += await text(gx, ly, l, { size: 13, weight: "regular", color: COLOR.inkMuted })
      ly += 22
    }
    gx += 160
  }
  body += rect(48, 150, w - 96, 1, { fill: COLOR.border })
  body += await text(48, 178, "© 2026 Acme, Inc.", { size: 12, weight: "regular", color: COLOR.inkMuted })
  body += await text(w - 48, 178, "Privacy · Terms", { size: 12, weight: "regular", color: COLOR.inkMuted, anchor: "end" })
  return svgWrap(w, h, body)
}

async function buildStatsRow(): Promise<string> {
  const w = 400
  const h = 100
  let body = ""
  const stats: [string, string][] = [
    ["120k+", "Active users"],
    ["4.9/5", "Average rating"],
    ["99.9%", "Uptime"],
  ]
  const colW = w / stats.length
  for (let i = 0; i < stats.length; i++) {
    const [num, label] = stats[i]
    const cx = colW * i + colW / 2
    body += await text(cx, 42, num, { size: 26, weight: "bold", color: COLOR.ink, anchor: "middle" })
    body += await text(cx, 66, label, { size: 13, weight: "regular", color: COLOR.inkMuted, anchor: "middle" })
  }
  return svgWrap(w, h, body)
}

const BUILDERS: Record<string, () => Promise<string>> = {
  hero: buildHero,
  navbar: buildNavbar,
  "pricing-card": buildPricingCard,
  testimonial: buildTestimonial,
  "feature-card": buildFeatureCard,
  "cta-banner": buildCtaBanner,
  footer: buildFooter,
  "stats-row": buildStatsRow,
}

export async function insertComponent(id: string, name: string) {
  const builder = BUILDERS[id]
  if (!builder) return

  if (!framer.isAllowedTo("addSVG")) {
    throw new Error(
      "This Framer workspace/plan doesn't allow plugins to insert SVGs (addSVG is blocked). This isn't a bug in the plugin — it's a permission gate on the workspace."
    )
  }

  await loadAllFonts()
  const svg = await builder()
  await framer.addSVG({ svg, name })
}
