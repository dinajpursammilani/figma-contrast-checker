import type { User } from "@supabase/supabase-js"
import { signOut } from "./lib/auth"

type ThemePref = "light" | "dark"

// TODO: replace with your real support inbox before shipping — left as a placeholder rather
// than a fabricated address, since a fake "contact us" link is worse than none.
const SUPPORT_EMAIL: string | null = null

export default function Settings({
  user,
  theme,
  onToggleTheme,
  onLogOut,
}: {
  user: User
  theme: ThemePref
  onToggleTheme: () => void
  onLogOut: () => void
}) {
  return (
    <div className="settings">
      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-row">
          <span>Email</span>
          <span className="settings-value">{user.email}</span>
        </div>
        <button className="settings-danger" onClick={async () => {
          await signOut()
          onLogOut()
        }}>
          Log out
        </button>
      </div>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <span>Theme</span>
          <button className="settings-toggle" onClick={onToggleTheme}>
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Feedback</h3>
        {SUPPORT_EMAIL ? (
          <a className="settings-link" href={`mailto:${SUPPORT_EMAIL}`}>
            Report a bug or request a component →
          </a>
        ) : (
          <p className="settings-muted">Support contact not set up yet.</p>
        )}
      </div>
    </div>
  )
}
