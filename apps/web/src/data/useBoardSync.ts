import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@plumboard/core";
import { db } from "../db";
import { assembleBoardsFromQuery, buildTransactions, type QueryData } from "./boards";

const SAVE_DEBOUNCE_MS = 250;

export function useBoardSync(userId: string | undefined, focusedBoardId: string | null = null) {
  const boards = useAppStore((state) => state.boards);
  const setBoards = useAppStore((state) => state.setBoards);
  const clearSyncState = useAppStore((state) => state.clearSyncState);
  const acknowledgeSyncChangeSet = useAppStore((state) => state.acknowledgeSyncChangeSet);
  const syncRevision = useAppStore((state) => state.syncRevision);
  const dirtyBoardUpserts = useAppStore((state) => state.dirtyBoardUpserts);
  const dirtyBoardDeletes = useAppStore((state) => state.dirtyBoardDeletes);
  const dirtyNoteUpserts = useAppStore((state) => state.dirtyNoteUpserts);
  const dirtyNoteDeletes = useAppStore((state) => state.dirtyNoteDeletes);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const dirtyBoardUpsertIds = Object.keys(dirtyBoardUpserts);
  const dirtyBoardDeleteIds = Object.keys(dirtyBoardDeletes);
  const dirtyNoteUpsertIds = Object.keys(dirtyNoteUpserts);
  const dirtyNoteDeleteIds = Object.keys(dirtyNoteDeletes);
  const hasPendingLocalChanges =
    dirtyBoardUpsertIds.length > 0 ||
    dirtyBoardDeleteIds.length > 0 ||
    dirtyNoteUpsertIds.length > 0 ||
    dirtyNoteDeleteIds.length > 0;

  // Live query: boards + notes for the focused board (if any)
  const query = userId
    ? focusedBoardId
      ? {
          boards: {
            $: {},
            notes: {},
            owner: {},
            members: { user: {} },
          },
        }
      : {
          boards: {
            $: {},
            owner: {},
            members: { user: {} },
          },
        }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { isLoading, error: queryError, data } = db.useQuery(query as any);

  // Live query → Zustand store (skip when local changes are pending)
  useEffect(() => {
    if (!userId || !data) return;
    if (hasPendingLocalChanges && hydratedUserIdRef.current === userId) return;

    const nextBoards = assembleBoardsFromQuery(data as QueryData);
    setBoards(nextBoards);
    clearSyncState();
    hydratedUserIdRef.current = userId;
  }, [clearSyncState, data, hasPendingLocalChanges, setBoards, userId]);

  // Clear store when user logs out
  useEffect(() => {
    if (!userId) {
      hydratedUserIdRef.current = null;
      setBoards([]);
      clearSyncState();
    }
  }, [clearSyncState, setBoards, userId]);

  // Flush dirty changes → InstantDB (debounced)
  useEffect(() => {
    if (!userId || !hasPendingLocalChanges) return;
    if (hydratedUserIdRef.current !== userId) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    const changeSet = {
      boardUpsertIds: dirtyBoardUpsertIds,
      boardDeleteIds: dirtyBoardDeleteIds,
      noteUpsertIds: dirtyNoteUpsertIds,
      noteDeleteIds: dirtyNoteDeleteIds,
    };
    const changeSetWithRevision = { ...changeSet, upToRevision: syncRevision };

    saveTimeoutRef.current = window.setTimeout(() => {
      const txOps = buildTransactions(userId, boards, changeSet);

      if (txOps.length === 0) {
        acknowledgeSyncChangeSet(changeSetWithRevision);
        return;
      }

      db.transact(txOps)
        .then(() => {
          acknowledgeSyncChangeSet(changeSetWithRevision);
          setSaveError(null);
        })
        .catch((err: Error) => {
          setSaveError(err.message);
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    acknowledgeSyncChangeSet,
    boards,
    dirtyBoardDeleteIds,
    dirtyBoardUpsertIds,
    dirtyNoteDeleteIds,
    dirtyNoteUpsertIds,
    hasPendingLocalChanges,
    syncRevision,
    userId,
  ]);

  return {
    isLoading: isLoading && !data,
    loadError: queryError ? String(queryError) : null,
    saveError,
  };
}
