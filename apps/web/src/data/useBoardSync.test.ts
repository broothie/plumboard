import { describe, expect, it } from "vitest";
import { assembleBoardsFromQuery, buildTransactions } from "./boards";
import type { QueryData } from "./boards";

// useBoardSync relies on db.useQuery (InstantDB live subscription) which
// can't be exercised in unit tests without a real InstantDB connection.
// The integration behaviour (hydration, debounced save) is covered by
// end-to-end tests. Here we unit-test the pure helpers that useBoardSync uses.

describe("assembleBoardsFromQuery (used by useBoardSync)", () => {
  it("maps InstantDB query data to Board[]", () => {
    const data: QueryData = {
      boards: [
        {
          id: "board-1",
          title: "Ideas",
          description: "Hello",
          createdAt: 1000,
          owner: { id: "user-1" },
          members: [],
          notes: [
            {
              id: "note-1",
              type: "text",
              x: 0,
              y: 0,
              width: 260,
              height: 190,
              body: "Start here.",
              createdAt: 500,
            },
          ],
        },
      ],
    };

    const boards = assembleBoardsFromQuery(data);
    expect(boards).toHaveLength(1);
    expect(boards[0]).toMatchObject({
      id: "board-1",
      title: "Ideas",
      description: "Hello",
      ownerUserId: "user-1",
    });
    expect(boards[0].notes).toHaveLength(1);
    expect(boards[0].notes[0].type).toBe("text");
  });
});

describe("buildTransactions (used by useBoardSync)", () => {
  it("produces delete operations for dirty board deletes", () => {
    const txOps = buildTransactions("user-1", [], {
      boardUpsertIds: [],
      boardDeleteIds: ["board-old"],
      noteUpsertIds: [],
      noteDeleteIds: [],
    });
    expect(txOps).toHaveLength(1);
  });

  it("produces delete operations for dirty note deletes", () => {
    const txOps = buildTransactions("user-1", [], {
      boardUpsertIds: [],
      boardDeleteIds: [],
      noteUpsertIds: [],
      noteDeleteIds: ["note-gone"],
    });
    expect(txOps).toHaveLength(1);
  });

  it("produces no operations when change set is empty", () => {
    const txOps = buildTransactions("user-1", [], {
      boardUpsertIds: [],
      boardDeleteIds: [],
      noteUpsertIds: [],
      noteDeleteIds: [],
    });
    expect(txOps).toHaveLength(0);
  });
});
