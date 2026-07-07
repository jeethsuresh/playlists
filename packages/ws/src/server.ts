import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { createDb, migrate, playlistMembers, playlistSongs } from "@playlists/db";
import {
  advanceSongIndex,
  canControlPlayback,
  clampSongIndex,
  computeCurrentPositionMs,
  createInitialPlayback,
  type MemberRole,
  type PlaybackState,
  type PlaylistEvent,
  type WsClientMessage,
  type WsServerMessage,
} from "@playlists/shared";

const port = Number(process.env.WS_PORT ?? 3457);
const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.NEXTAUTH_SECRET;

if (!databaseUrl || !authSecret) {
  throw new Error("DATABASE_URL and NEXTAUTH_SECRET are required");
}

const { db } = createDb(databaseUrl);
await migrate(db);

interface ClientContext {
  ws: WebSocket;
  userId: string;
  playlistId: string | null;
  memberRole: MemberRole | null;
}

const clients = new Set<ClientContext>();
const playbackByPlaylist = new Map<string, PlaybackState>();
const songCountByPlaylist = new Map<string, number>();

async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(authSecret);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const userId = payload.id as string | undefined;
    if (!userId) {
      return null;
    }
    return { userId };
  } catch {
    return null;
  }
}

async function getMemberRole(playlistId: string, userId: string): Promise<MemberRole | null> {
  const member = await db.query.playlistMembers.findFirst({
    where: (fields, { and, eq: eqFn }) =>
      and(eqFn(fields.playlistId, playlistId), eqFn(fields.userId, userId)),
  });
  return member?.role ?? null;
}

async function refreshSongCount(playlistId: string): Promise<number> {
  const songs = await db.query.playlistSongs.findMany({
    where: eq(playlistSongs.playlistId, playlistId),
    columns: { id: true },
  });
  songCountByPlaylist.set(playlistId, songs.length);
  return songs.length;
}

function send(ws: WebSocket, message: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(playlistId: string, message: WsServerMessage): void {
  for (const client of clients) {
    if (client.playlistId === playlistId) {
      send(client.ws, message);
    }
  }
}

function getPlayback(playlistId: string): PlaybackState {
  let state = playbackByPlaylist.get(playlistId);
  if (!state) {
    state = createInitialPlayback(playlistId);
    playbackByPlaylist.set(playlistId, state);
  }
  return state;
}

function setPlayback(state: PlaybackState): void {
  playbackByPlaylist.set(state.playlistId, state);
  broadcast(state.playlistId, { type: "playback:state", playback: state });
}

function snapshotPlayback(state: PlaybackState): PlaybackState {
  const positionMs = computeCurrentPositionMs(state);
  return {
    ...state,
    positionMs,
    isPlaying: state.isPlaying,
    startedAt: state.isPlaying ? Date.now() : null,
  };
}

function handlePlaybackControl(
  ctx: ClientContext,
  message: Extract<
    WsClientMessage,
    | { type: "playback:play" }
    | { type: "playback:pause" }
    | { type: "playback:seek" }
    | { type: "playback:skip" }
    | { type: "playback:ended" }
  >,
): void {
  if (!ctx.playlistId || !ctx.memberRole || !canControlPlayback(ctx.memberRole)) {
    send(ctx.ws, { type: "error", message: "Playback control forbidden" });
    return;
  }

  const playlistId = ctx.playlistId;
  const state = getPlayback(playlistId);
  const songCount = songCountByPlaylist.get(playlistId) ?? 0;

  switch (message.type) {
    case "playback:play": {
      const index =
        message.songIndex !== undefined
          ? clampSongIndex(message.songIndex, songCount)
          : state.songIndex;
      setPlayback({
        ...state,
        songIndex: index,
        positionMs: index !== state.songIndex ? 0 : computeCurrentPositionMs(state),
        isPlaying: true,
        startedAt: Date.now(),
        controllerUserId: ctx.userId,
      });
      break;
    }
    case "playback:pause": {
      setPlayback({
        ...state,
        positionMs: computeCurrentPositionMs(state),
        isPlaying: false,
        startedAt: null,
        controllerUserId: ctx.userId,
      });
      break;
    }
    case "playback:seek": {
      setPlayback({
        ...state,
        positionMs: message.positionMs,
        isPlaying: state.isPlaying,
        startedAt: state.isPlaying ? Date.now() : null,
        controllerUserId: ctx.userId,
      });
      break;
    }
    case "playback:skip": {
      const nextIndex = advanceSongIndex(state.songIndex, songCount, message.direction);
      setPlayback({
        ...state,
        songIndex: nextIndex,
        positionMs: 0,
        isPlaying: state.isPlaying,
        startedAt: state.isPlaying ? Date.now() : null,
        controllerUserId: ctx.userId,
      });
      break;
    }
    case "playback:ended": {
      const nextIndex = advanceSongIndex(state.songIndex, songCount, "next");
      setPlayback({
        ...state,
        songIndex: nextIndex,
        positionMs: 0,
        isPlaying: nextIndex !== state.songIndex ? state.isPlaying : false,
        startedAt: nextIndex !== state.songIndex && state.isPlaying ? Date.now() : null,
        controllerUserId: ctx.userId,
      });
      break;
    }
    default: {
      const _exhaustive: never = message;
      return _exhaustive;
    }
  }
}

async function handleJoin(ctx: ClientContext, playlistId: string): Promise<void> {
  const role = await getMemberRole(playlistId, ctx.userId);
  if (!role) {
    send(ctx.ws, { type: "error", message: "Not a playlist member" });
    return;
  }

  ctx.playlistId = playlistId;
  ctx.memberRole = role;
  const songCount = await refreshSongCount(playlistId);
  const playback = getPlayback(playlistId);
  send(ctx.ws, {
    type: "joined",
    playback: snapshotPlayback(playback),
    songCount,
  });
}

function handleMessage(ctx: ClientContext, raw: string): void {
  let message: WsClientMessage;
  try {
    message = JSON.parse(raw) as WsClientMessage;
  } catch {
    send(ctx.ws, { type: "error", message: "Invalid message" });
    return;
  }

  switch (message.type) {
    case "join":
      void handleJoin(ctx, message.playlistId);
      break;
    case "playback:play":
    case "playback:pause":
    case "playback:seek":
    case "playback:skip":
    case "playback:ended":
      handlePlaybackControl(ctx, message);
      break;
    case "ping":
      send(ctx.ws, { type: "pong" });
      break;
    default: {
      const _exhaustive: never = message;
      return _exhaustive;
    }
  }
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/broadcast") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }
    try {
      const { playlistId, event } = JSON.parse(body) as {
        playlistId: string;
        event: PlaylistEvent;
      };
      broadcast(playlistId, { type: "playlist:updated", event });
      if (event.kind === "song_added" || event.kind === "song_removed") {
        void refreshSongCount(playlistId);
      }
      res.writeHead(200).end("ok");
    } catch {
      res.writeHead(400).end("bad request");
    }
    return;
  }
  res.writeHead(404).end("not found");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(4401, "Unauthorized");
    return;
  }

  void verifyToken(token).then((authResult) => {
    if (!authResult) {
      ws.close(4401, "Unauthorized");
      return;
    }

    const ctx: ClientContext = {
      ws,
      userId: authResult.userId,
      playlistId: null,
      memberRole: null,
    };
    clients.add(ctx);

    ws.on("message", (data) => {
      handleMessage(ctx, data.toString());
    });

    ws.on("close", () => {
      clients.delete(ctx);
    });
  });
});

httpServer.listen(port, () => {
  console.log(`WebSocket server listening on :${port}`);
});
