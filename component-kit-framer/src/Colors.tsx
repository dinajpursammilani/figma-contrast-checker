import { useEffect, useState } from "react"
import { generateScale, readableTextColor } from "./lib/color"
import { applyColorToSelection } from "./lib/applyColor"
import { recolorSelection } from "./lib/recolor"
import { dumpSelectedMarkup, type MarkupDump } from "./lib/debugMarkup"
import { fetchPalettes, savePalette, deletePalette, type Palette } from "./lib/palettes"

export default function Colors() {
  const [baseColor, setBaseColor] = useState("#4A5AFF")
  const [toast, setToast] = useState<string | null>(null)
  const [applyingHex, setApplyingHex] = useState<string | null>(null)
  const [palettes, setPalettes] = useState<Palette[] | null>(null)
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)
  const [recolorTarget, setRecolorTarget] = useState("#4A5AFF")
  const [recoloring, setRecoloring] = useState(false)
  const [markupDump, setMarkupDump] = useState<MarkupDump | null>(null)
  const [markupError, setMarkupError] = useState<string | null>(null)

  const scale = generateScale(baseColor)

  useEffect(() => {
    loadPalettes()
  }, [])

  function loadPalettes() {
    fetchPalettes()
      .then(setPalettes)
      .catch((err) => showToast(err instanceof Error ? err.message : "Couldn't load palettes"))
  }

  let toastTimer: ReturnType<typeof setTimeout>
  function showToast(text: string) {
    setToast(text)
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => setToast(null), 1800)
  }

  async function handleCopy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex)
      showToast(`Copied ${hex}`)
    } catch {
      showToast(hex)
    }
  }

  async function handleApply(hex: string) {
    setApplyingHex(hex)
    try {
      const count = await applyColorToSelection(hex)
      showToast(`Applied to ${count} layer${count === 1 ? "" : "s"}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't apply color")
    } finally {
      setApplyingHex(null)
    }
  }

  async function handleRecolor() {
    setRecoloring(true)
    try {
      const count = await recolorSelection(recolorTarget)
      showToast(`Recolored ${count} layer${count === 1 ? "" : "s"}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't recolor")
    } finally {
      setRecoloring(false)
    }
  }

  async function handleDumpMarkup() {
    setMarkupError(null)
    setMarkupDump(null)
    try {
      setMarkupDump(await dumpSelectedMarkup())
    } catch (err) {
      setMarkupError(err instanceof Error ? err.message : "Couldn't read selection")
    }
  }

  async function handleSavePalette() {
    const name = saveName.trim()
    if (!name) return
    setSaving(true)
    try {
      await savePalette(name, scale.map((s) => s.hex))
      setSaveName("")
      loadPalettes()
      showToast("Palette saved")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't save palette")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePalette(palette: Palette) {
    try {
      await deletePalette(palette.id)
      loadPalettes()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't delete palette")
    }
  }

  return (
    <div className="app">
      <div className="greeting">
        <div className="greeting-title">Colors</div>
        <div className="greeting-subtitle">Generate a scale, apply it straight to the canvas.</div>
      </div>

      <div className="colors-scroll">
        <div className="colors-recolor">
          <div className="colors-recolor-label">Select a component on the canvas, pick a new color</div>
          <div className="colors-picker-row">
            <input
              type="color"
              className="colors-swatch-input"
              value={recolorTarget}
              onChange={(e) => setRecolorTarget(e.target.value)}
            />
            <input
              className="search colors-hex-input"
              value={recolorTarget}
              onChange={(e) => setRecolorTarget(e.target.value)}
              spellCheck={false}
            />
            <button className="boards-create-btn" onClick={handleRecolor} disabled={recoloring}>
              {recoloring ? "…" : "Recolor"}
            </button>
          </div>
          <p className="settings-muted">
            Backgrounds shift to this new hue while keeping their own light/dark tint (a light hover stays light, a dark button stays
            dark). Icons become exactly this color, including black or white. Text color can't be changed by any plugin — that's a
            Framer platform limit, not something we can work around.
          </p>
        </div>

        <div className="colors-recolor">
          <div className="colors-recolor-label">TEMP DEBUG — dump selected component's raw markup</div>
          <button className="boards-create-btn" onClick={handleDumpMarkup} style={{ alignSelf: "flex-start" }}>
            Dump SVG/text markup
          </button>
          {markupError && <p className="settings-muted">{markupError}</p>}
          {markupDump && (
            <div style={{ fontFamily: "monospace", fontSize: 10, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              <button
                className="boards-create-btn"
                style={{ alignSelf: "flex-start", marginBottom: 8 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(markupDump, null, 2))
                    showToast("Copied to clipboard")
                  } catch {
                    showToast("Couldn't copy")
                  }
                }}
              >
                Copy dump to clipboard
              </button>
              <p className="settings-muted">SVG samples ({markupDump.svgSamples.length}):</p>
              {markupDump.svgSamples.map((s, i) => (
                <p key={i} className="settings-muted">
                  [{s.name}] {s.markup}
                </p>
              ))}
              <p className="settings-muted">Text samples ({markupDump.textSamples.length}):</p>
              {markupDump.textSamples.map((s, i) => (
                <p key={i} className="settings-muted">
                  [{s.name}] {s.html}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="colors-divider" />

        <div className="colors-picker-row">
          <input
            type="color"
            className="colors-swatch-input"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
          />
          <input
            className="search colors-hex-input"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="colors-scale">
          {scale.map(({ step, hex }) => (
            <div key={step} className="colors-scale-row" style={{ background: hex, color: readableTextColor(hex) }}>
              <span className="colors-scale-step">{step}</span>
              <span className="colors-scale-hex">{hex}</span>
              <div className="colors-scale-actions">
                <button className="colors-scale-btn" onClick={() => handleCopy(hex)} style={{ color: readableTextColor(hex) }}>
                  Copy
                </button>
                <button
                  className="colors-scale-btn"
                  onClick={() => handleApply(hex)}
                  disabled={applyingHex === hex}
                  style={{ color: readableTextColor(hex) }}
                >
                  {applyingHex === hex ? "Applying…" : "Apply →"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="colors-save-row">
          <input
            className="search"
            placeholder="Save this scale as…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSavePalette()}
          />
          <button className="boards-create-btn" disabled={!saveName.trim() || saving} onClick={handleSavePalette}>
            {saving ? "…" : "Save"}
          </button>
        </div>

        {palettes && palettes.length > 0 && (
          <div className="colors-saved">
            <div className="greeting-title" style={{ fontSize: 15 }}>
              Saved palettes
            </div>
            {palettes.map((p) => {
              const mainHex = p.colors[Math.floor(p.colors.length / 2)] ?? p.colors[0] ?? "#888"
              return (
                <button
                  key={p.id}
                  className="colors-saved-row"
                  title={`Click to load ${p.name} back into the picker`}
                  onClick={() => setBaseColor(mainHex)}
                  style={{ background: `${mainHex}26`, borderColor: `${mainHex}55` }}
                >
                  <span className="colors-saved-chip" style={{ background: mainHex }} />
                  <span className="colors-saved-name">{p.name}</span>
                  <span
                    className="colors-saved-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePalette(p)
                    }}
                  >
                    ✕
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
