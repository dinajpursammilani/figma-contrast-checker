import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { framer } from "@framer/plugin"
import { insertComponent } from "./nodeBuilders"
import { restoreSession, signOut } from "./lib/auth"
import Login from "./Login"

const THEME_KEY = "theme-preference"
type ThemePref = "light" | "dark"

function useTheme() {
  const [theme, setTheme] = useState<ThemePref>("light")

  useEffect(() => {
    framer.getPluginData(THEME_KEY).then((saved) => {
      if (saved === "dark" || saved === "light") setTheme(saved)
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      framer.setPluginData(THEME_KEY, next)
      return next
    })
  }

  return { theme, toggle }
}

const stroke = "var(--border)"
const accent = "#4a5aff"
const ink = "#1a1a1c"
const mut = "#b8b8bc"

interface ComponentDef {
  id: string
  name: string
  category: string
  preview: string
}

const COMPONENTS: ComponentDef[] = [
  {
    id: "hero",
    name: "Hero",
    category: "Sections",
    preview: `<svg viewBox="0 0 200 84"><rect width="200" height="84" fill="none"/>
      <rect x="70" y="14" width="60" height="4" rx="2" fill="${accent}"/>
      <rect x="40" y="26" width="120" height="8" rx="2" fill="${ink}"/>
      <rect x="55" y="40" width="90" height="6" rx="2" fill="${mut}"/>
      <rect x="75" y="56" width="50" height="16" rx="8" fill="${accent}"/>
    </svg>`,
  },
  {
    id: "navbar",
    name: "Navbar",
    category: "Navigation",
    preview: `<svg viewBox="0 0 200 84"><rect x="10" y="30" width="180" height="24" rx="6" fill="none" stroke="${stroke}"/>
      <rect x="20" y="38" width="30" height="8" rx="2" fill="${ink}"/>
      <rect x="80" y="40" width="20" height="4" rx="2" fill="${mut}"/>
      <rect x="108" y="40" width="20" height="4" rx="2" fill="${mut}"/>
      <rect x="150" y="37" width="30" height="10" rx="5" fill="${accent}"/>
    </svg>`,
  },
  {
    id: "pricing-card",
    name: "Pricing Card",
    category: "Cards",
    preview: `<svg viewBox="0 0 200 84"><rect x="60" y="6" width="80" height="72" rx="8" fill="none" stroke="${stroke}"/>
      <rect x="70" y="16" width="20" height="5" rx="2" fill="${accent}"/>
      <rect x="70" y="26" width="40" height="12" rx="2" fill="${ink}"/>
      <rect x="70" y="46" width="45" height="4" rx="2" fill="${mut}"/>
      <rect x="70" y="54" width="45" height="4" rx="2" fill="${mut}"/>
      <rect x="70" y="64" width="60" height="10" rx="5" fill="${accent}"/>
    </svg>`,
  },
  {
    id: "testimonial",
    name: "Testimonial",
    category: "Sections",
    preview: `<svg viewBox="0 0 200 84"><rect x="30" y="8" width="140" height="68" rx="10" fill="none" stroke="${stroke}"/>
      <rect x="42" y="20" width="116" height="5" rx="2" fill="${mut}"/>
      <rect x="42" y="30" width="90" height="5" rx="2" fill="${mut}"/>
      <circle cx="52" cy="58" r="8" fill="${accent}" opacity="0.35"/>
      <rect x="66" y="54" width="40" height="4" rx="2" fill="${ink}"/>
      <rect x="66" y="61" width="55" height="4" rx="2" fill="${mut}"/>
    </svg>`,
  },
  {
    id: "feature-card",
    name: "Feature Card",
    category: "Cards",
    preview: `<svg viewBox="0 0 200 84"><rect x="55" y="10" width="90" height="64" rx="8" fill="none" stroke="${stroke}"/>
      <rect x="65" y="20" width="18" height="18" rx="5" fill="${accent}" opacity="0.35"/>
      <rect x="65" y="46" width="50" height="6" rx="2" fill="${ink}"/>
      <rect x="65" y="56" width="65" height="4" rx="2" fill="${mut}"/>
      <rect x="65" y="63" width="55" height="4" rx="2" fill="${mut}"/>
    </svg>`,
  },
  {
    id: "cta-banner",
    name: "CTA Banner",
    category: "Sections",
    preview: `<svg viewBox="0 0 200 84"><rect x="20" y="24" width="160" height="36" rx="8" fill="${ink}"/>
      <rect x="32" y="35" width="60" height="6" rx="2" fill="white"/>
      <rect x="32" y="44" width="80" height="4" rx="2" fill="${mut}"/>
      <rect x="140" y="34" width="30" height="16" rx="8" fill="white"/>
    </svg>`,
  },
  {
    id: "footer",
    name: "Footer",
    category: "Navigation",
    preview: `<svg viewBox="0 0 200 84">
      <rect x="20" y="12" width="24" height="4" rx="2" fill="${ink}"/>
      <rect x="20" y="20" width="18" height="3" rx="1.5" fill="${mut}"/>
      <rect x="20" y="26" width="18" height="3" rx="1.5" fill="${mut}"/>
      <rect x="90" y="12" width="24" height="4" rx="2" fill="${ink}"/>
      <rect x="90" y="20" width="18" height="3" rx="1.5" fill="${mut}"/>
      <rect x="90" y="26" width="18" height="3" rx="1.5" fill="${mut}"/>
      <rect x="160" y="12" width="20" height="4" rx="2" fill="${ink}"/>
      <rect x="160" y="20" width="16" height="3" rx="1.5" fill="${mut}"/>
      <line x1="20" y1="48" x2="180" y2="48" stroke="${stroke}"/>
      <rect x="20" y="58" width="50" height="4" rx="2" fill="${mut}"/>
      <rect x="140" y="58" width="40" height="4" rx="2" fill="${mut}"/>
    </svg>`,
  },
  {
    id: "stats-row",
    name: "Stats Row",
    category: "Sections",
    preview: `<svg viewBox="0 0 200 84">
      ${[35, 100, 165]
        .map(
          (x) => `
        <rect x="${x - 20}" y="30" width="40" height="10" rx="2" fill="${ink}"/>
        <rect x="${x - 15}" y="46" width="30" height="4" rx="2" fill="${mut}"/>
      `
        )
        .join("")}
    </svg>`,
  },
]

const CATEGORIES = ["All", ...Array.from(new Set(COMPONENTS.map((c) => c.category)))]

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .finally(() => setCheckingSession(false))
  }, [])

  if (checkingSession) {
    return (
      <div className="app">
        <div className="empty" style={{ marginTop: 120 }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLoggedIn={setUser} />
  }

  return <Gallery user={user} onLogOut={() => setUser(null)} theme={theme} onToggleTheme={toggle} />
}

function Gallery({
  user,
  onLogOut,
  theme,
  onToggleTheme,
}: {
  user: User
  onLogOut: () => void
  theme: ThemePref
  onToggleTheme: () => void
}) {
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const items = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return COMPONENTS.filter((c) => {
      const matchesCat = activeCategory === "All" || c.category === activeCategory
      const matchesSearch = c.name.toLowerCase().includes(term)
      return matchesCat && matchesSearch
    })
  }, [activeCategory, searchTerm])

  async function handleInsert(id: string, name: string) {
    setBusyId(id)
    try {
      await insertComponent(id, name)
      showToast(`Inserted "${name}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't insert — try again"
      showToast(message)
      console.error(err)
    } finally {
      setBusyId(null)
    }
  }

  let toastTimer: ReturnType<typeof setTimeout>
  function showToast(text: string) {
    setToast(text)
    clearTimeout(toastTimer)
    const duration = text.length > 40 ? 6000 : 1400
    toastTimer = setTimeout(() => setToast(null), duration)
  }

  return (
    <div className="app">
      <div className="header">
        <div className="brand">
          <div className="brand-mark">CK</div>
          <div className="brand-name">Component Kit</div>
          <button className="theme-btn" title="Toggle theme" onClick={onToggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            className="logout-btn"
            title={user.email ?? "Account"}
            onClick={async () => {
              await signOut()
              onLogOut()
            }}
          >
            Log out
          </button>
        </div>
        <input
          className="search"
          placeholder="Search components…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`cat-btn ${c === activeCategory ? "active" : ""}`}
            onClick={() => setActiveCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid">
        {items.length === 0 ? (
          <div className="empty">No components match your search.</div>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              className={`card ${busyId === c.id ? "busy" : ""}`}
              onClick={() => handleInsert(c.id, c.name)}
            >
              <div className="preview" dangerouslySetInnerHTML={{ __html: c.preview }} />
              <div className="card-footer">
                <span className="card-name">{c.name}</span>
                <span className="insert-hint">{busyId === c.id ? "Inserting…" : "Insert →"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
