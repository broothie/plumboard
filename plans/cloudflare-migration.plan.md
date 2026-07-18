# Cloudflare + tldraw Rebuild Plan

## Goal

Rebuild Plumboard around tldraw and Cloudflare. Do not migrate the current
Supabase or InstantDB data model; start with a clean application database and
bring forward only product behavior we want to keep.

## Target

```text
React + tldraw client
  -> Cloudflare Worker
       -> D1: users, boards, memberships, board metadata
       -> Durable Object per board: tldraw WebSocket room + SQLite document
       -> R2: images and file assets
       -> Worker endpoints: auth callback, uploads, link previews
```

The Durable Object is the authoritative store for each board's tldraw document.
D1 is only for board discovery, ownership, and permissions. R2 stores binary
assets, not canvas documents.

## Phase 1: Fresh Local Board

- [ ] Remove the current Supabase and InstantDB client code, schemas, and
      environment configuration.
- [ ] Install `tldraw`, `@tldraw/sync`, and `@tldraw/sync-core`.
- [ ] Replace `@xyflow/react` board rendering with a local tldraw editor.
- [ ] Start with tldraw's built-in shapes and a single empty board.
- [ ] Add one minimal custom Plumboard note shape only if the built-in shapes
      cannot represent the interaction we need.

Success: a board opens locally, supports pan/zoom, note creation, editing,
resizing, and move operations without a backend.

## Phase 2: Deploy tldraw Sync To Cloudflare

- [ ] Start from tldraw's Cloudflare sync template.
- [ ] Add a Durable Object binding with one room per board id.
- [ ] Use `SQLiteSyncStorage` in each Durable Object.
- [ ] Add an R2 bucket and tldraw asset store for image uploads.
- [ ] Connect the web client with `useSync` to the Worker WebSocket endpoint.
- [ ] Deploy a preview Worker and verify two browser sessions collaborate.

Success: browser refreshes and Durable Object hibernation do not lose a board;
two sessions see edits and cursors in real time.

## Phase 3: Minimal Product Model

- [ ] Add D1 tables for `users`, `boards`, and `board_members`.
- [ ] Add Worker endpoints for create board, list boards, rename board, and
      delete board.
- [ ] On board creation, create metadata in D1 and lazily create the tldraw
      room when first opened.
- [ ] Use a simple temporary identity in local development; add real Google
      OAuth only after boards and sync are working.
- [ ] Check board membership before allowing a Worker WebSocket connection.

Success: users can create and open their own boards, and another user cannot
connect to a board they do not belong to.

## Phase 4: Restore Only Needed Features

- [ ] Implement Google sign-in and application sessions.
- [ ] Implement owner/editor/viewer board membership and invitations.
- [ ] Implement image upload to R2.
- [ ] Implement link previews in a Worker if link cards remain a requirement.
- [ ] Add custom tldraw shapes for any Plumboard-specific note UI that is still
      worth preserving.
- [ ] Add profile/avatar UI after identity is stable.

Success: the rebuilt app supports the small feature set we actively want,
without carrying Supabase/InstantDB compatibility code.

## Phase 5: Clean Up

- [ ] Remove legacy Supabase migrations, Edge Functions, scripts, and packages.
- [ ] Remove InstantDB packages, schemas, permissions, and environment values.
- [ ] Replace old board tests with tldraw and Worker/D1 integration tests.
- [ ] Add a single production deployment path using Wrangler.

## Deliberately Deferred

- Historical data migration
- Backups and version history
- Audit logs
- Multi-environment rollout strategy
- Fine-grained rate limits and monitoring
- Formal rollback procedure

We can add these once Plumboard has real users or valuable board data.

## First Implementation Slice

1. Add the tldraw local editor and remove React Flow from the board surface.
2. Clone the tldraw Cloudflare sync template into this repo.
3. Connect one hard-coded board id over a Durable Object WebSocket.
4. Add D1 board metadata and simple local identity.
5. Reintroduce app features only as needed.
