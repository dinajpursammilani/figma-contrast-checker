import { useEffect, useState } from "react"
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

  useEffect(() => {
    Promise.all([fetchBoards(), fetchMembership(componentId)]).then(([b, m]) => {
      setBoards(b)
      setMembership(m)
    })
  }, [componentId])

  function isChecked(boardId: string | null) {
    return membership.some((m) => m.board_id === boardId)
  }

  async function toggle(boardId: string | null) {
    const key = boardId ?? "unsorted"
    setBusy(key)
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
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateAndSave() {
    const name = newBoardName.trim()
    if (!name) return
    setCreating(true)
    try {
      const board = await createBoard(name)
      setBoards((prev) => [...(prev ?? []), board])
      setNewBoardName("")
      await toggle(board.id)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="drawer-title">Save "{componentName}"</div>

        <div className="drawer-list">
          <button className="drawer-item" onClick={() => toggle(null)} disabled={busy === "unsorted"}>
            <span>{isChecked(null) ? "✅" : "⬜️"} All saved</span>
          </button>

          {boards === null ? (
            <div className="drawer-loading">Loading boards…</div>
          ) : (
            boards.map((b) => (
              <button key={b.id} className="drawer-item" onClick={() => toggle(b.id)} disabled={busy === b.id}>
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
          />
          <button className="boards-create-btn" disabled={!newBoardName.trim() || creating} onClick={handleCreateAndSave}>
            {creating ? "…" : "+ New"}
          </button>
        </div>

        <button className="drawer-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
