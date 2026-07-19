# Cloudflare + tldraw Rebuild Plan

## Goal

Rebuild Plumboard around tldraw and Cloudflare. Do not migrate the legacy data
model; start with a clean application database and bring forward only product
behavior we want to keep.

This is a ground-up rebuild. The existing React Flow canvas, legacy backend
integrations, persistence hooks, tests, migrations, and deployment configuration
are disposable. Delete and replace them freely rather than maintaining
compatibility or preserving implementation details.

## Target

```text
React + tldraw client
  -> Cloudflare Access: Google identity provider and access policy
  -> Cloudflare Worker: validates Access identity assertion
       -> D1: users, boards, memberships, board metadata
       -> Durable Object per board: tldraw WebSocket room + SQLite document
       -> R2: images and file assets
       -> Worker endpoints: uploads, link previews
```

The Durable Object is the authoritative store for each board's tldraw document.
D1 is only for board discovery, ownership, and permissions. R2 stores binary
assets, not canvas documents. Cloudflare Access owns authentication; D1 stores
the application profile associated with the verified Access identity.

## Current Build Status

The ground-up local rebuild is implemented. The React client, D1 metadata API,
tldraw Durable Object sync, R2 asset routes, link previews, and Cloudflare
Access JWT validation are in the repository. Local board CRUD, reload
persistence, and two-session realtime collaboration have been verified.

The D1 database, R2 buckets, Durable Object namespace, production Worker,
GitHub deployment credentials, and email-scoped Cloudflare Access policy are
provisioned. The Worker is configured to validate the Access application
audience before accepting authenticated requests.

## Phase 1: Fresh Local Board

- [x] Remove the legacy backend client code, schemas, and
      environment configuration.
- [x] Remove React Flow board code and legacy board persistence code instead of
      adapting it to tldraw.
- [x] Install `tldraw`, `@tldraw/sync`, and `@tldraw/sync-core`.
- [x] Replace `@xyflow/react` board rendering with a local tldraw editor.
- [x] Start with tldraw's built-in shapes and a single empty board.
- [x] Defer custom Plumboard shapes until the built-in shapes prove insufficient.

Success: a board opens locally, supports pan/zoom, note creation, editing,
resizing, and move operations without a backend.

## Phase 2: Deploy tldraw Sync To Cloudflare

- [x] Start from tldraw's Cloudflare sync template.
- [x] Add a Durable Object binding with one room per board id.
- [x] Use `SQLiteSyncStorage` in each Durable Object.
- [x] Add an R2 bucket and tldraw asset store for image uploads.
- [x] Connect the web client with `useSync` to the Worker WebSocket endpoint.
- [x] Verify two local browser sessions collaborate and persist after reload.
- [ ] Deploy a preview Worker and repeat the collaboration test on Cloudflare.

Success: browser refreshes and Durable Object hibernation do not lose a board;
two sessions see edits and cursors in real time.

## Phase 3: Minimal Product Model

- [x] Add D1 tables for `users`, `boards`, and `board_members`.
- [x] Add Worker endpoints for create board, list boards, rename board, and
      delete board.
- [x] On board creation, create metadata in D1 and lazily create the tldraw
      room when first opened.
- [x] Configure a Cloudflare Access application with Google as the initial
      identity provider and a permissive development policy.
- [x] Validate Cloudflare Access identity assertions in the Worker, then create
      or update the D1 application user on the first authenticated request.
- [x] Use a simple temporary identity only in local development, where Access
      is not available.
- [x] Check board membership before allowing a Worker WebSocket connection,
      using the verified Access identity.

Success: users can create and open their own boards, and another user cannot
connect to a board they do not belong to.

## Phase 4: Restore Only Needed Features

- [ ] Tighten Cloudflare Access policies from the development policy to the
      desired user-access rules.
- [ ] Implement owner/editor/viewer board membership and invitations.
- [x] Implement image upload to R2.
- [x] Implement link previews in a Worker if link cards remain a requirement.
- [ ] Add custom tldraw shapes for any Plumboard-specific note UI that is still
      worth preserving.
- [ ] Add profile/avatar UI after identity is stable.

Success: the rebuilt app supports the small feature set we actively want,
without carrying legacy backend compatibility code.

## Phase 5: Clean Up

- [x] Remove legacy database migrations, server functions, scripts, and packages.
- [x] Remove InstantDB packages, schemas, permissions, and environment values.
- [ ] Replace old board tests with tldraw and Worker/D1 integration tests.
- [x] Add a single production deployment path using Wrangler.

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
4. Protect the Worker with Cloudflare Access and add D1 board metadata.
5. Reintroduce app features only as needed.
