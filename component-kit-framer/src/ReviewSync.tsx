import { useEffect, useMemo, useState } from "react"
import {
  fetchStagedComponents,
  updateStagedComponent,
  discardStagedComponent,
  discardStagedComponents,
  importStagedComponents,
  type StagedComponent,
} from "./lib/stagedComponents"
import { SearchIcon, SlidersIcon } from "./icons"

type TierFilter = "all" | "free" | "pro"
type StatusFilter = "all" | "new" | "existing"

/** Admin-only review queue between "Sync from this project" and the live catalog — nothing
 * staged here is visible to real users until explicitly imported. Exists specifically to catch
 * a sync mis-tagging something Pro as Free (or vice versa) before it goes live to everyone,
 * instead of after. Reached from Settings → Admin. */
export default function ReviewSync({ onBack, onImported }: { onBack: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<StagedComponent[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tierFilter, setTierFilter] = useState<TierFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmReject, setConfirmReject] = useState<"selected" | "all" | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = (tierFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)

  function load() {
    fetchStagedComponents()
      .then(setRows)
      .catch((err) => setStatus(err instanceof Error ? err.message : "Couldn't load"))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((r) => {
      if (tierFilter === "free" && r.is_pro) return false
      if (tierFilter === "pro" && !r.is_pro) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [rows, tierFilter, statusFilter, search])

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function patchLocal(id: string, patch: Partial<StagedComponent>) {
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? prev)
  }

  async function handleToggleTier(row: StagedComponent) {
    const nextIsPro = !row.is_pro
    patchLocal(row.id, { is_pro: nextIsPro })
    try {
      await updateStagedComponent(row.id, { is_pro: nextIsPro })
    } catch (err) {
      patchLocal(row.id, { is_pro: row.is_pro })
      setStatus(err instanceof Error ? err.message : "Couldn't update")
    }
  }

  async function handleDiscard(id: string) {
    try {
      await discardStagedComponent(id)
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? prev)
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Couldn't discard")
    }
  }

  async function handleReject(ids: string[] | "all") {
    setBusy(true)
    setStatus(null)
    try {
      const discarded = await discardStagedComponents(ids)
      setStatus(`Rejected ${discarded} component${discarded === 1 ? "" : "s"} — removed from the review queue.`)
      setSelected(new Set())
      setConfirmReject(null)
      load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Reject failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(ids: string[] | "all") {
    setBusy(true)
    setStatus(null)
    try {
      const imported = await importStagedComponents(ids)
      setStatus(`Imported ${imported} component${imported === 1 ? "" : "s"} into the live catalog.`)
      setSelected(new Set())
      load()
      onImported()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="edit-components">
      <div className="edit-components-header">
        <button className="boards-back" onClick={onBack}>
          ‹ Back
        </button>
        <span className="drawer-title">Review Sync</span>
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
      </div>

      {searchOpen && (
        <input
          className="search"
          type="text"
          autoFocus
          placeholder="Search staged components…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {filtersOpen && (
        <div className="filter-row-wrap">
          <div className="filter-dropdown-backdrop" onClick={() => setFiltersOpen(false)} />
          <div className="filter-dropdown">
            <div className="filter-dropdown-label">Access</div>
            <div className="filter-dropdown-chips">
              {(["all", "free", "pro"] as const).map((f) => (
                <button key={f} className={`cat-btn ${tierFilter === f ? "active" : ""}`} onClick={() => setTierFilter(f)}>
                  {f === "all" ? "Any tier" : f === "free" ? "Free" : "Pro"}
                </button>
              ))}
            </div>
            <div className="filter-dropdown-label">Status</div>
            <div className="filter-dropdown-chips">
              {(["all", "new", "existing"] as const).map((f) => (
                <button key={f} className={`cat-btn ${statusFilter === f ? "active" : ""}`} onClick={() => setStatusFilter(f)}>
                  {f === "all" ? "All" : f === "new" ? "New" : "Existing"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="edit-components-list">
        {!rows ? (
          <p className="settings-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="settings-muted">{rows.length === 0 ? "Nothing pending — sync from Settings to pull in new changes." : "No staged components match."}</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="review-sync-row">
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggleSelected(r.id)}
                className="review-sync-checkbox"
              />
              <div className="edit-components-info">
                <span className="edit-components-name">{r.name}</span>
                <span className="edit-components-meta">
                  {r.category}
                  {r.status === "existing" && r.locked && " · will keep locked tier/category live"}
                </span>
              </div>
              <span className={`review-sync-status ${r.status}`}>{r.status === "new" ? "NEW" : "EXISTING"}</span>
              <button
                className={`review-sync-tier ${r.is_pro ? "pro" : "free"}`}
                onClick={() => handleToggleTier(r)}
                disabled={r.status === "existing" && r.locked}
                title={r.status === "existing" && r.locked ? "Locked in Edit Components — unlock it there to change" : "Click to flip Free/Pro"}
              >
                {r.is_pro ? "PRO" : "FREE"}
              </button>
              <button className="edit-components-delete-btn" onClick={() => handleDiscard(r.id)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="review-sync-actions">
          <button
            className="settings-toggle"
            onClick={() => handleImport(Array.from(selected))}
            disabled={busy || selected.size === 0}
          >
            {busy ? "Importing…" : `Import selected (${selected.size})`}
          </button>
          <button className="settings-upgrade-btn" onClick={() => handleImport("all")} disabled={busy}>
            {busy ? "Importing…" : `Import all (${rows.length})`}
          </button>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="review-sync-actions">
          {confirmReject ? (
            <div className="edit-components-delete-confirm" style={{ flex: 1, justifyContent: "flex-end" }}>
              <button className="edit-components-confirm-btn cancel" onClick={() => setConfirmReject(null)} disabled={busy}>
                Cancel
              </button>
              <button
                className="edit-components-confirm-btn danger"
                onClick={() => handleReject(confirmReject === "all" ? "all" : Array.from(selected))}
                disabled={busy}
              >
                {busy ? "Rejecting…" : confirmReject === "all" ? `Confirm reject all (${rows.length})` : `Confirm reject (${selected.size})`}
              </button>
            </div>
          ) : (
            <>
              <button
                className="settings-toggle"
                onClick={() => setConfirmReject("selected")}
                disabled={busy || selected.size === 0}
              >
                {`Reject selected (${selected.size})`}
              </button>
              <button className="settings-toggle danger" onClick={() => setConfirmReject("all")} disabled={busy}>
                {`Reject all (${rows.length})`}
              </button>
            </>
          )}
        </div>
      )}
      {status && <p className="settings-muted" style={{ padding: "0 18px" }}>{status}</p>}
    </div>
  )
}
