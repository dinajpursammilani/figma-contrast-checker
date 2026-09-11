import { useEffect, useMemo, useRef, useState } from "react"
import { fetchComponents, type ComponentRow } from "./lib/components"
import { uploadComponentPreview } from "./lib/previewUpload"
import {
  updateComponentFields,
  deleteComponentPreviewImage,
  resetComponentTierOverride,
  deleteComponent,
} from "./lib/adminComponents"
import { categoryIconFor, TrashIcon, SearchIcon, SlidersIcon, CheckIcon } from "./icons"

type PreviewFilter = "all" | "has" | "missing"
type TierFilter = "all" | "free" | "pro"
type SortMode = "order" | "recent"
type Section = "part" | "panel" | "page"

const SECTION_LABELS: Record<string, string> = { part: "Part", panel: "Panel", page: "Page" }

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** Admin-only catalog management: browse every component, open one to attach/replace/remove
 * its preview image and edit its name/category/tier. Reached from Settings → Admin. */
export default function EditComponents({ isSuperAdmin, onBack }: { isSuperAdmin: boolean; onBack: () => void }) {
  const [components, setComponents] = useState<ComponentRow[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<PreviewFilter>("all")
  const [tierFilter, setTierFilter] = useState<TierFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("order")
  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string | null>(null)
  const activeFilterCount = (filter !== "all" ? 1 : 0) + (tierFilter !== "all" ? 1 : 0) + (sortMode === "recent" ? 1 : 0)

  useEffect(() => {
    fetchComponents().then(setComponents)
  }, [])

  const filtered = useMemo(() => {
    if (!components) return []
    const rows = components.filter((c) => {
      const hasPreview = !!c.preview_image_url
      if (filter === "has" && !hasPreview) return false
      if (filter === "missing" && hasPreview) return false
      if (tierFilter === "free" && c.is_pro) return false
      if (tierFilter === "pro" && !c.is_pro) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (sortMode === "recent") {
      return [...rows].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    return rows
  }, [components, filter, tierFilter, sortMode, search])

  const open = components?.find((c) => c.id === openId) ?? null

  function patchLocal(id: string, patch: Partial<ComponentRow>) {
    setComponents((prev) => prev?.map((c) => (c.id === id ? { ...c, ...patch } : c)) ?? prev)
  }

  function removeLocal(id: string) {
    setComponents((prev) => prev?.filter((c) => c.id !== id) ?? prev)
    setOpenId(null)
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
    setConfirmBulkDelete(false)
    setBulkStatus(null)
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected)
    setBulkDeleting(true)
    setBulkStatus(null)
    const results = await Promise.allSettled(ids.map((id) => deleteComponent(id)))
    const failed = ids.filter((_, i) => results[i].status === "rejected")
    setComponents((prev) => prev?.filter((c) => !ids.includes(c.id) || failed.includes(c.id)) ?? prev)
    setBulkDeleting(false)
    setConfirmBulkDelete(false)
    if (failed.length === 0) {
      exitSelectMode()
    } else {
      setSelected(new Set(failed))
      setBulkStatus(`Deleted ${ids.length - failed.length}. ${failed.length} failed — try again.`)
    }
  }

  if (open) {
    return (
      <ComponentEditor
        component={open}
        isSuperAdmin={isSuperAdmin}
        onBack={() => setOpenId(null)}
        onChange={(patch) => patchLocal(open.id, patch)}
        onDeleted={() => removeLocal(open.id)}
      />
    )
  }

  return (
    <div className="edit-components">
      <div className="edit-components-header">
        <button className="boards-back" onClick={selectMode ? exitSelectMode : onBack}>
          {selectMode ? "Cancel" : "‹ Back"}
        </button>
        <span className="drawer-title">{selectMode ? `${selected.size} selected` : "Edit Components"}</span>
        {!selectMode && (
          <>
            <button
              className={`icon-btn ${searchOpen ? "active" : ""}`}
              title="Search"
              onClick={() => {
                setSearchOpen((v) => !v)
                setFiltersOpen(false)
              }}
            >
              <SearchIcon />
            </button>
            <button
              className={`icon-btn ${filtersOpen || activeFilterCount > 0 ? "active" : ""}`}
              title="Filter"
              onClick={() => {
                setFiltersOpen((v) => !v)
                setSearchOpen(false)
              }}
            >
              <SlidersIcon />
              {activeFilterCount > 0 && <span className="icon-btn-badge">{activeFilterCount}</span>}
            </button>
            {isSuperAdmin && (
              <button className="icon-btn" title="Select" onClick={() => setSelectMode(true)}>
                <CheckIcon />
              </button>
            )}
          </>
        )}
      </div>

      {!selectMode && searchOpen && (
        <input
          className="search"
          type="text"
          autoFocus
          placeholder="Search components…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {!selectMode && filtersOpen && (
        <div className="filter-row-wrap">
          <div className="filter-dropdown-backdrop" onClick={() => setFiltersOpen(false)} />
          <div className="filter-dropdown">
            <div className="filter-dropdown-label">Preview</div>
            <div className="filter-dropdown-chips">
              {(["all", "missing", "has"] as const).map((f) => (
                <button key={f} className={`cat-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "missing" ? "No preview" : "Has preview"}
                </button>
              ))}
            </div>
            <div className="filter-dropdown-label">Access</div>
            <div className="filter-dropdown-chips">
              {(["all", "free", "pro"] as const).map((f) => (
                <button key={f} className={`cat-btn ${tierFilter === f ? "active" : ""}`} onClick={() => setTierFilter(f)}>
                  {f === "all" ? "Any tier" : f === "free" ? "Free" : "Pro"}
                </button>
              ))}
            </div>
            <div className="filter-dropdown-label">Sort</div>
            <div className="filter-dropdown-chips">
              <button
                className={`cat-btn ${sortMode === "recent" ? "active" : ""}`}
                onClick={() => setSortMode((m) => (m === "recent" ? "order" : "recent"))}
              >
                Recently updated
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="edit-components-list">
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
                className="edit-components-row"
                onClick={() => (selectMode ? toggleSelected(c.id) : setOpenId(c.id))}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelected(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="review-sync-checkbox"
                  />
                )}
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
                    {SECTION_LABELS[c.section ?? ""] ?? "No section"} · {c.category} · {c.is_pro ? "Pro" : "Free"}
                    {c.tier_manually_set && " · locked"} · updated {relativeTime(c.updated_at)}
                  </span>
                </div>
                {!selectMode && <span className="edit-components-chevron">›</span>}
              </button>
            )
          })
        )}
      </div>

      {selectMode && filtered.length > 0 && (
        <div className="review-sync-actions">
          <button
            className="settings-toggle"
            onClick={() => setSelected(new Set(selected.size === filtered.length ? [] : filtered.map((c) => c.id)))}
          >
            {selected.size === filtered.length ? "Deselect all" : `Select all (${filtered.length})`}
          </button>
          {confirmBulkDelete ? (
            <div className="edit-components-delete-confirm">
              <button className="edit-components-confirm-btn cancel" onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}>
                Cancel
              </button>
              <button className="edit-components-confirm-btn danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? "Deleting…" : `Confirm delete (${selected.size})`}
              </button>
            </div>
          ) : (
            <button
              className="settings-upgrade-btn danger"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={selected.size === 0}
            >
              <TrashIcon /> Delete selected ({selected.size})
            </button>
          )}
        </div>
      )}
      {bulkStatus && <p className="settings-muted" style={{ padding: "0 18px" }}>{bulkStatus}</p>}
    </div>
  )
}

function ComponentEditor({
  component,
  isSuperAdmin,
  onBack,
  onChange,
  onDeleted,
}: {
  component: ComponentRow
  isSuperAdmin: boolean
  onBack: () => void
  onChange: (patch: Partial<ComponentRow>) => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(component.name)
  const [category, setCategory] = useState(component.category)
  const [isPro, setIsPro] = useState(component.is_pro)
  const [section, setSection] = useState<Section | null>(component.section)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dirty =
    name !== component.name || category !== component.category || isPro !== component.is_pro || section !== component.section

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
      await updateComponentFields(component.id, { name: name.trim(), category: category.trim(), is_pro: isPro, section })
      onChange({ name: name.trim(), category: category.trim(), is_pro: isPro, section, tier_manually_set: true })
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
        {isSuperAdmin &&
          (confirmingDelete ? (
            <div className="edit-components-delete-confirm">
              <button className="edit-components-confirm-btn cancel" onClick={() => setConfirmingDelete(false)} disabled={busy}>
                Cancel
              </button>
              <button className="edit-components-confirm-btn danger" onClick={handleDelete} disabled={busy}>
                {busy ? "Deleting…" : "Confirm"}
              </button>
            </div>
          ) : (
            <button className="edit-components-delete-btn" onClick={() => setConfirmingDelete(true)} disabled={busy}>
              <TrashIcon /> Delete
            </button>
          ))}
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

        <label className="onboarding-label">
          Section <span className="settings-muted">— where this shows on Home/Build, not the tier below</span>
        </label>
        <div className="onboarding-toggle-row">
          {(["part", "panel", "page"] as const).map((s) => (
            <button
              key={s}
              className={`onboarding-toggle ${section === s ? "selected" : ""}`}
              onClick={() => setSection(section === s ? null : s)}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
        </div>

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

        <div className="settings-row" style={{ marginTop: 20 }}>
          <span>Created</span>
          <span className="settings-value">{new Date(component.created_at).toLocaleString()}</span>
        </div>
        <div className="settings-row">
          <span>Last updated</span>
          <span className="settings-value">{new Date(component.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
