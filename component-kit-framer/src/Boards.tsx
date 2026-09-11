import { useEffect, useState, type ReactNode } from "react"
import { insertComponent, insertFromModuleUrl } from "./nodeBuilders"
import { fetchComponentSource } from "./lib/componentSource"
import { LockIcon, FolderIcon, BookmarkIcon, TrashIcon, CrownIcon, categoryIconFor } from "./icons"
import { getProStatus } from "./lib/payments"
import {
  fetchBoards,
  fetchSavedItems,
  createBoard,
  deleteBoard,
  unsaveComponent,
  type Board,
  type SavedItem,
} from "./lib/boards"

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-badge">{icon}</div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  )
}

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
  const [isPro, setIsPro] = useState<boolean | null>(null)

  useEffect(() => {
    loadRoot()
    getProStatus().then(setIsPro)
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
    if (item.component.is_pro && !isPro) {
      showToast("Upgrade to Pro to insert this component")
      return
    }
    setBusyId(item.id)
    try {
      if (item.component.module_url) {
        await insertFromModuleUrl(item.component.module_url)
      } else {
        const src = await fetchComponentSource(item.component.id)
        if (!src) throw new Error("Upgrade to Pro to insert this component")
        await insertComponent(src.file_name, src.tsx_source)
      }
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

  function boardStack(items: SavedItem[]) {
    const preview = items.slice(0, 3)
    if (preview.length === 0) {
      return (
        <div className="board-stack-empty">
          <FolderIcon />
        </div>
      )
    }
    // Fan up to 3 tiles around center, back-to-front so the middle one ends up on top.
    const offsets = [-16, 0, 16]
    const rotations = [-8, 0, 8]
    return preview.map((item, i) => {
      const c = item.component
      return (
        <div
          key={item.id}
          className="board-stack-tile"
          style={{
            transform: `translateX(calc(-50% + ${offsets[i]}px)) rotate(${rotations[i]}deg)`,
            zIndex: 3 - Math.abs(i - 1),
          }}
        >
          {c.preview_image_url ? (
            <img src={c.preview_image_url} alt="" />
          ) : c.preview_svg ? (
            <div dangerouslySetInnerHTML={{ __html: c.preview_svg }} />
          ) : (
            (() => {
              const CategoryIcon = categoryIconFor(c.category)
              return <CategoryIcon />
            })()
          )}
        </div>
      )
    })
  }

  function renderSavedGrid(items: SavedItem[] | null, emptyMessage: string) {
    if (!items) {
      return Array.from({ length: 4 }).map((_, i) => <div key={i} className="card skeleton" />)
    }
    if (items.length === 0) {
      return (
        <EmptyState icon={<BookmarkIcon />} title="Nothing saved here yet" subtitle={emptyMessage} />
      )
    }
    return items.map((item) => {
      const locked = item.component.is_pro && !isPro
      return (
        <div
          key={item.id}
          className={`card ${busyId === item.id ? "busy" : ""} ${locked ? "locked" : ""}`}
          onClick={() => handleInsert(item)}
        >
          {item.component.preview_image_url ? (
            <div className="preview">
              <img src={item.component.preview_image_url} alt="" />
            </div>
          ) : item.component.preview_svg ? (
            <div className="preview" dangerouslySetInnerHTML={{ __html: item.component.preview_svg }} />
          ) : (
            (() => {
              const CategoryIcon = categoryIconFor(item.component.category)
              return (
                <div className="preview preview-fallback">
                  <CategoryIcon />
                </div>
              )
            })()
          )}
          {locked && (
            <div className="preview-lock">
              <div className="preview-lock-icon"><LockIcon /></div>
            </div>
          )}
          <button
            className="unsave-btn"
            title="Remove"
            onClick={(e) => {
              e.stopPropagation()
              handleUnsave(item)
            }}
          >
            ✕
          </button>
          <div className="card-footer">
            <span className="card-name">{item.component.name}</span>
            {item.component.is_pro ? (
              <span className="pro-badge">
                <CrownIcon />
                Pro
              </span>
            ) : (
              <span className="badge-free">Free</span>
            )}
          </div>
        </div>
      )
    })
  }

  if (openBoard) {
    return (
      <div className="app">
        <div className="boards-header">
          <button className="boards-back" onClick={() => setOpenBoard(null)}>
            ‹ Boards
          </button>
          <span className="boards-title">{openBoard.name}</span>
          <button className="boards-delete" onClick={() => handleDeleteBoard(openBoard)} title="Delete board">
            <TrashIcon />
          </button>
        </div>
        <div className="boards-scroll">
          <div className="list">
            {renderSavedGrid(boardItems, "Tap the bookmark icon on any component in Build to add it here.")}
          </div>
        </div>
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

      <div className="boards-scroll">
        {error && <div className="empty">{error}</div>}

        {!error &&
          (boards && boards.length === 0 && allSaved && allSaved.length === 0 ? (
            <EmptyState
              icon={<FolderIcon />}
              title="Nothing saved yet"
              subtitle="Save components from Build to see them here, and group them into boards by project."
            />
          ) : (
            <>
              {boards && boards.length > 0 && (
                <>
                <div className="home-section-label">Your boards</div>
                <div className="grid">
                  {boards.map((b) => {
                    const items = allSaved?.filter((i) => i.board_id === b.id) ?? []
                    return (
                      <button key={b.id} className="board-card" onClick={() => openBoardDetail(b)}>
                        <div className="board-card-stack">{boardStack(items)}</div>
                        <div className="board-card-footer">
                          <span className="board-card-name">{b.name}</span>
                          <span className="board-card-count">{items.length} saved</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                </>
              )}

              <div className="home-section-label">All saved</div>
              <div className="list">
                {renderSavedGrid(allSaved, "Tap the bookmark icon on any component in Build to save it.")}
              </div>
            </>
          ))}
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  )
}
