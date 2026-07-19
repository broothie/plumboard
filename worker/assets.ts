function objectKey(boardId: string, uploadId: string) {
  const safeBoardId = boardId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_.-]+/g, "_");
  return `boards/${safeBoardId}/uploads/${safeUploadId}`;
}

export async function uploadAsset(request: Request, env: Env, boardId: string, uploadId: string) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return new Response("Invalid content type", { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 25 * 1024 * 1024) {
    return new Response("Asset is larger than 25 MB", { status: 413 });
  }

  const key = objectKey(boardId, uploadId);
  if (await env.TLDRAW_BUCKET.head(key)) {
    return new Response("Upload already exists", { status: 409 });
  }

  await env.TLDRAW_BUCKET.put(key, request.body, {
    httpMetadata: { contentType },
  });

  return Response.json({ ok: true });
}

export async function downloadAsset(request: Request, env: Env, boardId: string, uploadId: string) {
  const object = await env.TLDRAW_BUCKET.get(objectKey(boardId, uploadId), {
    range: request.headers,
    onlyIf: request.headers,
  });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=86400, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("content-security-policy", "default-src 'none'");
  headers.set("x-content-type-options", "nosniff");

  const body = "body" in object ? object.body : null;
  return new Response(body, { headers, status: body ? 200 : 304 });
}
