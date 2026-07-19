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

1. The `plumboard` D1 database and `plumboard-assets` R2 buckets are already
   provisioned and bound in `wrangler.toml`.
2. The production Worker URL is protected by the `plumboard - Production`
   Cloudflare Access policy and limited to the configured account email.
3. The Access team domain and application audience are configured in
   `wrangler.toml` so the Worker validates every application token.
4. Run `pnpm run deploy` to apply migrations and deploy manually.

Pushes to `main` also deploy through `.github/workflows/deploy.yml`. The
workflow requires the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
repository secrets.

The Worker validates the `Cf-Access-Jwt-Assertion` header on every API and
WebSocket request outside localhost. Update the production Access policy in the
Cloudflare dashboard when another user should be allowed into the application.
