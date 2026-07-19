# Plumboard

A collaborative visual board built with tldraw and Cloudflare.

## Architecture

- Cloudflare Access authenticates users in deployed environments.
- D1 stores users, boards, and board memberships.
- A Durable Object per board runs tldraw sync and persists its document in SQLite.
- R2 stores uploaded images and videos.
- Local development uses a fixed localhost-only identity.

## Local development

```sh
corepack enable
pnpm install
pnpm run dev
```

The development command applies local D1 migrations before starting Vite and
the Worker runtime. Open `http://localhost:5173`.

## Cloudflare setup

1. Create a D1 database named `plumboard` and an R2 bucket named
   `plumboard-assets`.
2. Replace the placeholder IDs in `wrangler.toml`.
3. Configure a Cloudflare Access self-hosted application for the deployed
   hostname, using Google as an identity provider.
4. Set `ACCESS_TEAM_DOMAIN` to the full Access team URL and `ACCESS_AUD` to the
   application's audience tag.
5. Run `pnpm run deploy`.

The Worker validates the `Cf-Access-Jwt-Assertion` header on every API and
WebSocket request outside localhost.
