import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import {
  fetchBoards,
  fetchMembership,
  saveComponent,
  unsaveComponent,
  createBoard,
  type Board,
} from "./lib/boards"

interface Props {
  componentId: string
  componentName: string
  onClose: () => void
}

export default function SaveDrawer({ componentId, componentName, onClose }: Props) {
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [membership, setMembership] = useState<{ id: string; board_id: string | null }[]>([])
  const [newBoardName, setNewBoardName] = useState("")
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Optimistic true so the drawer doesn't flash "disabled" while the check itself is in flight —
  // it only actually disables things once we've confirmed the session really is gone.
  const [hasSession, setHasSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  useEffect(() => {
    setError(null)
    Promise.all([fetchBoards(), fetchMembership(componentId)])
      .then(([b, m]) => {
        setBoards(b)
        setMembership(m)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your boards"))
  }, [componentId])

  function isChecked(boardId: string | null) {
    return membership.some((m) => m.board_id === boardId)
  }

  async function toggle(boardId: string | null) {
    const key = boardId ?? "unsorted"
    setBusy(key)
    setError(null)
    try {
      const existing = membership.find((m) => m.board_id === boardId)
      if (existing) {
        await unsaveComponent(existing.id)
        setMembership((prev) => prev.filter((m) => m.id !== existing.id))
      } else {
        await saveComponent(componentId, boardId)
        const fresh = await fetchMembership(componentId)
        setMembership(fresh)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update — try again")
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateAndSave() {
    const name = newBoardName.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      const board = await createBoard(name)
      setBoards((prev) => [...(prev ?? []), board])
      setNewBoardName("")
      await toggle(board.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create board")
    } finally {
      setCreating(false)
    }
  }

  const actionsDisabled = !hasSession

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="drawer-title">Save "{componentName}"</div>

        {!hasSession && (
          <p className="settings-muted" style={{ padding: "0 4px 8px" }}>
            Your session has expired — reopen the plugin to sign in again before saving.
          </p>
        )}

        <div className="drawer-list">
          <button className="drawer-item" onClick={() => toggle(null)} disabled={actionsDisabled || busy === "unsorted"}>
            <span>{isChecked(null) ? "✅" : "⬜️"} All saved</span>
          </button>

          {boards === null ? (
            <div className="drawer-loading">{error ? error : "Loading boards…"}</div>
          ) : (
            boards.map((b) => (
              <button
                key={b.id}
                className="drawer-item"
                onClick={() => toggle(b.id)}
                disabled={actionsDisabled || busy === b.id}
              >
                <span>
                  {isChecked(b.id) ? "✅" : "⬜️"} 📁 {b.name}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="drawer-new">
          <input
            className="search"
            placeholder="New board name…"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAndSave()}
            disabled={actionsDisabled}
          />
          <button
            className="boards-create-btn"
            disabled={actionsDisabled || !newBoardName.trim() || creating}
            onClick={handleCreateAndSave}
          >
            {creating ? "…" : "+ New"}
          </button>
        </div>

        {error && boards !== null && (
          <p className="settings-muted" style={{ padding: "0 4px" }}>
            {error}
          </p>
        )}

        <button className="drawer-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
