import { framer, isCodeFileComponentExport } from "@framer/plugin"

interface ComponentDef {
  fileName: string
  tsx: string
}

const HERO_TSX = `export default function Hero() {
  return (
    <div style={{ width: 640, padding: "80px 60px", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#4A5AFF", letterSpacing: 1 }}>NEW · V2.0</div>
      <div style={{ fontSize: 40, fontWeight: 700, color: "#17171A", textAlign: "center", lineHeight: 1.1 }}>
        Design faster,<br />ship with confidence
      </div>
      <div style={{ fontSize: 16, color: "#73737A", textAlign: "center", maxWidth: 440 }}>
        A component library built for teams who care about speed and craft in equal measure.
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ padding: "10px 20px", borderRadius: 8, background: "#4A5AFF", color: "#fff", fontWeight: 600, fontSize: 14 }}>Get started</div>
        <div style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #E6E6E8", color: "#17171A", fontWeight: 600, fontSize: 14 }}>View docs</div>
      </div>
    </div>
  )
}
`

const NAVBAR_TSX = `export default function Navbar() {
  const linkStyle = { fontSize: 14, fontWeight: 600, color: "#73737A" }
  return (
    <div style={{ width: 720, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "#fff", borderBottom: "1px solid #E6E6E8", fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#17171A" }}>Acme</div>
      <div style={{ display: "flex", gap: 28 }}>
        <div style={linkStyle}>Product</div>
        <div style={linkStyle}>Pricing</div>
        <div style={linkStyle}>Docs</div>
        <div style={linkStyle}>Blog</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#17171A" }}>Log in</div>
        <div style={{ padding: "10px 20px", borderRadius: 8, background: "#4A5AFF", color: "#fff", fontWeight: 600, fontSize: 14 }}>Sign up</div>
      </div>
    </div>
  )
}
`

const PRICING_CARD_TSX = `export default function PricingCard() {
  const features = ["Unlimited projects", "Priority support", "Team collaboration", "Advanced analytics"]
  return (
    <div style={{ width: 280, padding: 28, borderRadius: 16, border: "1px solid #E6E6E8", background: "#fff", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#4A5AFF" }}>Pro</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#17171A" }}>$24</div>
        <div style={{ fontSize: 14, color: "#73737A" }}>/mo</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: "#4A5AFF", fontWeight: 700, fontSize: 13 }}>✓</div>
            <div style={{ fontSize: 13, color: "#17171A" }}>{f}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "10px 0", borderRadius: 8, background: "#4A5AFF", color: "#fff", fontWeight: 600, fontSize: 13 }}>Choose plan</div>
    </div>
  )
}
`

const TESTIMONIAL_TSX = `export default function Testimonial() {
  return (
    <div style={{ width: 420, padding: 32, borderRadius: 16, background: "#F7F7F8", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 500, color: "#17171A", lineHeight: 1.4 }}>
        "This tool cut our design-to-dev handoff time in half. It's become part of how we ship every week."
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ECEEFF" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#17171A" }}>Jordan Lee</div>
          <div style={{ fontSize: 12, color: "#73737A" }}>Design Lead, Northwind</div>
        </div>
      </div>
    </div>
  )
}
`

const FEATURE_CARD_TSX = `export default function FeatureCard() {
  return (
    <div style={{ width: 240, padding: 24, borderRadius: 14, border: "1px solid #E6E6E8", background: "#fff", display: "flex", flexDirection: "column", gap: 14, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ECEEFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5AFF", fontWeight: 700, fontSize: 16 }}>★</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#17171A" }}>Real-time sync</div>
      <div style={{ fontSize: 13, color: "#73737A", lineHeight: 1.4 }}>Changes reflect instantly across every teammate's canvas, no refresh needed.</div>
    </div>
  )
}
`

const CTA_BANNER_TSX = `export default function CtaBanner() {
  return (
    <div style={{ width: 680, padding: "40px 48px", borderRadius: 20, background: "#17171A", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "Inter, sans-serif" }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Ready to get started?</div>
        <div style={{ fontSize: 14, color: "#BEBEC3", marginTop: 6 }}>Join thousands of teams already shipping faster.</div>
      </div>
      <div style={{ padding: "12px 24px", borderRadius: 8, background: "#fff", color: "#17171A", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>Start free trial</div>
    </div>
  )
}
`

const FOOTER_TSX = `export default function Footer() {
  const groups = [
    { title: "Product", links: ["Overview", "Pricing", "Changelog"] },
    { title: "Company", links: ["About", "Careers", "Press"] },
    { title: "Resources", links: ["Docs", "Guides", "Support"] },
  ]
  return (
    <div style={{ width: 720, padding: "40px 48px 24px", background: "#fff", display: "flex", flexDirection: "column", gap: 32, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", gap: 60 }}>
        {groups.map((g) => (
          <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#17171A" }}>{g.title}</div>
            {g.links.map((l) => (
              <div key={l} style={{ fontSize: 13, color: "#73737A" }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid #E6E6E8" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#73737A" }}>
        <div>© 2026 Acme, Inc.</div>
        <div>Privacy · Terms</div>
      </div>
    </div>
  )
}
`

const STATS_ROW_TSX = `export default function StatsRow() {
  const stats = [
    { num: "120k+", label: "Active users" },
    { num: "4.9/5", label: "Average rating" },
    { num: "99.9%", label: "Uptime" },
  ]
  return (
    <div style={{ width: 400, display: "flex", padding: "24px 0", fontFamily: "Inter, sans-serif" }}>
      {stats.map((s) => (
        <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#17171A" }}>{s.num}</div>
          <div style={{ fontSize: 13, color: "#73737A" }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}
`

const COMPONENTS: Record<string, ComponentDef> = {
  hero: { fileName: "ComponentKit-Hero.tsx", tsx: HERO_TSX },
  navbar: { fileName: "ComponentKit-Navbar.tsx", tsx: NAVBAR_TSX },
  "pricing-card": { fileName: "ComponentKit-PricingCard.tsx", tsx: PRICING_CARD_TSX },
  testimonial: { fileName: "ComponentKit-Testimonial.tsx", tsx: TESTIMONIAL_TSX },
  "feature-card": { fileName: "ComponentKit-FeatureCard.tsx", tsx: FEATURE_CARD_TSX },
  "cta-banner": { fileName: "ComponentKit-CtaBanner.tsx", tsx: CTA_BANNER_TSX },
  footer: { fileName: "ComponentKit-Footer.tsx", tsx: FOOTER_TSX },
  "stats-row": { fileName: "ComponentKit-StatsRow.tsx", tsx: STATS_ROW_TSX },
}

const insertUrlCache = new Map<string, string>()

async function getInsertUrl(def: ComponentDef): Promise<string> {
  const cached = insertUrlCache.get(def.fileName)
  if (cached) return cached

  // Reuse the code file across sessions/reloads instead of creating a duplicate every time.
  let codeFile = await framer.getCodeFile(def.fileName)
  if (!codeFile) {
    codeFile = await framer.createCodeFile(def.fileName, def.tsx)
  }

  const componentExport = codeFile.exports.find(isCodeFileComponentExport)
  if (!componentExport) {
    throw new Error(`"${def.fileName}" has no component export — this shouldn't happen.`)
  }

  insertUrlCache.set(def.fileName, componentExport.insertURL)
  return componentExport.insertURL
}

export async function insertComponent(id: string, _name: string) {
  const def = COMPONENTS[id]
  if (!def) return

  if (!framer.isAllowedTo("createCodeFile", "addComponentInstance")) {
    throw new Error(
      "This Framer workspace/plan doesn't allow plugins to create code components. This isn't a bug in the plugin — it's a permission gate on the workspace."
    )
  }

  const url = await getInsertUrl(def)

  // Inserted as a linked instance, not detached layers. Confirmed (both by testing and by
  // Framer's own example plugin's source) that addDetachedComponentLayers only works on
  // pre-published, Framer-built module URLs — a CodeFile created at runtime via createCodeFile
  // is never structurally analyzable for detaching, preload or not. To free-form edit an
  // inserted component's text, use "Edit Code" in Framer's own right-click menu on the instance.
  await framer.addComponentInstance({ url })
}
