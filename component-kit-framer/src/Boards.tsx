import { useEffect, useState } from "react"
import { insertComponent } from "./nodeBuilders"
import {
  fetchBoards,
  fetchSavedItems,
  createBoard,
  deleteBoard,
  unsaveComponent,
  type Board,
  type SavedItem,
} from "./lib/boards"

export default function Boards() {
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [allSaved, setAllSaved] = useState<SavedItem[] | null>(null)
  const [openBoard, setOpenBoard] = useState<Board | null>(null)
  const [boardItems, setBoardItems] = useState<SavedItem[] | null>(null)
  const [newBoardName, setNewBoardName] = useState("")
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoot()
  }, [])

  function loadRoot() {
    setError(null)
    Promise.all([fetchBoards(), fetchSavedItems()])
      .then(([b, s]) => {
        setBoards(b)
        setAllSaved(s)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load boards."))
  }

  function openBoardDetail(board: Board) {
    setOpenBoard(board)
    setBoardItems(null)
    fetchSavedItems(board.id)
      .then(setBoardItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this board."))
  }

  async function handleCreateBoard() {
    const name = newBoardName.trim()
    if (!name) return
    setCreating(true)
    try {
      await createBoard(name)
      setNewBoardName("")
      loadRoot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't create board")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteBoard(board: Board) {
    try {
      await deleteBoard(board.id)
      setOpenBoard(null)
      loadRoot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't delete board")
    }
  }

  async function handleInsert(item: SavedItem) {
    setBusyId(item.id)
    try {
      await insertComponent(item.component.file_name, item.component.tsx_source)
      showToast(`Inserted "${item.component.name}"`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't insert — try again")
    } finally {
      setBusyId(null)
    }
  }

  async function handleUnsave(item: SavedItem) {
    try {
      await unsaveComponent(item.id)
      showToast("Removed")
      if (openBoard) openBoardDetail(openBoard)
      else loadRoot()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't remove")
    }
  }

  let toastTimer: ReturnType<typeof setTimeout>
  function showToast(text: string) {
    setToast(text)
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => setToast(null), 1800)
  }

  function renderSavedGrid(items: SavedItem[] | null) {
    if (!items) {
      return Array.from({ length: 4 }).map((_, i) => <div key={i} className="card skeleton" />)
    }
    if (items.length === 0) {
      return <div className="empty">Nothing saved here yet.</div>
    }
    return items.map((item) => (
      <div key={item.id} className={`card ${busyId === item.id ? "busy" : ""}`} onClick={() => handleInsert(item)}>
        <div className="preview" dangerouslySetInnerHTML={{ __html: item.component.preview_svg }} />
        <div className="card-footer">
          <span className="card-name">{item.component.name}</span>
          <button
            className="unsave-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleUnsave(item)
            }}
          >
            ✕
          </button>
        </div>
      </div>
    ))
  }

  if (openBoard) {
    return (
      <div className="app">
        <div className="boards-header">
          <button className="boards-back" onClick={() => setOpenBoard(null)}>
            ‹ Boards
          </button>
          <span className="boards-title">{openBoard.name}</span>
          <button className="boards-delete" onClick={() => handleDeleteBoard(openBoard)}>
            Delete
          </button>
        </div>
        <div className="grid">{renderSavedGrid(boardItems)}</div>
        <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="greeting">
        <div className="greeting-title">Boards</div>
        <div className="greeting-subtitle">Organize the components you've saved.</div>
      </div>

      <div className="boards-new">
        <input
          className="search"
          placeholder="New board name…"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
        />
        <button className="boards-create-btn" disabled={!newBoardName.trim() || creating} onClick={handleCreateBoard}>
          {creating ? "…" : "Create"}
        </button>
      </div>

      {error && <div className="empty">{error}</div>}

      {!error && (
        <>
          {boards && boards.length > 0 && (
            <div className="boards-list">
              {boards.map((b) => (
                <button key={b.id} className="board-item" onClick={() => openBoardDetail(b)}>
                  📁 {b.name}
                </button>
              ))}
            </div>
          )}

          <div className="greeting" style={{ paddingTop: 4 }}>
            <div className="greeting-title" style={{ fontSize: 15 }}>
              All saved
            </div>
          </div>
          <div className="grid">{renderSavedGrid(allSaved)}</div>
        </>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
