import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import { completeOnboarding, saveFullName } from "./lib/profile"

const BUILD_OPTIONS = [
  "Landing page",
  "SaaS website",
  "Portfolio",
  "Blog",
  "Personal website",
  "Ecommerce store",
  "Agency website",
  "Template",
  "Membership site",
  "I'm not sure",
]

const SKILL_OPTIONS = ["I just started using Framer", "I've used Framer a few times", "I'm a Framer pro"]

const SOURCE_OPTIONS = [
  "Framer Marketplace",
  "YouTube",
  "TikTok",
  "Google Search",
  "Facebook/Instagram",
  "An Ad",
  "Other",
]

const DESCRIBES_OPTIONS = ["Designer", "Developer", "Freelancer", "Agency", "Founder", "Other"]
const ROLE_OPTIONS = ["Individual contributor", "Manager", "Founder/Owner", "Freelancer", "Student", "Other"]

interface Answers {
  building: string[]
  skill: string
  source: string
  usage: "Personal" | "Work" | ""
  describes: string
  role: string
}

const TOTAL_STEPS = 5

export default function Onboarding({ user, onDone }: { user: User; onDone: () => void }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  // Google sign-in already gives us a real name (in user_metadata) — pre-fill it here instead
  // of asking again. Email/password users see this blank (that form doesn't ask for a name),
  // filling it in for the first time.
  const [name, setName] = useState(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "")
  const [answers, setAnswers] = useState<Answers>({
    building: [],
    skill: "",
    source: "",
    usage: "",
    describes: "",
    role: "",
  })

  function toggleBuilding(option: string) {
    setAnswers((prev) => ({
      ...prev,
      building: prev.building.includes(option)
        ? prev.building.filter((b) => b !== option)
        : [...prev.building, option],
    }))
  }

  async function finish() {
    setSaving(true)
    await completeOnboarding(user.id, answers)
    onDone()
  }

  function goNext() {
    if (step === 1) void saveFullName(user.id, name.trim())
    if (step < TOTAL_STEPS) setStep(step + 1)
    else finish()
  }

  const canContinue =
    (step === 1 && name.trim() !== "") ||
    (step === 2 && answers.building.length > 0) ||
    (step === 3 && answers.skill !== "") ||
    (step === 4 && answers.source !== "") ||
    (step === 5 && answers.usage !== "" && answers.describes !== "" && answers.role !== "")

  return (
    <div className="onboarding">
      <div className="onboarding-header">
        {step > 1 ? (
          <button className="onboarding-back" onClick={() => setStep(step - 1)}>
            ‹ Back
          </button>
        ) : (
          <span />
        )}
        <div className="onboarding-progress">
          <div className="onboarding-progress-fill" style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <div className="onboarding-body">
        {step === 1 && (
          <>
            <h2>What's your name?</h2>
            <p>So we know what to call you.</p>
            <input
              className="onboarding-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2>What would you like to build?</h2>
            <p>Pick as many as you like. This will help us show you the right things.</p>
            <div className="onboarding-list">
              {BUILD_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`onboarding-option ${answers.building.includes(opt) ? "selected" : ""}`}
                  onClick={() => toggleBuilding(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>How well do you know Framer?</h2>
            <p>Don't worry, this is a safe space.</p>
            <div className="onboarding-list">
              {SKILL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`onboarding-option ${answers.skill === opt ? "selected" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, skill: opt }))}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>How did you hear about Skela?</h2>
            <p>No wrong answers.</p>
            <div className="onboarding-list">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={`onboarding-option ${answers.source === opt ? "selected" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, source: opt }))}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2>What will you use Skela for?</h2>
            <p>So we know who we're building with.</p>

            <div className="onboarding-toggle-row">
              {(["Personal", "Work"] as const).map((opt) => (
                <button
                  key={opt}
                  className={`onboarding-toggle ${answers.usage === opt ? "selected" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, usage: opt }))}
                >
                  {opt}
                </button>
              ))}
            </div>

            <label className="onboarding-label">What best describes you?</label>
            <select
              className="onboarding-select"
              value={answers.describes}
              onChange={(e) => setAnswers((prev) => ({ ...prev, describes: e.target.value }))}
            >
              <option value="" disabled>
                Select…
              </option>
              {DESCRIBES_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <label className="onboarding-label">What role best matches your daily responsibilities?</label>
            <select
              className="onboarding-select"
              value={answers.role}
              onChange={(e) => setAnswers((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="" disabled>
                Select…
              </option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <button
        className="onboarding-continue"
        disabled={!canContinue || saving}
        onClick={goNext}
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  )
}
