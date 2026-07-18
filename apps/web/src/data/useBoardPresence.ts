import { useEffect, useMemo, useRef } from "react";
import { db } from "../db";

type BoardPresenceUser = {
  sessionId: string;
  userId: string;
  username: string;
  avatarHash?: string;
  isCurrentSession: boolean;
  cursor?: {
    x: number;
    y: number;
  } | null;
  selectedNoteIds: string[];
};

type PresenceShape = {
  sessionId: string;
  userId: string;
  username: string;
  avatarHash?: string;
  cursor?: { x: number; y: number } | null;
  selectedNoteIds?: string[];
};

type PresenceOptions = {
  boardId: string | null;
  userId: string | null;
  username: string | null;
  emailHash: string | null;
  cursor?: { x: number; y: number } | null;
  selectedNoteIds?: string[];
};

function normalizeCursor(cursor: PresenceOptions["cursor"]) {
  if (!cursor) return null;
  if (!Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) return null;
  return { x: Math.round(cursor.x), y: Math.round(cursor.y) };
}

function normalizeSelectedNoteIds(ids: string[] | undefined) {
  if (!ids || ids.length === 0) return [];
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].sort();
}

export function useBoardPresence({
  boardId,
  userId,
  username,
  emailHash,
  cursor = null,
  selectedNoteIds = [],
}: PresenceOptions): BoardPresenceUser[] {
  const normalizedCursor = useMemo(() => normalizeCursor(cursor), [cursor]);
  const normalizedSelectedNoteIds = useMemo(
    () => normalizeSelectedNoteIds(selectedNoteIds),
    [selectedNoteIds],
  );
  const normalizedAvatarHash = emailHash || userId?.toLowerCase().replace(/-/g, "") || "";

  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Math.random().toString(36).slice(2, 10)}`,
  );

  // Use a stable room (or a dummy room when boardId is null)
  const roomId = boardId ?? "_none";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const room = db.room("board" as any, roomId);

  const initialPresence: PresenceShape = {
    sessionId: sessionIdRef.current,
    userId: userId ?? "",
    username: username ?? "",
    avatarHash: normalizedAvatarHash,
    cursor: normalizedCursor,
    selectedNoteIds: normalizedSelectedNoteIds,
  };

  const { user: myPresence, peers, publishPresence } = db.rooms.usePresence(
    room,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { initialPresence } as any,
  );

  // Update presence when cursor/selections change
  useEffect(() => {
    if (!boardId || !userId || !username || !publishPresence) return;

    (publishPresence as (v: PresenceShape) => void)({
      sessionId: sessionIdRef.current,
      userId,
      username,
      avatarHash: normalizedAvatarHash,
      cursor: normalizedCursor,
      selectedNoteIds: normalizedSelectedNoteIds,
    });
  }, [
    boardId,
    normalizedAvatarHash,
    normalizedCursor,
    normalizedSelectedNoteIds,
    publishPresence,
    userId,
    username,
  ]);

  return useMemo(() => {
    if (!boardId || !userId || !username) return [];

    const participants: BoardPresenceUser[] = [];

    if (myPresence) {
      participants.push({
        sessionId: sessionIdRef.current,
        userId,
        username,
        avatarHash: normalizedAvatarHash,
        isCurrentSession: true,
        cursor: normalizedCursor,
        selectedNoteIds: normalizedSelectedNoteIds,
      });
    }

    for (const [peerId, peer] of Object.entries(peers ?? {})) {
      const p = peer as unknown as PresenceShape;
      if (!p.userId || !p.username) continue;
      participants.push({
        sessionId: p.sessionId || peerId,
        userId: p.userId,
        username: p.username,
        avatarHash: p.avatarHash,
        isCurrentSession: false,
        cursor: p.cursor ?? null,
        selectedNoteIds: normalizeSelectedNoteIds(p.selectedNoteIds),
      });
    }

    return participants.sort((a, b) => a.username.localeCompare(b.username));
  }, [
    boardId,
    myPresence,
    normalizedAvatarHash,
    normalizedCursor,
    normalizedSelectedNoteIds,
    peers,
    userId,
    username,
  ]);
}
