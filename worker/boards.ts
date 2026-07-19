import type { AuthenticatedUser } from "./auth";

type BoardRole = "owner" | "editor" | "viewer";

type BoardRow = {
  id: string;
  title: string;
  owner_id: string;
  role: BoardRole;
  created_at: string;
  updated_at: string;
};

export type BoardRecord = {
  id: string;
  title: string;
  ownerId: string;
  role: BoardRole;
  createdAt: string;
  updatedAt: string;
};

function toBoard(row: BoardRow): BoardRecord {
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUserBoards(db: D1Database, userId: string) {
  const result = await db.prepare(`
    SELECT b.id, b.title, b.owner_id, bm.role, b.created_at, b.updated_at
    FROM boards b
    INNER JOIN board_members bm ON bm.board_id = b.id
    WHERE bm.user_id = ?
    ORDER BY b.updated_at DESC
  `).bind(userId).all<BoardRow>();

  return result.results.map(toBoard);
}

export async function getBoard(db: D1Database, boardId: string, userId: string) {
  const row = await db.prepare(`
    SELECT b.id, b.title, b.owner_id, bm.role, b.created_at, b.updated_at
    FROM boards b
    INNER JOIN board_members bm ON bm.board_id = b.id
    WHERE b.id = ? AND bm.user_id = ?
  `).bind(boardId, userId).first<BoardRow>();

  return row ? toBoard(row) : null;
}

export async function createUserBoard(db: D1Database, user: AuthenticatedUser, title: string) {
  const boardId = crypto.randomUUID();
  const cleanedTitle = title.trim().slice(0, 120) || "Untitled board";

  await db.batch([
    db.prepare("INSERT INTO boards (id, owner_id, title) VALUES (?, ?, ?)")
      .bind(boardId, user.id, cleanedTitle),
    db.prepare("INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, 'owner')")
      .bind(boardId, user.id),
  ]);

  const board = await getBoard(db, boardId, user.id);
  if (!board) throw new Error("Board creation did not return a board");
  return board;
}

export async function renameBoard(
  db: D1Database,
  board: BoardRecord,
  userId: string,
  title: string,
) {
  if (board.role === "viewer") return null;
  const cleanedTitle = title.trim().slice(0, 120);
  if (!cleanedTitle) return null;

  await db.prepare(`
    UPDATE boards
    SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(cleanedTitle, board.id).run();

  return getBoard(db, board.id, userId);
}

export async function removeBoard(db: D1Database, board: BoardRecord) {
  if (board.role !== "owner") return false;
  await db.prepare("DELETE FROM boards WHERE id = ?").bind(board.id).run();
  return true;
}
