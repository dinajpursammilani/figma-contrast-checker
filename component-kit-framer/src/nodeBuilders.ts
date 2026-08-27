import { framer } from "@framer/plugin"

const FONT = "Inter, -apple-system, 'Helvetica Neue', sans-serif"

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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function text(x: number, y: number, content: string, opts: { size: number; weight?: number; color?: string; anchor?: "start" | "middle" | "end" }) {
  const { size, weight = 400, color = COLOR.ink, anchor = "start" } = opts
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(content)}</text>`
}

function rect(x: number, y: number, w: number, h: number, opts: { fill?: string; rx?: number; stroke?: string } = {}) {
  const { fill = "none", rx = 0, stroke } = opts
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="1"` : ""
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${strokeAttr}/>`
}

function button(x: number, y: number, label: string, filled: boolean): string {
  const w = label.length * 7.5 + 40
  const h = 38
  const bg = filled ? COLOR.accent : COLOR.white
  const stroke = filled ? undefined : COLOR.border
  const textColor = filled ? COLOR.white : COLOR.ink
  return rect(x, y, w, h, { fill: bg, rx: 8, stroke }) + text(x + w / 2, y + h / 2 + 5, label, { size: 14, weight: 600, color: textColor, anchor: "middle" })
}

// ---- Component templates ----

function buildHero(): string {
  const w = 640
  const h = 340
  let body = rect(0, 0, w, h, { fill: COLOR.white })
  body += text(w / 2, 60, "NEW · V2.0", { size: 12, weight: 700, color: COLOR.accent, anchor: "middle" })
  body += text(w / 2, 108, "Design faster,", { size: 38, weight: 700, color: COLOR.ink, anchor: "middle" })
  body += text(w / 2, 150, "ship with confidence", { size: 38, weight: 700, color: COLOR.ink, anchor: "middle" })
  body += text(w / 2, 190, "A component library built for teams who care about", { size: 15, weight: 400, color: COLOR.inkMuted, anchor: "middle" })
  body += text(w / 2, 212, "speed and craft in equal measure.", { size: 15, weight: 400, color: COLOR.inkMuted, anchor: "middle" })
  body += button(w / 2 - 155, 244, "Get started", true)
  body += button(w / 2 + 10, 244, "View docs", false)
  return svgWrap(w, h, body)
}

function buildNavbar(): string {
  const w = 720
  const h = 64
  let body = rect(0, 0, w, h, { fill: COLOR.white, stroke: COLOR.border })
  body += text(32, 38, "Acme", { size: 18, weight: 700, color: COLOR.ink })
  const links = ["Product", "Pricing", "Docs", "Blog"]
  let lx = 300
  for (const l of links) {
    body += text(lx, 37, l, { size: 14, weight: 600, color: COLOR.inkMuted })
    lx += l.length * 7.5 + 32
  }
  body += text(w - 160, 38, "Log in", { size: 14, weight: 600, color: COLOR.ink })
  body += button(w - 110, 15, "Sign up", true)
  return svgWrap(w, h, body)
}

function buildPricingCard(): string {
  const w = 280
  const h = 340
  let body = rect(0, 0, w, h, { fill: COLOR.white, rx: 16, stroke: COLOR.border })
  body += text(28, 48, "Pro", { size: 14, weight: 700, color: COLOR.accent })
  body += text(28, 96, "$24", { size: 36, weight: 700, color: COLOR.ink })
  body += text(78, 96, "/mo", { size: 14, weight: 400, color: COLOR.inkMuted })

  const features = ["Unlimited projects", "Priority support", "Team collaboration", "Advanced analytics"]
  let fy = 136
  for (const f of features) {
    body += text(28, fy, "✓", { size: 13, weight: 700, color: COLOR.accent })
    body += text(46, fy, f, { size: 13, weight: 400, color: COLOR.ink })
    fy += 26
  }

  body += button(28, h - 62, "Choose plan", true).replace(/width="\d+(\.\d+)?"/, `width="${w - 56}"`)
  return svgWrap(w, h, body)
}

function buildTestimonial(): string {
  const w = 420
  const h = 200
  let body = rect(0, 0, w, h, { fill: COLOR.surface, rx: 16 })
  body += text(32, 48, "“This tool cut our design-to-dev handoff time", { size: 17, weight: 600, color: COLOR.ink })
  body += text(32, 74, "in half. It's become part of how we ship every week.”", { size: 17, weight: 600, color: COLOR.ink })
  body += `<circle cx="50" cy="140" r="18" fill="${COLOR.accentSoft}"/>`
  body += text(80, 136, "Jordan Lee", { size: 13, weight: 700, color: COLOR.ink })
  body += text(80, 154, "Design Lead, Northwind", { size: 12, weight: 400, color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

function buildFeatureCard(): string {
  const w = 240
  const h = 190
  let body = rect(0, 0, w, h, { fill: COLOR.white, rx: 14, stroke: COLOR.border })
  body += rect(24, 24, 40, 40, { fill: COLOR.accentSoft, rx: 10 })
  body += text(44, 50, "★", { size: 18, weight: 700, color: COLOR.accent, anchor: "middle" })
  body += text(24, 100, "Real-time sync", { size: 15, weight: 700, color: COLOR.ink })
  body += text(24, 124, "Changes reflect instantly across every", { size: 13, weight: 400, color: COLOR.inkMuted })
  body += text(24, 142, "teammate's canvas, no refresh needed.", { size: 13, weight: 400, color: COLOR.inkMuted })
  return svgWrap(w, h, body)
}

function buildCtaBanner(): string {
  const w = 680
  const h = 140
  let body = rect(0, 0, w, h, { fill: COLOR.banner, rx: 20 })
  body += text(48, 62, "Ready to get started?", { size: 22, weight: 700, color: COLOR.white })
  body += text(48, 88, "Join thousands of teams already shipping faster.", { size: 14, weight: 400, color: COLOR.bannerMuted })
  const btn = rect(w - 208, 50, 160, 42, { fill: COLOR.white, rx: 8 }) + text(w - 128, 76, "Start free trial", { size: 14, weight: 600, color: COLOR.ink, anchor: "middle" })
  body += btn
  return svgWrap(w, h, body)
}

function buildFooter(): string {
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
    body += text(gx, 52, title, { size: 13, weight: 700, color: COLOR.ink })
    let ly = 78
    for (const l of links) {
      body += text(gx, ly, l, { size: 13, weight: 400, color: COLOR.inkMuted })
      ly += 22
    }
    gx += 160
  }
  body += rect(48, 150, w - 96, 1, { fill: COLOR.border })
  body += text(48, 180, "© 2026 Acme, Inc.", { size: 12, weight: 400, color: COLOR.inkMuted })
  body += text(w - 48, 180, "Privacy · Terms", { size: 12, weight: 400, color: COLOR.inkMuted, anchor: "end" })
  return svgWrap(w, h, body)
}

function buildStatsRow(): string {
  const w = 400
  const h = 100
  let body = ""
  const stats: [string, string][] = [
    ["120k+", "Active users"],
    ["4.9/5", "Average rating"],
    ["99.9%", "Uptime"],
  ]
  const colW = w / stats.length
  stats.forEach(([num, label], i) => {
    const cx = colW * i + colW / 2
    body += text(cx, 44, num, { size: 28, weight: 700, color: COLOR.ink, anchor: "middle" })
    body += text(cx, 68, label, { size: 13, weight: 400, color: COLOR.inkMuted, anchor: "middle" })
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
