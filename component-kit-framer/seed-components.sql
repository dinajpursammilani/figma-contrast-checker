-- Generated seed data for the components table. Run after creating the schema.

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'hero',
  'Hero',
  'Sections',
  false,
  '<svg viewBox="0 0 200 84"><rect width="200" height="84" fill="none"/>
      <rect x="70" y="14" width="60" height="4" rx="2" fill="var(--accent)"/>
      <rect x="40" y="26" width="120" height="8" rx="2" fill="var(--text)"/>
      <rect x="55" y="40" width="90" height="6" rx="2" fill="var(--text-muted)"/>
      <rect x="75" y="56" width="50" height="16" rx="8" fill="var(--accent)"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
  heading: "Design faster,\nship with confidence",
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
',
  'ComponentKit-Hero.tsx',
  0
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'navbar',
  'Navbar',
  'Navigation',
  false,
  '<svg viewBox="0 0 200 84"><rect x="10" y="30" width="180" height="24" rx="6" fill="none" stroke="var(--border)"/>
      <rect x="20" y="38" width="30" height="8" rx="2" fill="var(--text)"/>
      <rect x="80" y="40" width="20" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="108" y="40" width="20" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="150" y="37" width="30" height="10" rx="5" fill="var(--accent)"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
',
  'ComponentKit-Navbar.tsx',
  1
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'pricing-card',
  'Pricing Card',
  'Cards',
  false,
  '<svg viewBox="0 0 200 84"><rect x="60" y="6" width="80" height="72" rx="8" fill="none" stroke="var(--border)"/>
      <rect x="70" y="16" width="20" height="5" rx="2" fill="var(--accent)"/>
      <rect x="70" y="26" width="40" height="12" rx="2" fill="var(--text)"/>
      <rect x="70" y="46" width="45" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="70" y="54" width="45" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="70" y="64" width="60" height="10" rx="5" fill="var(--accent)"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
',
  'ComponentKit-PricingCard.tsx',
  2
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'testimonial',
  'Testimonial',
  'Sections',
  false,
  '<svg viewBox="0 0 200 84"><rect x="30" y="8" width="140" height="68" rx="10" fill="none" stroke="var(--border)"/>
      <rect x="42" y="20" width="116" height="5" rx="2" fill="var(--text-muted)"/>
      <rect x="42" y="30" width="90" height="5" rx="2" fill="var(--text-muted)"/>
      <circle cx="52" cy="58" r="8" fill="var(--accent)" opacity="0.35"/>
      <rect x="66" y="54" width="40" height="4" rx="2" fill="var(--text)"/>
      <rect x="66" y="61" width="55" height="4" rx="2" fill="var(--text-muted)"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
  quote: "\"This tool cut our design-to-dev handoff time in half. It''s become part of how we ship every week.\"",
  name: "Jordan Lee",
  role: "Design Lead, Northwind",
}

addPropertyControls(Testimonial, {
  quote: { type: ControlType.String, title: "Quote", displayTextArea: true },
  name: { type: ControlType.String, title: "Name" },
  role: { type: ControlType.String, title: "Role" },
})
',
  'ComponentKit-Testimonial.tsx',
  3
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'feature-card',
  'Feature Card',
  'Cards',
  false,
  '<svg viewBox="0 0 200 84"><rect x="55" y="10" width="90" height="64" rx="8" fill="none" stroke="var(--border)"/>
      <rect x="65" y="20" width="18" height="18" rx="5" fill="var(--accent)" opacity="0.35"/>
      <rect x="65" y="46" width="50" height="6" rx="2" fill="var(--text)"/>
      <rect x="65" y="56" width="65" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="65" y="63" width="55" height="4" rx="2" fill="var(--text-muted)"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
  description: "Changes reflect instantly across every teammate''s canvas, no refresh needed.",
}

addPropertyControls(FeatureCard, {
  icon: { type: ControlType.String, title: "Icon" },
  title: { type: ControlType.String, title: "Title" },
  description: { type: ControlType.String, title: "Description", displayTextArea: true },
})
',
  'ComponentKit-FeatureCard.tsx',
  4
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'cta-banner',
  'CTA Banner',
  'Sections',
  false,
  '<svg viewBox="0 0 200 84"><rect x="20" y="24" width="160" height="36" rx="8" fill="#1a1a1c" stroke="var(--border)"/>
      <rect x="32" y="35" width="60" height="6" rx="2" fill="white"/>
      <rect x="32" y="44" width="80" height="4" rx="2" fill="#8a8a90"/>
      <rect x="140" y="34" width="30" height="16" rx="8" fill="white"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
',
  'ComponentKit-CtaBanner.tsx',
  5
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'footer',
  'Footer',
  'Navigation',
  false,
  '<svg viewBox="0 0 200 84">
      <rect x="20" y="12" width="24" height="4" rx="2" fill="var(--text)"/>
      <rect x="20" y="20" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="20" y="26" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="90" y="12" width="24" height="4" rx="2" fill="var(--text)"/>
      <rect x="90" y="20" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="90" y="26" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="160" y="12" width="20" height="4" rx="2" fill="var(--text)"/>
      <rect x="160" y="20" width="16" height="3" rx="1.5" fill="var(--text-muted)"/>
      <line x1="20" y1="48" x2="180" y2="48" stroke="var(--border)"/>
      <rect x="20" y="58" width="50" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="140" y="58" width="40" height="4" rx="2" fill="var(--text-muted)"/>
    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
',
  'ComponentKit-Footer.tsx',
  6
);

insert into components (id, name, category, is_pro, preview_svg, tsx_source, file_name, sort_order) values (
  'stats-row',
  'Stats Row',
  'Sections',
  false,
  '<svg viewBox="0 0 200 84">

        <rect x="15" y="30" width="40" height="10" rx="2" fill="var(--text)"/>
        <rect x="20" y="46" width="30" height="4" rx="2" fill="var(--text-muted)"/>

        <rect x="80" y="30" width="40" height="10" rx="2" fill="var(--text)"/>
        <rect x="85" y="46" width="30" height="4" rx="2" fill="var(--text-muted)"/>

        <rect x="145" y="30" width="40" height="10" rx="2" fill="var(--text)"/>
        <rect x="150" y="46" width="30" height="4" rx="2" fill="var(--text-muted)"/>

    </svg>',
  'import { addPropertyControls, ControlType } from "framer"

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
',
  'ComponentKit-StatsRow.tsx',
  7
);

