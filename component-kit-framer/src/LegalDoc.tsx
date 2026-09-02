import { LAST_UPDATED, type LegalSection } from "./legalContent"

export default function LegalDoc({
  title,
  sections,
  onBack,
}: {
  title: string
  sections: LegalSection[]
  onBack: () => void
}) {
  return (
    <div className="edit-components">
      <div className="edit-components-header">
        <button className="boards-back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="drawer-title">{title}</span>
      </div>

      <div className="legal-doc">
        <p className="settings-muted">Last updated {LAST_UPDATED}</p>
        {sections.map((s) => (
          <div key={s.heading} className="legal-doc-section">
            <h4>{s.heading}</h4>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
