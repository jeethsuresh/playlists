import { and, asc, eq, sql } from "drizzle-orm";
import { playlistMembers, playlistSongs } from "@playlists/db";
import { canEditPlaylist } from "@playlists/shared";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { fetchTrackMetadata } from "@/lib/metadata";
import { requireMember } from "@/lib/playlist-access";
import { ensureDbReady, getDb } from "@/lib/db";
import { notifyPlaylistUpdate } from "@/lib/ws-broadcast";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id: playlistId } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(playlistId, userId);
  if (!role || !canEditPlaylist(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { url?: string };
  if (!body.url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  const metadata = await fetchTrackMetadata(body.url);
  if (!metadata) {
    return NextResponse.json({ error: "Unsupported URL" }, { status: 400 });
  }

  const db = getDb();
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`coalesce(max(${playlistSongs.position}), -1)` })
    .from(playlistSongs)
    .where(eq(playlistSongs.playlistId, playlistId));

  const position = (maxPos ?? -1) + 1;
  const [song] = await db
    .insert(playlistSongs)
    .values({
      playlistId,
      vendor: metadata.vendor,
      externalId: metadata.externalId,
      title: metadata.title,
      artist: metadata.artist,
      thumbnail: metadata.thumbnail,
      position,
    })
    .returning();

  await notifyPlaylistUpdate(playlistId, {
    kind: "song_added",
    song: {
      id: song.id,
      vendor: song.vendor,
      externalId: song.externalId,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      position: song.position,
    },
  });

  return NextResponse.json({ song });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id: playlistId } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(playlistId, userId);
  if (!role || !canEditPlaylist(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { songIds?: string[] };
  if (!body.songIds?.length) {
    return NextResponse.json({ error: "songIds required" }, { status: 400 });
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < body.songIds!.length; i++) {
      await tx
        .update(playlistSongs)
        .set({ position: i })
        .where(
          and(
            eq(playlistSongs.playlistId, playlistId),
            eq(playlistSongs.id, body.songIds![i]),
          ),
        );
    }
  });

  await notifyPlaylistUpdate(playlistId, { kind: "songs_reordered", songIds: body.songIds });
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id: playlistId } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(playlistId, userId);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const songs = await db.query.playlistSongs.findMany({
    where: eq(playlistSongs.playlistId, playlistId),
    orderBy: asc(playlistSongs.position),
  });

  return NextResponse.json({ songs });
}
