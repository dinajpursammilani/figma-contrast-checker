import { useEffect, useMemo, useRef, useState } from "react"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { uploadComponentPreview } from "./lib/previewUpload"
import { updateComponentFields, deleteComponentPreviewImage, resetComponentTierOverride, deleteComponent } from "./lib/adminComponents"
import { categoryIconFor, TrashIcon } from "./icons"

type PreviewFilter = "all" | "has" | "missing"

/** Admin-only catalog management: browse every component, open one to attach/replace/remove
 * its preview image and edit its name/category/tier. Reached from Settings → Admin. */
export default function EditComponents({ onBack }: { onBack: () => void }) {
  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<PreviewFilter>("all")
  const [search, setSearch] = useState("")

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

  const open = components?.find((c) => c.id === openId) ?? null

  function patchLocal(id: string, patch: Partial<ComponentRow>) {
    setComponents((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch } : c)) ?? prev)
  }

  function removeLocal(id: string) {
    setComponents((prev) => prev?.filter((c) => c.id !== id) ?? prev)
    setOpenId(null)
  }

  if (open) {
    return (
      <ComponentEditor
        component={open}
        onBack={() => setOpenId(null)}
        onChange={(patch) => patchLocal(open.id, patch)}
        onDeleted={() => removeLocal(open.id)}
      />
    )
  }

  return (
    <div className="edit-components">
      <div className="edit-components-header">
        <button className="boards-back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="drawer-title">Edit Components</span>
      </div>

      <input
        className="search"
        type="text"
        placeholder="Search components…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="edit-components-filters">
        {(["all", "missing", "has"] as const).map((f) => (
          <button key={f} className={`cat-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "missing" ? "No preview" : "Has preview"}
          </button>
        ))}
      </div>

      <div className="edit-components-list">
        {!components ? (
          <p className="settings-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="settings-muted">No components match.</p>
        ) : (
          filtered.map((c) => {
            const CategoryIcon = categoryIconFor(c.category)
            return (
              <button key={c.id} className="edit-components-row" onClick={() => setOpenId(c.id)}>
                <div className="edit-components-thumb">
                  {c.preview_image_url ? (
                    <img src={c.preview_image_url} alt="" />
                  ) : c.preview_svg ? (
                    <div dangerouslySetInnerHTML={{ __html: c.preview_svg }} />
                  ) : (
                    <CategoryIcon />
                  )}
                </div>
                <div className="edit-components-info">
                  <span className="edit-components-name">{c.name}</span>
                  <span className="edit-components-meta">
                    {c.category} · {c.is_pro ? "Pro" : "Free"}
                    {c.tier_manually_set && " · locked"}
                  </span>
                </div>
                <span className="edit-components-chevron">›</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function ComponentEditor({
  component,
  onBack,
  onChange,
  onDeleted,
}: {
  component: ComponentRow
  onBack: () => void
  onChange: (patch: Partial<ComponentRow>) => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(component.name)
  const [category, setCategory] = useState(component.category)
  const [isPro, setIsPro] = useState(component.is_pro)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dirty = name !== component.name || category !== component.category || isPro !== component.is_pro

  async function handleFile(file: File) {
    setBusy(true)
    setStatus(null)
    try {
      const url = await uploadComponentPreview(component.id, file)
      onChange({ preview_image_url: url })
      setStatus("Preview updated.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveImage() {
    setBusy(true)
    setStatus(null)
    try {
      await deleteComponentPreviewImage(component.id)
      onChange({ preview_image_url: null })
      setStatus("Preview removed.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't remove preview")
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveFields() {
    setBusy(true)
    setStatus(null)
    try {
      await updateComponentFields(component.id, { name: name.trim(), category: category.trim(), is_pro: isPro })
      onChange({ name: name.trim(), category: category.trim(), is_pro: isPro, tier_manually_set: true })
      setStatus("Saved.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't save")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setStatus(null)
    try {
      await deleteComponent(component.id)
      onDeleted()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't delete")
      setBusy(false)
    }
  }

  async function handleResetOverride() {
    setBusy(true)
    setStatus(null)
    try {
      await resetComponentTierOverride(component.id)
      onChange({ tier_manually_set: false })
      setStatus("Unlocked — the next Sync will set category/tier from Framer again.")
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't unlock")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"))
      const file = item?.getAsFile()
      if (file) handleFile(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component.id])

  const CategoryIcon = categoryIconFor(component.category)

  return (
    <div className="edit-components">
      <div className="edit-components-header">
        <button className="boards-back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="drawer-title">{component.name}</span>
        {confirmingDelete ? (
          <div className="settings-row" style={{ gap: 8 }}>
            <button className="settings-toggle" onClick={() => setConfirmingDelete(false)} disabled={busy}>
              Cancel
            </button>
            <button className="settings-toggle" onClick={handleDelete} disabled={busy} style={{ color: "var(--danger)" }}>
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
          </div>
        ) : (
          <button
            className="settings-toggle"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
            style={{ color: "var(--danger)" }}
          >
            <TrashIcon /> Delete
          </button>
        )}
      </div>

      <div className="edit-components-editor">
        <div
          className={`edit-components-preview-large ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
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
          {component.preview_image_url ? (
            <img src={component.preview_image_url} alt="" />
          ) : component.preview_svg ? (
            <div dangerouslySetInnerHTML={{ __html: component.preview_svg }} />
          ) : (
            <CategoryIcon />
          )}
          {!busy && (
            <div className="edit-components-preview-hint">
              {component.preview_image_url ? "Click, drop, or paste to replace" : "Click, drop, or paste an image"}
            </div>
          )}
        </div>

        <div className="settings-row" style={{ gap: 8 }}>
          <button className="settings-toggle" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            {busy ? "Working…" : component.preview_image_url ? "Replace image" : "Add image"}
          </button>
          {component.preview_image_url && (
            <button className="settings-toggle" onClick={handleRemoveImage} disabled={busy} style={{ color: "var(--danger)" }}>
              <TrashIcon /> Remove image
            </button>
          )}
        </div>

        <label className="onboarding-label" style={{ marginTop: 20 }}>
          Name
        </label>
        <input className="onboarding-input" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="onboarding-label">Category</label>
        <input className="onboarding-input" value={category} onChange={(e) => setCategory(e.target.value)} />

        <label className="onboarding-label">Tier</label>
        <div className="onboarding-toggle-row">
          <button className={`onboarding-toggle ${!isPro ? "selected" : ""}`} onClick={() => setIsPro(false)}>
            Free
          </button>
          <button className={`onboarding-toggle ${isPro ? "selected" : ""}`} onClick={() => setIsPro(true)}>
            Pro
          </button>
        </div>

        {component.tier_manually_set ? (
          <p className="settings-muted" style={{ marginTop: 8 }}>
            Locked — Sync won't change category/tier for this component anymore.{" "}
            <button className="settings-link" onClick={handleResetOverride} disabled={busy} style={{ display: "inline" }}>
              Unlock
            </button>
          </p>
        ) : (
          <p className="settings-muted" style={{ marginTop: 8 }}>
            Following Framer automatically — saving here will lock it.
          </p>
        )}

        {dirty && (
          <button className="settings-upgrade-btn" style={{ marginTop: 16 }} onClick={handleSaveFields} disabled={busy}>
            Save changes
          </button>
        )}
        {status && <p className="settings-muted">{status}</p>}
      </div>
    </div>
  )
}
