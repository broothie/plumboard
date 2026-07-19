import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

type AccessPayload = JWTPayload & {
  email?: string;
  name?: string;
  picture?: string;
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "Plumboard user";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function authenticate(request: Request, env: Env): Promise<AuthenticatedUser> {
  if (isLocalRequest(request)) {
    return {
      id: "local-development-user",
      email: "dev@plumboard.local",
      name: "Local Developer",
      avatarUrl: null,
    };
  }

  const teamDomain = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
  if (!teamDomain || !env.ACCESS_AUD) {
    throw new Response("Cloudflare Access is not configured", { status: 503 });
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    throw new Response("Missing Cloudflare Access identity", { status: 401 });
  }

  let keySet = keySets.get(teamDomain);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    keySets.set(teamDomain, keySet);
  }

  const { payload } = await jwtVerify(token, keySet, {
    issuer: teamDomain,
    audience: env.ACCESS_AUD,
  });
  const accessPayload = payload as AccessPayload;
  const email = accessPayload.email?.trim().toLowerCase();

  if (!accessPayload.sub || !email) {
    throw new Response("Cloudflare Access identity is incomplete", { status: 403 });
  }

  return {
    id: accessPayload.sub,
    email,
    name: accessPayload.name?.trim() || nameFromEmail(email),
    avatarUrl: accessPayload.picture?.trim() || null,
  };
}

export async function provisionUser(db: D1Database, user: AuthenticatedUser) {
  await db.prepare(`
    INSERT INTO users (id, email, name, avatar_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      updated_at = CURRENT_TIMESTAMP
  `).bind(user.id, user.email, user.name, user.avatarUrl).run();
}
