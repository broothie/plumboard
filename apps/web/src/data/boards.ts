import type { Board, Note } from "@plumboard/core";
import { db } from "../db";

// ---- InstantDB query result types ----

type InstantNote = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  body?: string | null;
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  url?: string | null;
  siteName?: string | null;
  description?: string | null;
  previewImage?: string | null;
  createdAt?: number;
};

type InstantBoardMember = {
  id: string;
  role: string;
  user?: { id: string };
};

type InstantBoard = {
  id: string;
  title: string;
  description?: string | null;
  createdAt?: number;
  notes?: InstantNote[];
  owner?: { id: string };
  members?: InstantBoardMember[];
};

export type QueryData = {
  boards?: InstantBoard[];
};

// ---- Mapping helpers ----

function assertUnreachable(value: never): never {
  throw new Error(`Unsupported note type: ${value}`);
}

export function mapInstantNoteToNote(row: InstantNote): Note {
  if (row.type === "text") {
    return {
      id: row.id,
      type: "text",
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      title: row.title ?? undefined,
      body: row.body ?? "",
    };
  }

  if (row.type === "image") {
    return {
      id: row.id,
      type: "image",
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      src: row.src ?? "",
      alt: row.alt ?? "",
      caption: row.caption ?? undefined,
    };
  }

  if (row.type === "link") {
    return {
      id: row.id,
      type: "link",
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      url: row.url ?? "",
      siteName: row.siteName ?? "",
      title: row.title ?? "",
      description: row.description ?? undefined,
      previewImage: row.previewImage ?? undefined,
    };
  }

  return assertUnreachable(row.type as never);
}

function noteToInstantFields(note: Note) {
  return {
    type: note.type,
    x: note.x,
    y: note.y,
    width: note.width,
    height: note.height,
    title: "title" in note ? (note.title ?? null) : null,
    body: note.type === "text" ? note.body : null,
    src: note.type === "image" ? note.src : null,
    alt: note.type === "image" ? note.alt : null,
    caption: note.type === "image" ? (note.caption ?? null) : null,
    url: note.type === "link" ? note.url : null,
    siteName: note.type === "link" ? note.siteName : null,
    description: note.type === "link" ? (note.description ?? null) : null,
    previewImage: note.type === "link" ? (note.previewImage ?? null) : null,
  };
}

export function assembleBoardsFromQuery(data: QueryData): Board[] {
  return (data.boards ?? [])
    .slice()
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    .map((board) => ({
      id: board.id,
      title: board.title,
      description: board.description ?? "",
      ownerUserId: board.owner?.id,
      notes: (board.notes ?? [])
        .slice()
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .map(mapInstantNoteToNote),
    }));
}

export type SaveBoardsChangeSet = {
  boardUpsertIds: string[];
  boardDeleteIds: string[];
  noteUpsertIds: string[];
  noteDeleteIds: string[];
};

type BoardNoteRef = {
  boardId: string;
  note: Note;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTransactions(
  userId: string,
  boards: Board[],
  changeSet: SaveBoardsChangeSet,
): any[] {
  const boardById = new Map(boards.map((b) => [b.id, b]));
  const noteById = new Map<string, BoardNoteRef>();
  for (const board of boards) {
    for (const note of board.notes) {
      noteById.set(note.id, { boardId: board.id, note });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txOps: any[] = [];

  for (const boardId of changeSet.boardUpsertIds) {
    const board = boardById.get(boardId);
    if (!board) continue;
    txOps.push(
      db.tx.boards[boardId]
        .update({
          title: board.title,
          description: board.description,
          createdAt: Date.now(),
        })
        .link({ owner: userId }),
    );
  }

  for (const boardId of changeSet.boardDeleteIds) {
    txOps.push(db.tx.boards[boardId].delete());
  }

  for (const noteId of changeSet.noteUpsertIds) {
    const noteRef = noteById.get(noteId);
    if (!noteRef) continue;
    txOps.push(
      db.tx.notes[noteId]
        .update({
          ...noteToInstantFields(noteRef.note),
          createdAt: Date.now(),
        })
        .link({ board: noteRef.boardId }),
    );
  }

  for (const noteId of changeSet.noteDeleteIds) {
    txOps.push(db.tx.notes[noteId].delete());
  }

  return txOps;
}
