export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type BoardSummary = {
  id: string;
  title: string;
  ownerId: string;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
};

type ApiError = {
  error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError;
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getCurrentUser() {
  return request<{ user: CurrentUser }>("/api/me");
}

export function listBoards() {
  return request<{ boards: BoardSummary[] }>("/api/boards");
}

export function createBoard(title?: string) {
  return request<{ board: BoardSummary }>("/api/boards", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function updateBoard(boardId: string, title: string) {
  return request<{ board: BoardSummary }>(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteBoard(boardId: string) {
  await request<{ ok: true }>(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: "DELETE",
  });
}
