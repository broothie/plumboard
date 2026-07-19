import { handleUnfurlRequest } from "cloudflare-workers-unfurl";
import { authenticate, provisionUser } from "./auth";
import {
  createUserBoard,
  getBoard,
  listUserBoards,
  removeBoard,
  renameBoard,
} from "./boards";
import { downloadAsset, uploadAsset } from "./assets";

export { TldrawDurableObject } from "./TldrawDurableObject";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function error(message: string, status: number) {
  return json({ error: message }, status);
}

async function bodyAsObject(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function decodePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function handleApi(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const user = await authenticate(request, env);
  await provisionUser(env.DB, user);

  if (request.method === "GET" && url.pathname === "/api/me") {
    return json({ user });
  }

  if (url.pathname === "/api/boards") {
    if (request.method === "GET") {
      return json({ boards: await listUserBoards(env.DB, user.id) });
    }

    if (request.method === "POST") {
      const body = await bodyAsObject(request);
      const title = typeof body.title === "string" ? body.title : "Untitled board";
      return json({ board: await createUserBoard(env.DB, user, title) }, 201);
    }

    return error("Method not allowed", 405);
  }

  const connectMatch = url.pathname.match(/^\/api\/boards\/([^/]+)\/connect$/);
  if (connectMatch && request.method === "GET") {
    const boardId = decodePathPart(connectMatch[1]);
    const board = await getBoard(env.DB, boardId, user.id);
    if (!board) return error("Board not found", 404);

    const id = env.TLDRAW_DURABLE_OBJECT.idFromName(boardId);
    return env.TLDRAW_DURABLE_OBJECT.get(id).fetch(request);
  }

  const uploadMatch = url.pathname.match(/^\/api\/boards\/([^/]+)\/uploads\/([^/]+)$/);
  if (uploadMatch) {
    const boardId = decodePathPart(uploadMatch[1]);
    const uploadId = decodePathPart(uploadMatch[2]);
    const board = await getBoard(env.DB, boardId, user.id);
    if (!board) return error("Board not found", 404);

    if (request.method === "POST") {
      if (board.role === "viewer") return error("Board is read-only", 403);
      return uploadAsset(request, env, boardId, uploadId);
    }
    if (request.method === "GET") {
      return downloadAsset(request, env, boardId, uploadId);
    }
    return error("Method not allowed", 405);
  }

  const unfurlMatch = url.pathname.match(/^\/api\/boards\/([^/]+)\/unfurl$/);
  if (unfurlMatch && request.method === "GET") {
    const boardId = decodePathPart(unfurlMatch[1]);
    const board = await getBoard(env.DB, boardId, user.id);
    if (!board) return error("Board not found", 404);

    return handleUnfurlRequest(request);
  }

  const boardMatch = url.pathname.match(/^\/api\/boards\/([^/]+)$/);
  if (boardMatch) {
    const boardId = decodePathPart(boardMatch[1]);
    const board = await getBoard(env.DB, boardId, user.id);
    if (!board) return error("Board not found", 404);

    if (request.method === "GET") return json({ board });

    if (request.method === "PATCH") {
      const body = await bodyAsObject(request);
      if (typeof body.title !== "string") return error("A title is required", 400);
      const updated = await renameBoard(env.DB, board, user.id, body.title);
      return updated ? json({ board: updated }) : error("Board cannot be renamed", 403);
    }

    if (request.method === "DELETE") {
      if (!await removeBoard(env.DB, board)) return error("Only the owner can delete a board", 403);
      const id = env.TLDRAW_DURABLE_OBJECT.idFromName(boardId);
      ctx.waitUntil(env.TLDRAW_DURABLE_OBJECT.get(id).fetch("https://durable-object.internal", {
        method: "DELETE",
      }));
      return json({ ok: true });
    }

    return error("Method not allowed", 405);
  }

  return error("Not found", 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await handleApi(request, env, ctx);
    } catch (caught) {
      if (caught instanceof Response) return caught;
      console.error(caught);
      return error("Unexpected server error", 500);
    }
  },
};
