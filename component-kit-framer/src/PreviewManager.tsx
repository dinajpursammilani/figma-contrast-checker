import { useEffect, useMemo, useRef, useState } from "react"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { uploadComponentPreview } from "./lib/previewUpload"
import { categoryIconFor } from "./icons"

type PreviewFilter = "all" | "has" | "missing"

/** Admin-only: browse every catalog component and attach a real preview image to each one —
 * by file picker, drag-and-drop, or pasting (Cmd/Ctrl+V) straight from the clipboard. Click a
 * row to select it, then drop/paste/choose a file into the shared dropzone above the list. */
export default function PreviewManager({ onBack }: { onBack: () => void }) {
  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<PreviewFilter>("all")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selected = components?.find((c) => c.id === selectedId) ?? null

  useEffect(() => {
    fetchComponents().then(setComponents)
  }, [])

  const filtered = useMemo(() => {
    if (!components) return []
    return components.filter((c) => {
      const hasPreview = !!c.preview_image_url
      if (filter === "has" && !hasPreview) return false
      if (filter === "missing" && hasPreview) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [components, filter, search])

  async function handleFile(file: File) {
    if (!selected) {
      setStatus("Select a component below first.")
      return
    }
    setUploading(true)
    setStatus(null)
    try {
      const url = await uploadComponentPreview(selected.id, file)
      setComponents((prev) => prev?.map((c) => (c.id === selected.id ? { ...c, preview_image_url: url } : c)) ?? prev)
      setStatus(`Updated "${selected.name}".`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!selected) return
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"))
      const file = item?.getAsFile()
      if (file) handleFile(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className="preview-manager">
      <div className="preview-manager-header">
        <button className="boards-back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="drawer-title">Manage previews</span>
      </div>

      <input
        className="search"
        type="text"
        placeholder="Search components…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="preview-manager-filters">
        {(["all", "missing", "has"] as const).map((f) => (
          <button key={f} className={`cat-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "missing" ? "No preview" : "Has preview"}
          </button>
        ))}
      </div>

      <div
        className={`preview-manager-dropzone ${dragOver ? "drag-over" : ""} ${!selected ? "disabled" : ""}`}
        onClick={() => selected && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (selected) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
        {uploading
          ? "Uploading…"
          : selected
            ? `Drop, paste, or click to add an image for "${selected.name}"`
            : "Select a component below, then drop, paste, or click here"}
      </div>
      {status && <p className="settings-muted">{status}</p>}

      <div className="preview-manager-list">
        {!components ? (
          <p className="settings-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="settings-muted">No components match.</p>
        ) : (
          filtered.map((c) => {
            const CategoryIcon = categoryIconFor(c.category)
            return (
              <button
                key={c.id}
                className={`preview-manager-row ${selectedId === c.id ? "selected" : ""}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="preview-manager-thumb">
                  {c.preview_image_url ? (
                    <img src={c.preview_image_url} alt="" />
                  ) : c.preview_svg ? (
                    <div dangerouslySetInnerHTML={{ __html: c.preview_svg }} />
                  ) : (
                    <CategoryIcon />
                  )}
                </div>
                <div className="preview-manager-info">
                  <span className="preview-manager-name">{c.name}</span>
                  <span className="preview-manager-meta">
                    {c.category} · {c.is_pro ? "Pro" : "Free"}
                  </span>
                </div>
                {c.preview_image_url && <span className="preview-manager-badge">✓</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
