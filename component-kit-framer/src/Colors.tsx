import { useEffect, useState } from "react"
import { generateScale, readableTextColor } from "./lib/color"
import { applyColorToSelection } from "./lib/applyColor"
import { insertColorStyles, insertTextStyles } from "./lib/framerStyles"
import { generateTextScale } from "./lib/textScale"
import { fetchPalettes, savePalette, deletePalette, type Palette } from "./lib/palettes"

type Mode = "color" | "text"

const RATIO_PRESETS = [
  { label: "Minor Third", value: 1.2 },
  { label: "Major Third", value: 1.25 },
  { label: "Perfect Fourth", value: 1.333 },
]

export default function Colors() {
  const [mode, setMode] = useState<Mode>("color")
  const [baseColor, setBaseColor] = useState("#4A5AFF")
  const [toast, setToast] = useState<string | null>(null)
  const [applyingHex, setApplyingHex] = useState<string | null>(null)
  const [palettes, setPalettes] = useState<Palette[] | null>(null)
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)
  const [insertingStyles, setInsertingStyles] = useState(false)

  const [baseSize, setBaseSize] = useState(16)
  const [ratio, setRatio] = useState(1.25)
  const [weight, setWeight] = useState(600)
  const [fontFamily, setFontFamily] = useState("Inter")
  const [textFolderName, setTextFolderName] = useState("")
  const [insertingText, setInsertingText] = useState(false)

  const scale = generateScale(baseColor)
  const textScale = generateTextScale(baseSize, ratio)

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

  async function handleInsertColorStyles() {
    const name = saveName.trim() || "Palette"
    setInsertingStyles(true)
    try {
      const count = await insertColorStyles(name, scale)
      showToast(`Added ${count} color style${count === 1 ? "" : "s"} to Assets → Styles`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't insert styles")
    } finally {
      setInsertingStyles(false)
    }
  }

  async function handleInsertTextStyles() {
    setInsertingText(true)
    try {
      const count = await insertTextStyles({
        folderName: textFolderName || "Type",
        baseSizePx: baseSize,
        ratio,
        weight,
        fontFamily,
      })
      showToast(`Added ${count} text style${count === 1 ? "" : "s"} to Assets → Styles`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't insert text styles")
    } finally {
      setInsertingText(false)
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
        <div className="greeting-subtitle">Build a color or type scale, insert it as real Framer Styles.</div>
      </div>

      <div className="colors-mode-tabs">
        <button className={`colors-mode-tab ${mode === "color" ? "active" : ""}`} onClick={() => setMode("color")}>
          Color
        </button>
        <button className={`colors-mode-tab ${mode === "text" ? "active" : ""}`} onClick={() => setMode("text")}>
          Text
        </button>
      </div>

      {mode === "color" ? (
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
              placeholder="Name this palette…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePalette()}
            />
            <button className="boards-create-btn" disabled={!saveName.trim() || saving} onClick={handleSavePalette}>
              {saving ? "…" : "Save"}
            </button>
          </div>
          <button className="settings-upgrade-btn" style={{ marginTop: 8 }} onClick={handleInsertColorStyles} disabled={insertingStyles}>
            {insertingStyles ? "Adding…" : "Insert as Color Styles →"}
          </button>
          <p className="settings-muted" style={{ padding: "6px 18px 0" }}>
            Adds every step above as a real Framer Color Style under Assets → Styles — reusable by any component in this project.
          </p>

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
      ) : (
        <div className="colors-scroll">
          <div className="colors-text-controls">
            <label className="onboarding-label">Base size ({baseSize}px)</label>
            <input
              type="range"
              min={12}
              max={24}
              value={baseSize}
              onChange={(e) => setBaseSize(Number(e.target.value))}
            />

            <label className="onboarding-label">Scale ratio</label>
            <div className="onboarding-toggle-row">
              {RATIO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={`onboarding-toggle ${ratio === p.value ? "selected" : ""}`}
                  onClick={() => setRatio(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="onboarding-label">Weight ({weight})</label>
            <input
              type="range"
              min={100}
              max={900}
              step={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />

            <label className="onboarding-label">Font family</label>
            <input className="onboarding-input" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} />
          </div>

          <div className="colors-scale">
            {textScale.map((s) => (
              <div key={s.label} className="colors-text-preview-row">
                <span className="colors-scale-step">{s.label}</span>
                <span style={{ fontSize: Math.min(s.sizePx, 32), fontWeight: weight, flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
                  The quick brown fox
                </span>
                <span className="colors-scale-hex">{s.sizePx}px</span>
              </div>
            ))}
          </div>

          <div className="colors-save-row">
            <input
              className="search"
              placeholder="Name this type set…"
              value={textFolderName}
              onChange={(e) => setTextFolderName(e.target.value)}
            />
          </div>
          <button className="settings-upgrade-btn" style={{ marginTop: 8 }} onClick={handleInsertTextStyles} disabled={insertingText}>
            {insertingText ? "Adding…" : "Insert Text Styles →"}
          </button>
          <p className="settings-muted" style={{ padding: "6px 18px 18px" }}>
            Adds H1-H6 and P1-P3 as real Framer Text Styles under Assets → Styles. Font/weight is applied on a best-effort basis —
            if "{fontFamily}" isn't available, styles are still created using Framer's default font.
          </p>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
