import { framer } from "@framer/plugin"

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

function svgWrap(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
}

function rect(x: number, y: number, w: number, h: number, opts: { fill?: string; rx?: number; stroke?: string } = {}) {
  const { fill = "none", rx = 0, stroke } = opts
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="1"` : ""
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${strokeAttr}/>`
}

/** A rounded bar standing in for a line of text, sized proportionally to `chars`. */
function line(x: number, y: number, chars: number, opts: { size: number; color?: string; charWidth?: number; centered?: boolean; totalWidth?: number }) {
  const { size, color = COLOR.ink, charWidth = 0.58, centered = false, totalWidth } = opts
  const w = Math.max(chars * size * charWidth, size)
  const h = Math.max(size * 0.62, 3)
  const rx = h / 2
  const drawX = centered && totalWidth ? x + (totalWidth - w) / 2 : x
  return rect(drawX, y, w, h, { fill: color, rx })
}

function button(x: number, y: number, labelChars: number, filled: boolean): { svg: string; width: number } {
  const w = labelChars * 8 + 40
  const h = 38
  const bg = filled ? COLOR.accent : COLOR.white
  const stroke = filled ? undefined : COLOR.border
  const labelColor = filled ? COLOR.white : COLOR.ink
  let body = rect(x, y, w, h, { fill: bg, rx: 8, stroke })
  body += line(x, y + h / 2 - 4, labelChars, { size: 13, color: labelColor, centered: true, totalWidth: w })
  return { svg: body, width: w }
}

function buttonSvg(x: number, y: number, labelChars: number, filled: boolean): string {
  return button(x, y, labelChars, filled).svg
}

// ---- Component templates ----

function buildHero(): string {
  const w = 640
  const h = 340
  let body = rect(0, 0, w, h, { fill: COLOR.white })
  body += line(0, 56, 10, { size: 12, color: COLOR.accent, centered: true, totalWidth: w })
  body += line(0, 86, 22, { size: 34, color: COLOR.ink, centered: true, totalWidth: w })
  body += line(0, 130, 26, { size: 34, color: COLOR.ink, centered: true, totalWidth: w })
  body += line(0, 178, 46, { size: 15, color: COLOR.inkMuted, centered: true, totalWidth: w })
  body += line(0, 200, 34, { size: 15, color: COLOR.inkMuted, centered: true, totalWidth: w })

  const btn1 = button(w / 2 - 155, 244, 11, true)
  const btn2 = button(w / 2 - 155 + btn1.width + 12, 244, 9, false)
  body += btn1.svg + btn2.svg

  return svgWrap(w, h, body)
}

function buildNavbar(): string {
  const w = 720
  const h = 64
  let body = rect(0, 0, w, h, { fill: COLOR.white, stroke: COLOR.border })
  body += line(32, 28, 5, { size: 18, color: COLOR.ink })

  let lx = 300
  for (const chars of [7, 7, 4, 4]) {
    body += line(lx, 30, chars, { size: 14, color: COLOR.inkMuted })
    lx += chars * 14 * 0.58 + 32
  }

  body += line(w - 160, 30, 6, { size: 14, color: COLOR.ink })
  body += buttonSvg(w - 108, 13, 7, true)
  return svgWrap(w, h, body)
}

function buildPricingCard(): string {
  const w = 280
  const h = 340
  let body = rect(0, 0, w, h, { fill: COLOR.white, rx: 16, stroke: COLOR.border })
  body += line(28, 38, 3, { size: 14, color: COLOR.accent })
  body += line(28, 68, 3, { size: 36, color: COLOR.ink })
  body += line(102, 84, 3, { size: 14, color: COLOR.inkMuted })

  const features = [19, 15, 18, 17]
  let fy = 132
  for (const chars of features) {
    body += `<circle cx="34" cy="${fy + 6}" r="7" fill="${COLOR.accentSoft}"/>`
    body += line(46, fy, chars, { size: 13, color: COLOR.ink })
    fy += 26
  }

  body += rect(28, h - 62, w - 56, 38, { fill: COLOR.accent, rx: 8 })
  body += line(28, h - 62 + 15, 11, { size: 13, color: COLOR.white, centered: true, totalWidth: w - 56 })
  return svgWrap(w, h, body)
}

function buildTestimonial(): string {
  const w = 420
  const h = 200
  let body = rect(0, 0, w, h, { fill: COLOR.surface, rx: 16 })
  body += line(32, 40, 45, { size: 17, color: COLOR.ink })
  body += line(32, 66, 42, { size: 17, color: COLOR.ink })
  body += `<circle cx="50" cy="140" r="18" fill="${COLOR.accentSoft}"/>`
  body += line(80, 130, 10, { size: 13, color: COLOR.ink })
  body += line(80, 148, 20, { size: 12, color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

function buildFeatureCard(): string {
  const w = 240
  const h = 190
  let body = rect(0, 0, w, h, { fill: COLOR.white, rx: 14, stroke: COLOR.border })
  body += rect(24, 24, 40, 40, { fill: COLOR.accentSoft, rx: 10 })
  body += `<circle cx="44" cy="44" r="6" fill="${COLOR.accent}"/>`
  body += line(24, 92, 14, { size: 15, color: COLOR.ink })
  body += line(24, 116, 36, { size: 13, color: COLOR.inkMuted })
  body += line(24, 134, 33, { size: 13, color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

function buildCtaBanner(): string {
  const w = 680
  const h = 140
  let body = rect(0, 0, w, h, { fill: COLOR.banner, rx: 20 })
  body += line(48, 48, 22, { size: 22, color: COLOR.white })
  body += line(48, 82, 48, { size: 14, color: COLOR.bannerMuted })
  body += rect(w - 208, 50, 160, 42, { fill: COLOR.white, rx: 8 })
  body += line(w - 208, 65, 15, { size: 14, color: COLOR.ink, centered: true, totalWidth: 160 })
  return svgWrap(w, h, body)
}

function buildFooter(): string {
  const w = 720
  const h = 200
  let body = rect(0, 0, w, h, { fill: COLOR.white })
  const groups: [number, number[]][] = [
    [7, [8, 7, 9]],
    [7, [5, 7, 5]],
    [9, [4, 6, 7]],
  ]
  let gx = 48
  for (const [titleChars, linkChars] of groups) {
    body += line(gx, 46, titleChars, { size: 13, color: COLOR.ink })
    let ly = 72
    for (const chars of linkChars) {
      body += line(gx, ly, chars, { size: 13, color: COLOR.inkMuted })
      ly += 22
    }
    gx += 160
  }
  body += rect(48, 150, w - 96, 1, { fill: COLOR.border })
  body += line(48, 174, 16, { size: 12, color: COLOR.inkMuted })
  body += line(w - 48 - 90, 174, 12, { size: 12, color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

function buildStatsRow(): string {
  const w = 400
  const h = 100
  let body = ""
  const stats: [number, number][] = [
    [5, 12],
    [5, 14],
    [5, 7],
  ]
  const colW = w / stats.length
  stats.forEach(([numChars, labelChars], i) => {
    const cx = colW * i
    body += line(cx, 36, numChars, { size: 28, color: COLOR.ink, centered: true, totalWidth: colW })
    body += line(cx, 62, labelChars, { size: 13, color: COLOR.inkMuted, centered: true, totalWidth: colW })
  })
  return svgWrap(w, h, body)
}

const BUILDERS: Record<string, () => string> = {
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
  const svg = builder()
  await framer.addSVG({ svg, name })
}
