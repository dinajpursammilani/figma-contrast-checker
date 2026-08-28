import { useEffect, useState } from "react"
import { generateScale, readableTextColor } from "./lib/color"
import { applyColorToSelection } from "./lib/applyColor"
import { fetchPalettes, savePalette, deletePalette, type Palette } from "./lib/palettes"

export default function Colors() {
  const [baseColor, setBaseColor] = useState("#4A5AFF")
  const [toast, setToast] = useState<string | null>(null)
  const [applyingHex, setApplyingHex] = useState<string | null>(null)
  const [palettes, setPalettes] = useState<Palette[] | null>(null)
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)

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
            {palettes.map((p) => (
              <div key={p.id} className="colors-saved-row">
                <div className="colors-saved-swatches">
                  {p.colors.map((hex, i) => (
                    <button
                      key={i}
                      className="colors-saved-swatch"
                      style={{ background: hex }}
                      title={hex}
                      onClick={() => setBaseColor(p.colors[Math.floor(p.colors.length / 2)] ?? hex)}
                    />
                  ))}
                </div>
                <span className="colors-saved-name">{p.name}</span>
                <button className="unsave-btn" onClick={() => handleDeletePalette(p)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
