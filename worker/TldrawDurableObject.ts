import {
  DurableObjectSqliteSyncWrapper,
  type SessionStateSnapshot,
  SQLiteSyncStorage,
  TLSocketRoom,
} from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, type TLRecord } from "@tldraw/tlschema";
import { DurableObject } from "cloudflare:workers";

const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas },
});

type SocketAttachment = {
  sessionId: string;
  snapshot: SessionStateSnapshot | null;
};

export class TldrawDurableObject extends DurableObject<Env> {
  private room: TLSocketRoom<TLRecord, void> | null = null;
  private readonly sessionIdToSocket = new Map<string, WebSocket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
    );
  }

  private getOrCreateRoom() {
    if (this.room) return this.room;

    const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage);
    const storage = new SQLiteSyncStorage<TLRecord>({ sql });
    this.room = new TLSocketRoom<TLRecord, void>({
      schema,
      storage,
      clientTimeout: Infinity,
      onSessionSnapshot: (sessionId, snapshot) => {
        const socket = this.sessionIdToSocket.get(sessionId);
        if (socket) socket.serializeAttachment({ sessionId, snapshot });
      },
    });

    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SocketAttachment | null;
      if (!attachment?.sessionId || !attachment.snapshot) continue;
      this.sessionIdToSocket.set(attachment.sessionId, socket);
      this.room.handleSocketResume({
        sessionId: attachment.sessionId,
        socket,
        snapshot: attachment.snapshot,
      });
    }

    return this.room;
  }

  async fetch(request: Request) {
    if (request.method === "DELETE") {
      for (const socket of this.ctx.getWebSockets()) socket.close(1001, "Board deleted");
      this.room = null;
      await this.ctx.storage.deleteAll();
      return Response.json({ ok: true });
    }

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return new Response("Missing sessionId", { status: 400 });
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();
    this.ctx.acceptWebSocket(serverSocket);
    serverSocket.serializeAttachment({ sessionId, snapshot: null } satisfies SocketAttachment);
    this.sessionIdToSocket.set(sessionId, serverSocket);
    this.getOrCreateRoom().handleSocketConnect({ sessionId, socket: serverSocket });

    return new Response(null, { status: 101, webSocket: clientSocket });
  }

  override webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const sessionId = this.getSessionId(socket);
    if (!sessionId) return;
    this.sessionIdToSocket.set(sessionId, socket);
    this.getOrCreateRoom().handleSocketMessage(sessionId, message);
  }

  override webSocketClose(socket: WebSocket) {
    this.handleSocketEnd(socket, "handleSocketClose");
  }

  override webSocketError(socket: WebSocket) {
    this.handleSocketEnd(socket, "handleSocketError");
  }

  private getSessionId(socket: WebSocket) {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    return attachment?.sessionId ?? null;
  }

  private handleSocketEnd(
    socket: WebSocket,
    method: "handleSocketClose" | "handleSocketError",
  ) {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    if (!attachment?.sessionId) return;

    this.sessionIdToSocket.delete(attachment.sessionId);
    const room = this.getOrCreateRoom();
    if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
      room.handleSocketResume({
        sessionId: attachment.sessionId,
        socket,
        snapshot: attachment.snapshot,
      });
    }
    room[method](attachment.sessionId);
  }
}
