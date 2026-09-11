import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import { submitFeedback, type FeedbackType } from "./lib/feedback"

/** In-app replacement for the old mailto: "Send feedback"/"Report a bug" links — same full-screen
 * push pattern as LegalDoc/EditComponents for the header, but with a proper greeting-style intro
 * (matching Colors/Home) instead of dropping straight into a bare textarea with no context.
 * Insert-only: a user can submit but never see past submissions. */
export default function FeedbackForm({ user, type, onBack }: { user: User; type: FeedbackType; onBack: () => void }) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!message.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      await submitFeedback(type, message, user.id, user.email ?? null)
      setSent(true)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't submit — try again")
    } finally {
      setBusy(false)
    }
  }

  const title = type === "bug" ? "Report a bug" : "Send feedback"
  const subtitle =
    type === "bug"
      ? "Tell us what went wrong — the more detail, the faster we can fix it."
      : "Ideas, complaints, anything on your mind. We read every one."
  const placeholder = type === "bug" ? "What happened? Include steps to reproduce if you can." : "What's on your mind?"

  return (
    <div className="edit-components">
      <div className="edit-components-header">
        <button className="boards-back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="drawer-title">{title}</span>
      </div>

      <div className="feedback-body">
        <div className="greeting" style={{ padding: "18px 0 14px" }}>
          <div className="greeting-title">{title}</div>
          <div className="greeting-subtitle">{subtitle}</div>
        </div>

        {sent ? (
          <div className="feedback-sent">
            <h4>Thanks — got it.</h4>
            <p className="settings-muted">We'll take a look. No need to do anything else.</p>
            <button className="feedback-submit" onClick={onBack}>
              Done
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="feedback-textarea"
              placeholder={placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
            <button className="feedback-submit" onClick={handleSubmit} disabled={busy || !message.trim()}>
              {busy ? "Sending…" : "Send"}
            </button>
            {status && <p className="settings-muted">{status}</p>}
          </>
        )}
      </div>
    </div>
  )
}
