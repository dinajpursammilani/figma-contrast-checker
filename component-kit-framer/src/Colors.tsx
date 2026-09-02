import { useEffect, useState } from "react"
import { generateScale, readableTextColor, hexToHsl, hslToHex } from "./lib/color"
import { SunIcon, MoonIcon } from "./icons"
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

/** A reasonable starting dark-theme counterpart for a light base color — deeper and a touch
 * more saturated, the same rough adjustment most design systems make by hand. Just a starting
 * point: the dark swatch has its own picker, so this only matters until someone touches it. */
function darkenForTheme(hex: string): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex({ h, s: Math.min(100, s + 8), l: Math.max(12, l - 32) })
}

export default function Colors() {
  const [mode, setMode] = useState<Mode>("color")
  const [baseColor, setBaseColor] = useState("#4A5AFF")
  const [darkColor, setDarkColor] = useState(() => darkenForTheme("#4A5AFF"))
  const [darkTouched, setDarkTouched] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
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

  const lightScale = generateScale(baseColor)
  const darkScale = generateScale(darkColor)
  const scale = theme === "light" ? lightScale : darkScale
  const textScale = generateTextScale(baseSize, ratio)
  const [activeStep, setActiveStep] = useState(scale[Math.floor(scale.length / 2)].step)
  const active = scale.find((s) => s.step === activeStep) ?? scale[0]

  useEffect(() => {
    setActiveStep(scale[Math.floor(scale.length / 2)].step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, baseColor, darkColor])

  useEffect(() => {
    if (!darkTouched) setDarkColor(darkenForTheme(baseColor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseColor])

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
      const paired = lightScale.map((s, i) => ({ step: s.step, lightHex: s.hex, darkHex: darkScale[i].hex }))
      const count = await insertColorStyles(name, paired)
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
          <div className="colors-theme-row">
            <span className="colors-section-label" style={{ margin: 0 }}>
              {theme === "light" ? "Light" : "Dark"} base
            </span>
            <div className="colors-theme-toggle">
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} title="Light theme">
                <SunIcon />
              </button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} title="Dark theme">
                <MoonIcon />
              </button>
            </div>
          </div>

          <div className="colors-picker-row">
            <input
              type="color"
              className="colors-swatch-input"
              value={theme === "light" ? baseColor : darkColor}
              onChange={(e) => {
                if (theme === "light") setBaseColor(e.target.value)
                else {
                  setDarkTouched(true)
                  setDarkColor(e.target.value)
                }
              }}
            />
            <input
              className="search colors-hex-input"
              value={theme === "light" ? baseColor : darkColor}
              onChange={(e) => {
                if (theme === "light") setBaseColor(e.target.value)
                else {
                  setDarkTouched(true)
                  setDarkColor(e.target.value)
                }
              }}
              spellCheck={false}
            />
          </div>

          <div className="colors-section-label">Scale</div>
          <div className="colors-strip">
            {scale.map(({ step, hex }) => (
              <button
                key={step}
                className={`colors-strip-seg ${step === activeStep ? "active" : ""}`}
                style={{ background: hex, color: readableTextColor(hex) }}
                onClick={() => setActiveStep(step)}
              >
                {step}
              </button>
            ))}
          </div>

          <div className="colors-active-row">
            <span className="colors-active-hex">{active.hex}</span>
            <div className="colors-active-actions">
              <button className="colors-scale-btn" onClick={() => handleCopy(active.hex)}>
                Copy
              </button>
              <button className="colors-scale-btn" onClick={() => handleApply(active.hex)} disabled={applyingHex === active.hex}>
                {applyingHex === active.hex ? "Applying…" : "Apply →"}
              </button>
            </div>
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
          <button className="settings-upgrade-btn" style={{ marginTop: 4 }} onClick={handleInsertColorStyles} disabled={insertingStyles}>
            {insertingStyles ? "Adding…" : "Insert as Color Styles →"}
          </button>
          <p className="settings-muted colors-hint">
            Adds every step above as a real Framer Color Style under Assets → Styles — reusable by any component in this project.
          </p>

          {palettes && palettes.length > 0 && (
            <div className="colors-saved">
              <div className="colors-section-label">Saved palettes</div>
              {palettes.map((p) => (
                <div key={p.id} className="colors-saved-row">
                  <button className="colors-strip colors-strip-mini" onClick={() => setBaseColor(p.colors[Math.floor(p.colors.length / 2)] ?? p.colors[0])}>
                    {p.colors.map((hex, i) => (
                      <span key={i} className="colors-strip-seg" style={{ background: hex }} />
                    ))}
                  </button>
                  <span className="colors-saved-name">{p.name}</span>
                  <span className="colors-saved-delete" onClick={() => handleDeletePalette(p)}>
                    ✕
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="colors-scroll">
          <div className="colors-text-controls">
            <div className="colors-control-row">
              <label className="onboarding-label">Base size</label>
              <span className="colors-control-value">{baseSize}px</span>
            </div>
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

            <div className="colors-control-row">
              <label className="onboarding-label">Weight</label>
              <span className="colors-control-value">{weight}</span>
            </div>
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

          <div className="colors-save-row">
            <input
              className="search"
              placeholder="Name this type set…"
              value={textFolderName}
              onChange={(e) => setTextFolderName(e.target.value)}
            />
          </div>
          <button className="settings-upgrade-btn" style={{ marginTop: 4 }} onClick={handleInsertTextStyles} disabled={insertingText}>
            {insertingText ? "Adding…" : "Insert Text Styles →"}
          </button>

          <div className="colors-section-label" style={{ marginTop: 18 }}>
            Preview
          </div>
          <div className="colors-type-specimen">
            {textScale.map((s) => (
              <div key={s.label} className="colors-type-row">
                <div className="colors-type-meta">
                  <span className="colors-type-label">{s.label}</span>
                  <span className="colors-type-size">{s.sizePx}px</span>
                </div>
                <div
                  className="colors-type-sample"
                  style={{ fontSize: s.sizePx, fontWeight: weight, fontFamily }}
                >
                  The quick brown fox
                </div>
              </div>
            ))}
          </div>
          <p className="settings-muted colors-hint">
            Adds H1-H6 and P1-P3 as real Framer Text Styles under Assets → Styles. If "{fontFamily}" isn't available, styles fall back
            to Framer's default font.
          </p>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
