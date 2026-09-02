// Monochrome outline icons (currentColor, no fills) — replaces emoji throughout the UI so
// chrome reads as one consistent, deliberate icon set instead of whatever a given OS renders
// for 🏠/🔖/🎨.
import type { SVGProps } from "react"

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </Icon>
  )
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m12 3 8 4.2-8 4.2-8-4.2Z" />
      <path d="m4 12.2 8 4.2 8-4.2" />
      <path d="m4 16.4 8 4.2 8-4.2" />
    </Icon>
  )
}

export function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.2a.4.4 0 0 1-.63.32L12 16l-5.87 4.52a.4.4 0 0 1-.63-.32V4a.5.5 0 0 1 .5-.5Z" />
    </Icon>
  )
}

export function PaletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 8.5 0 1 0 0 17c1.1 0 1.6-.6 1.6-1.4 0-.4-.2-.7-.4-1a1.4 1.4 0 0 1 1-2.4H16a4 3.6 0 0 0 4-3.6C20 6.6 16.4 3 12 3Z" />
      <circle cx="7.2" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="7.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  // Six evenly-spaced ticks via SVG's own rotate transform (exact, no hand trig to get wrong)
  // instead of a hand-approximated gear outline — reads as a clean, symmetric gear at 16px.
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line key={deg} x1="12" y1="3.6" x2="12" y2="1.6" transform={`rotate(${deg} 12 12)`} />
      ))}
    </Icon>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </Icon>
  )
}

export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M19 18h1" />
      <circle cx="13" cy="6" r="2" fill="var(--bg-subtle)" />
      <circle cx="6" cy="12" r="2" fill="var(--bg-subtle)" />
      <circle cx="17" cy="18" r="2" fill="var(--bg-subtle)" />
    </Icon>
  )
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </Icon>
  )
}

export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.8 5.2a.5.5 0 0 1-.4.4l-5.2 1.8 1.8-5.2a.5.5 0 0 1 .4-.4Z" />
    </Icon>
  )
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </Icon>
  )
}

export function CreditCardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 15h4" />
    </Icon>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  )
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Icon>
  )
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Icon>
  )
}

export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 7.5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    </Icon>
  )
}

export function MessageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4Z" />
    </Icon>
  )
}

export function BugIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="6" y="8" width="12" height="11" rx="4" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2M4.5 12h2M17.5 12h2M6 9l-2-2M18 9l2-2M9 19v1M15 19v1" />
    </Icon>
  )
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  )
}

export function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 0 1 14.2-5M20 12a8 8 0 0 1-14.2 5" />
      <path d="M18 4v4h-4M6 20v-4h4" />
    </Icon>
  )
}

export function ImageStackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="14" height="12" rx="2" />
      <path d="m4 15 3.5-3.5a1.5 1.5 0 0 1 2 0L14 15" />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
    </Icon>
  )
}

export function CrownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m4 8 3.5 3L12 5l4.5 6L20 8l-1.5 10h-13Z" />
    </Icon>
  )
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </Icon>
  )
}

export function BoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </Icon>
  )
}

export function LayoutBannerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M8 13h8M8 16.5h5" />
    </Icon>
  )
}

export function TagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M11.5 3H5.5a2 2 0 0 0-2 2v6l10 10a2 2 0 0 0 2.83 0l6.17-6.17a2 2 0 0 0 0-2.83Z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </Icon>
  )
}

export function QuoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9.5 6.5c-2.8 0-5 2.2-5 5v6h6v-6h-3.2c0-1.7 1-3 2.7-3.4Z" />
      <path d="M19 6.5c-2.8 0-5 2.2-5 5v6h6v-6h-3.2c0-1.7 1-3 2.7-3.4Z" />
    </Icon>
  )
}

export function QuestionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.5a2.7 2.7 0 1 1 3.9 2.4c-.8.5-1.2.9-1.2 1.9" />
      <path d="M12 17.2v.1" />
    </Icon>
  )
}

export function FormIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="4.5" rx="1.2" />
      <rect x="3" y="12.5" width="18" height="4.5" rx="1.2" />
      <path d="M6 7.25h.01M6 14.75h.01" />
    </Icon>
  )
}

export function ButtonShapeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M8.5 12h7" />
    </Icon>
  )
}

export function FooterBarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 4h16M4 8h16" />
      <rect x="4" y="14" width="16" height="6" rx="1.2" />
    </Icon>
  )
}

export function categoryIconFor(category: string) {
  switch (category) {
    case "Sections":
      return GridIcon
    case "Navigation":
      return CompassIcon
    case "Cards":
      return CreditCardIcon
    case "Components":
      return BoxIcon
    case "Hero":
    case "Heroes":
      return LayoutBannerIcon
    case "Pricing":
      return TagIcon
    case "Testimonials":
      return QuoteIcon
    case "FAQ":
    case "FAQs":
      return QuestionIcon
    case "Forms":
      return FormIcon
    case "Buttons":
      return ButtonShapeIcon
    case "Footer":
      return FooterBarIcon
    default:
      return SparkleIcon
  }
}
