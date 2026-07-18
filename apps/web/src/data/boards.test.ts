import { describe, expect, it } from "vitest";
import { assembleBoardsFromQuery, mapInstantNoteToNote } from "./boards";
import type { QueryData } from "./boards";

const baseNote = {
  id: "note-1",
  type: "text",
  x: 16,
  y: 24,
  width: 300,
  height: 220,
  title: "Note title",
  body: "Note body",
  src: null,
  alt: null,
  caption: null,
  url: null,
  siteName: null,
  description: null,
  previewImage: null,
  createdAt: 1000,
};

describe("mapInstantNoteToNote", () => {
  it("maps a text note", () => {
    expect(mapInstantNoteToNote(baseNote)).toEqual({
      id: "note-1",
      type: "text",
      x: 16,
      y: 24,
      width: 300,
      height: 220,
      title: "Note title",
      body: "Note body",
    });
  });

  it("maps an image note", () => {
    const row = {
      ...baseNote,
      id: "note-img",
      type: "image",
      src: "/asset.png",
      alt: "Alt text",
    };
    expect(mapInstantNoteToNote(row)).toEqual({
      id: "note-img",
      type: "image",
      x: 16,
      y: 24,
      width: 300,
      height: 220,
      src: "/asset.png",
      alt: "Alt text",
      caption: undefined,
    });
  });

  it("maps a link note", () => {
    const row = {
      ...baseNote,
      id: "note-link",
      type: "link",
      title: "Page title",
      url: "https://example.com",
      siteName: "example.com",
      description: "desc",
      previewImage: "/preview.png",
    };
    expect(mapInstantNoteToNote(row)).toEqual({
      id: "note-link",
      type: "link",
      x: 16,
      y: 24,
      width: 300,
      height: 220,
      url: "https://example.com",
      siteName: "example.com",
      title: "Page title",
      description: "desc",
      previewImage: "/preview.png",
    });
  });

  it("throws for unknown note types", () => {
    expect(() =>
      mapInstantNoteToNote({ ...baseNote, type: "video" } as never),
    ).toThrowError("Unsupported note type: video");
  });
});

describe("assembleBoardsFromQuery", () => {
  it("returns boards sorted by createdAt with their notes", () => {
    const data: QueryData = {
      boards: [
        {
          id: "board-2",
          title: "Archive",
          description: "Other",
          createdAt: 2000,
          owner: { id: "user-1" },
          members: [],
          notes: [],
        },
        {
          id: "board-1",
          title: "Ideas",
          description: "Board description",
          createdAt: 1000,
          owner: { id: "user-1" },
          members: [],
          notes: [baseNote],
        },
      ],
    };

    const boards = assembleBoardsFromQuery(data);
    expect(boards).toHaveLength(2);
    expect(boards[0].id).toBe("board-1");
    expect(boards[1].id).toBe("board-2");
    expect(boards[0].notes).toHaveLength(1);
    expect(boards[0].notes[0].type).toBe("text");
    expect(boards[0].ownerUserId).toBe("user-1");
  });

  it("returns empty array for empty query data", () => {
    expect(assembleBoardsFromQuery({})).toEqual([]);
    expect(assembleBoardsFromQuery({ boards: [] })).toEqual([]);
  });
});
