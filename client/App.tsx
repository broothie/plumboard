import {
  Check,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  createBoard,
  deleteBoard,
  getCurrentUser,
  listBoards,
  updateBoard,
  type BoardSummary,
  type CurrentUser,
} from "./api";
import { BoardCanvas } from "./BoardCanvas";

function initials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function defaultBoardTitle() {
  const adjectives = ["Quiet", "Bright", "Curious", "Electric", "Tender", "Wild"];
  const nouns = ["Garden", "Workshop", "Archive", "Constellation", "Studio", "Field"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

export function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [{ user: nextUser }, { boards: nextBoards }] = await Promise.all([
        getCurrentUser(),
        listBoards(),
      ]);
      setUser(nextUser);
      setBoards(nextBoards);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Plumboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateBoard = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);

    try {
      const { board } = await createBoard(defaultBoardTitle());
      setBoards((current) => [board, ...current]);
      setIsSidebarOpen(false);
      navigate(`/boards/${board.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create board");
    } finally {
      setIsCreating(false);
    }
  };

  const handleBoardUpdated = (nextBoard: BoardSummary) => {
    setBoards((current) => current.map((board) => board.id === nextBoard.id ? nextBoard : board));
  };

  const handleBoardDeleted = (boardId: string) => {
    setBoards((current) => current.filter((board) => board.id !== boardId));
    navigate("/");
  };

  if (isLoading) {
    return (
      <main className="loading-screen">
        <div className="brand-mark brand-mark--large">P</div>
        <p>Opening your boards...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="loading-screen">
        <div className="brand-mark brand-mark--large">P</div>
        <h1>Plumboard could not identify you</h1>
        <p>{error ?? "Check the Cloudflare Access configuration."}</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        aria-label="Toggle boards"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${isSidebarOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">P</div>
          <div>
            <strong>Plumboard</strong>
            <span>Make room for ideas</span>
          </div>
        </div>

        <button
          type="button"
          className="new-board-button"
          onClick={() => void handleCreateBoard()}
          disabled={isCreating}
        >
          <Plus size={17} />
          {isCreating ? "Making a board..." : "New board"}
        </button>

        <div className="board-list-heading">
          <span>Your boards</span>
          <span>{boards.length}</span>
        </div>

        <nav className="board-list" aria-label="Boards">
          {boards.map((board) => (
            <button
              type="button"
              className="board-list-item"
              key={board.id}
              onClick={() => {
                setIsSidebarOpen(false);
                navigate(`/boards/${board.id}`);
              }}
            >
              <span className="board-list-dot" />
              <span>{board.title}</span>
            </button>
          ))}
        </nav>

        <div className="account-card">
          <div className="avatar">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name || user.email)}
          </div>
          <div className="account-copy">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <a href="/cdn-cgi/access/logout" aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </a>
        </div>
      </aside>

      {isSidebarOpen ? (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close boards"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <section className="workspace">
        {error ? <div className="error-banner">{error}</div> : null}
        <Routes>
          <Route
            path="/"
            element={boards[0] ? <Navigate to={`/boards/${boards[0].id}`} replace /> : <EmptyState onCreate={handleCreateBoard} />}
          />
          <Route
            path="/boards/:boardId"
            element={
              <BoardRoute
                boards={boards}
                user={user}
                onUpdated={handleBoardUpdated}
                onDeleted={handleBoardDeleted}
                onError={setError}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </section>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => Promise<void> }) {
  return (
    <div className="empty-state">
      <div className="empty-orbit" aria-hidden="true">
        <Sparkles size={30} />
      </div>
      <p className="eyebrow">A fresh surface</p>
      <h1>Give your ideas somewhere to land.</h1>
      <p>Create a board, scatter some notes, and let the shape of the thought emerge.</p>
      <button type="button" onClick={() => void onCreate()}>
        <Plus size={18} /> Create your first board
      </button>
    </div>
  );
}

type BoardRouteProps = {
  boards: BoardSummary[];
  user: CurrentUser;
  onUpdated: (board: BoardSummary) => void;
  onDeleted: (boardId: string) => void;
  onError: (message: string | null) => void;
};

function BoardRoute({ boards, user, onUpdated, onDeleted, onError }: BoardRouteProps) {
  const { boardId = "" } = useParams<{ boardId: string }>();
  const board = useMemo(() => boards.find((candidate) => candidate.id === boardId), [boardId, boards]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(board?.title ?? "");

  useEffect(() => {
    setTitle(board?.title ?? "");
    setIsEditingTitle(false);
    document.title = board ? `${board.title} - Plumboard` : "Plumboard";
  }, [board]);

  if (!board) {
    return (
      <div className="empty-state">
        <p className="eyebrow">Board not found</p>
        <h1>This board has wandered off.</h1>
        <a href="/">Return to your boards</a>
      </div>
    );
  }

  const saveTitle = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === board.title) {
      setTitle(board.title);
      setIsEditingTitle(false);
      return;
    }

    try {
      const { board: nextBoard } = await updateBoard(board.id, nextTitle);
      onUpdated(nextBoard);
      setIsEditingTitle(false);
      onError(null);
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Could not rename board");
    }
  };

  const removeBoard = async () => {
    if (!window.confirm(`Delete “${board.title}”? This cannot be undone.`)) return;
    try {
      await deleteBoard(board.id);
      onDeleted(board.id);
      onError(null);
    } catch (deleteError) {
      onError(deleteError instanceof Error ? deleteError.message : "Could not delete board");
    }
  };

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-title-group">
          {isEditingTitle ? (
            <form
              className="title-editor"
              onSubmit={(event) => {
                event.preventDefault();
                void saveTitle();
              }}
            >
              <input
                autoFocus
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setTitle(board.title);
                    setIsEditingTitle(false);
                  }
                }}
              />
              <button type="submit" aria-label="Save title"><Check size={17} /></button>
            </form>
          ) : (
            <button type="button" className="board-title" onClick={() => setIsEditingTitle(true)}>
              <span>{board.title}</span>
              <Pencil size={14} />
            </button>
          )}
          <span className="board-owner">owned by {board.ownerId === user.id ? "you" : "a collaborator"}</span>
        </div>
        {board.role === "owner" ? (
          <button type="button" className="danger-icon-button" onClick={() => void removeBoard()} title="Delete board">
            <Trash2 size={17} />
          </button>
        ) : null}
      </header>
      <BoardCanvas key={board.id} board={board} user={user} />
    </div>
  );
}
