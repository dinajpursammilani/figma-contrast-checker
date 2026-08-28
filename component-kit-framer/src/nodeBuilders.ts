import { framer, isCodeFileComponentExport } from "@framer/plugin"

interface ComponentDef {
  fileName: string
  tsx: string
}

const HERO_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function Hero(props) {
  const { eyebrow, heading, subheading, primaryLabel, secondaryLabel } = props
  return (
    <div style={{ width: 640, padding: "80px 60px", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#4A5AFF", letterSpacing: 1 }}>{eyebrow}</div>
      <div style={{ fontSize: 40, fontWeight: 700, color: "#17171A", textAlign: "center", lineHeight: 1.1, whiteSpace: "pre-line" }}>
        {heading}
      </div>
      <div style={{ fontSize: 16, color: "#73737A", textAlign: "center", maxWidth: 440 }}>
        {subheading}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ padding: "10px 20px", borderRadius: 8, background: "#4A5AFF", color: "#fff", fontWeight: 600, fontSize: 14 }}>{primaryLabel}</div>
        <div style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #E6E6E8", color: "#17171A", fontWeight: 600, fontSize: 14 }}>{secondaryLabel}</div>
      </div>
    </div>
  )
}

Hero.defaultProps = {
  eyebrow: "NEW · V2.0",
  heading: "Design faster,\\nship with confidence",
  subheading: "A component library built for teams who care about speed and craft in equal measure.",
  primaryLabel: "Get started",
  secondaryLabel: "View docs",
}

addPropertyControls(Hero, {
  eyebrow: { type: ControlType.String, title: "Eyebrow" },
  heading: { type: ControlType.String, title: "Heading", displayTextArea: true },
  subheading: { type: ControlType.String, title: "Subheading", displayTextArea: true },
  primaryLabel: { type: ControlType.String, title: "Primary button" },
  secondaryLabel: { type: ControlType.String, title: "Secondary button" },
})
`

const NAVBAR_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function Navbar(props) {
  const { logo, link1, link2, link3, link4, loginLabel, signupLabel } = props
  const linkStyle = { fontSize: 14, fontWeight: 600, color: "#73737A" }
  return (
    <div style={{ width: 720, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "#fff", borderBottom: "1px solid #E6E6E8", fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#17171A" }}>{logo}</div>
      <div style={{ display: "flex", gap: 28 }}>
        <div style={linkStyle}>{link1}</div>
        <div style={linkStyle}>{link2}</div>
        <div style={linkStyle}>{link3}</div>
        <div style={linkStyle}>{link4}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#17171A" }}>{loginLabel}</div>
        <div style={{ padding: "10px 20px", borderRadius: 8, background: "#4A5AFF", color: "#fff", fontWeight: 600, fontSize: 14 }}>{signupLabel}</div>
      </div>
    </div>
  )
}

Navbar.defaultProps = {
  logo: "Acme",
  link1: "Product",
  link2: "Pricing",
  link3: "Docs",
  link4: "Blog",
  loginLabel: "Log in",
  signupLabel: "Sign up",
}

addPropertyControls(Navbar, {
  logo: { type: ControlType.String, title: "Logo" },
  link1: { type: ControlType.String, title: "Link 1" },
  link2: { type: ControlType.String, title: "Link 2" },
  link3: { type: ControlType.String, title: "Link 3" },
  link4: { type: ControlType.String, title: "Link 4" },
  loginLabel: { type: ControlType.String, title: "Login label" },
  signupLabel: { type: ControlType.String, title: "Signup label" },
})
`

const PRICING_CARD_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function PricingCard(props) {
  const { plan, price, period, feature1, feature2, feature3, feature4, ctaLabel } = props
  const features = [feature1, feature2, feature3, feature4]
  return (
    <div style={{ width: 280, padding: 28, borderRadius: 16, border: "1px solid #E6E6E8", background: "#fff", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#4A5AFF" }}>{plan}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#17171A" }}>{price}</div>
        <div style={{ fontSize: 14, color: "#73737A" }}>{period}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: "#4A5AFF", fontWeight: 700, fontSize: 13 }}>✓</div>
            <div style={{ fontSize: 13, color: "#17171A" }}>{f}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "10px 0", borderRadius: 8, background: "#4A5AFF", color: "#fff", fontWeight: 600, fontSize: 13 }}>{ctaLabel}</div>
    </div>
  )
}

PricingCard.defaultProps = {
  plan: "Pro",
  price: "$24",
  period: "/mo",
  feature1: "Unlimited projects",
  feature2: "Priority support",
  feature3: "Team collaboration",
  feature4: "Advanced analytics",
  ctaLabel: "Choose plan",
}

addPropertyControls(PricingCard, {
  plan: { type: ControlType.String, title: "Plan name" },
  price: { type: ControlType.String, title: "Price" },
  period: { type: ControlType.String, title: "Period" },
  feature1: { type: ControlType.String, title: "Feature 1" },
  feature2: { type: ControlType.String, title: "Feature 2" },
  feature3: { type: ControlType.String, title: "Feature 3" },
  feature4: { type: ControlType.String, title: "Feature 4" },
  ctaLabel: { type: ControlType.String, title: "Button label" },
})
`

const TESTIMONIAL_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function Testimonial(props) {
  const { quote, name, role } = props
  return (
    <div style={{ width: 420, padding: 32, borderRadius: 16, background: "#F7F7F8", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 500, color: "#17171A", lineHeight: 1.4 }}>
        {quote}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ECEEFF" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#17171A" }}>{name}</div>
          <div style={{ fontSize: 12, color: "#73737A" }}>{role}</div>
        </div>
      </div>
    </div>
  )
}

Testimonial.defaultProps = {
  quote: "\\"This tool cut our design-to-dev handoff time in half. It's become part of how we ship every week.\\"",
  name: "Jordan Lee",
  role: "Design Lead, Northwind",
}

addPropertyControls(Testimonial, {
  quote: { type: ControlType.String, title: "Quote", displayTextArea: true },
  name: { type: ControlType.String, title: "Name" },
  role: { type: ControlType.String, title: "Role" },
})
`

const FEATURE_CARD_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function FeatureCard(props) {
  const { icon, title, description } = props
  return (
    <div style={{ width: 240, padding: 24, borderRadius: 14, border: "1px solid #E6E6E8", background: "#fff", display: "flex", flexDirection: "column", gap: 14, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ECEEFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4A5AFF", fontWeight: 700, fontSize: 16 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#17171A" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#73737A", lineHeight: 1.4 }}>{description}</div>
    </div>
  )
}

FeatureCard.defaultProps = {
  icon: "★",
  title: "Real-time sync",
  description: "Changes reflect instantly across every teammate's canvas, no refresh needed.",
}

addPropertyControls(FeatureCard, {
  icon: { type: ControlType.String, title: "Icon" },
  title: { type: ControlType.String, title: "Title" },
  description: { type: ControlType.String, title: "Description", displayTextArea: true },
})
`

const CTA_BANNER_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function CtaBanner(props) {
  const { heading, subtext, ctaLabel } = props
  return (
    <div style={{ width: 680, padding: "40px 48px", borderRadius: 20, background: "#17171A", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "Inter, sans-serif" }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{heading}</div>
        <div style={{ fontSize: 14, color: "#BEBEC3", marginTop: 6 }}>{subtext}</div>
      </div>
      <div style={{ padding: "12px 24px", borderRadius: 8, background: "#fff", color: "#17171A", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>{ctaLabel}</div>
    </div>
  )
}

CtaBanner.defaultProps = {
  heading: "Ready to get started?",
  subtext: "Join thousands of teams already shipping faster.",
  ctaLabel: "Start free trial",
}

addPropertyControls(CtaBanner, {
  heading: { type: ControlType.String, title: "Heading" },
  subtext: { type: ControlType.String, title: "Subtext", displayTextArea: true },
  ctaLabel: { type: ControlType.String, title: "Button label" },
})
`

const FOOTER_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function Footer(props) {
  const { col1Title, col1Links, col2Title, col2Links, col3Title, col3Links, copyright, legalLinks } = props
  const groups = [
    { title: col1Title, links: col1Links.split(",").map((s) => s.trim()) },
    { title: col2Title, links: col2Links.split(",").map((s) => s.trim()) },
    { title: col3Title, links: col3Links.split(",").map((s) => s.trim()) },
  ]
  return (
    <div style={{ width: 720, padding: "40px 48px 24px", background: "#fff", display: "flex", flexDirection: "column", gap: 32, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", gap: 60 }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#17171A" }}>{g.title}</div>
            {g.links.map((l, li) => (
              <div key={li} style={{ fontSize: 13, color: "#73737A" }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid #E6E6E8" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#73737A" }}>
        <div>{copyright}</div>
        <div>{legalLinks}</div>
      </div>
    </div>
  )
}

Footer.defaultProps = {
  col1Title: "Product",
  col1Links: "Overview, Pricing, Changelog",
  col2Title: "Company",
  col2Links: "About, Careers, Press",
  col3Title: "Resources",
  col3Links: "Docs, Guides, Support",
  copyright: "© 2026 Acme, Inc.",
  legalLinks: "Privacy · Terms",
}

addPropertyControls(Footer, {
  col1Title: { type: ControlType.String, title: "Column 1 title" },
  col1Links: { type: ControlType.String, title: "Column 1 links" },
  col2Title: { type: ControlType.String, title: "Column 2 title" },
  col2Links: { type: ControlType.String, title: "Column 2 links" },
  col3Title: { type: ControlType.String, title: "Column 3 title" },
  col3Links: { type: ControlType.String, title: "Column 3 links" },
  copyright: { type: ControlType.String, title: "Copyright" },
  legalLinks: { type: ControlType.String, title: "Legal links" },
})
`

const STATS_ROW_TSX = `import { addPropertyControls, ControlType } from "framer"

export default function StatsRow(props) {
  const { num1, label1, num2, label2, num3, label3 } = props
  const stats = [
    { num: num1, label: label1 },
    { num: num2, label: label2 },
    { num: num3, label: label3 },
  ]
  return (
    <div style={{ width: 400, display: "flex", padding: "24px 0", fontFamily: "Inter, sans-serif" }}>
      {stats.map((s, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#17171A" }}>{s.num}</div>
          <div style={{ fontSize: 13, color: "#73737A" }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

StatsRow.defaultProps = {
  num1: "120k+",
  label1: "Active users",
  num2: "4.9/5",
  label2: "Average rating",
  num3: "99.9%",
  label3: "Uptime",
}

addPropertyControls(StatsRow, {
  num1: { type: ControlType.String, title: "Stat 1 number" },
  label1: { type: ControlType.String, title: "Stat 1 label" },
  num2: { type: ControlType.String, title: "Stat 2 number" },
  label2: { type: ControlType.String, title: "Stat 2 label" },
  num3: { type: ControlType.String, title: "Stat 3 number" },
  label3: { type: ControlType.String, title: "Stat 3 label" },
})
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
  // If it already exists but the plugin's source has since changed, sync it — otherwise a
  // stale version (e.g. from before property controls were added) would keep getting inserted.
  let codeFile = await framer.getCodeFile(def.fileName)
  if (!codeFile) {
    codeFile = await framer.createCodeFile(def.fileName, def.tsx)
  } else if (codeFile.content !== def.tsx) {
    codeFile = await codeFile.setFileContent(def.tsx)
  }

  const componentExport = codeFile.exports.find(isCodeFileComponentExport)
  if (!componentExport) {
    throw new Error(`"${def.fileName}" has no component export — this shouldn't happen.`)
  }

  insertUrlCache.set(def.fileName, componentExport.insertURL)
  return componentExport.insertURL
}

// TEMPORARY: proves the cross-project "Unlink Instance" flow works with a real published
// component, using Framer's own public example URL (from their design-system example plugin),
// not anything scraped from Kompa. Remove once we've validated the architecture.
export async function insertExternalTestButton() {
  await framer.addComponentInstance({ url: "https://framer.com/m/Button-vh3D.js" })
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
