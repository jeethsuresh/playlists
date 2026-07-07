import { and, eq } from "drizzle-orm";
import { playlistSongs } from "@playlists/db";
import { canEditPlaylist } from "@playlists/shared";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { requireMember } from "@/lib/playlist-access";
import { ensureDbReady, getDb } from "@/lib/db";
import { notifyPlaylistUpdate } from "@/lib/ws-broadcast";

type RouteParams = { params: Promise<{ id: string; songId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id: playlistId, songId } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(playlistId, userId);
  if (!role || !canEditPlaylist(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  await db
    .delete(playlistSongs)
    .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.id, songId)));

  await notifyPlaylistUpdate(playlistId, { kind: "song_removed", songId });
  return NextResponse.json({ ok: true });
}
