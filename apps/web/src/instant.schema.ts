// This file mirrors /instant.schema.ts (repo root) which the InstantDB CLI reads.
// Keep both in sync when updating the schema.
import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    profiles: i.entity({
      username: i.string().unique().indexed(),
    }),
    boards: i.entity({
      title: i.string(),
      description: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
    notes: i.entity({
      type: i.string(),
      x: i.number(),
      y: i.number(),
      width: i.number(),
      height: i.number(),
      title: i.string().optional(),
      body: i.string().optional(),
      src: i.string().optional(),
      alt: i.string().optional(),
      caption: i.string().optional(),
      url: i.string().optional(),
      siteName: i.string().optional(),
      description: i.string().optional(),
      previewImage: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
    boardMembers: i.entity({
      role: i.string(),
    }),
  },
  links: {
    profileUser: {
      forward: { on: "profiles", has: "one", label: "user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    boardOwner: {
      forward: { on: "boards", has: "one", label: "owner" },
      reverse: { on: "$users", has: "many", label: "ownedBoards" },
    },
    boardNotes: {
      forward: { on: "boards", has: "many", label: "notes" },
      reverse: { on: "notes", has: "one", label: "board" },
    },
    boardMemberships: {
      forward: { on: "boards", has: "many", label: "members" },
      reverse: { on: "boardMembers", has: "one", label: "board" },
    },
    memberUser: {
      forward: { on: "boardMembers", has: "one", label: "user" },
      reverse: { on: "$users", has: "many", label: "memberships" },
    },
  },
});

export type AppSchema = typeof schema;
export default schema;
