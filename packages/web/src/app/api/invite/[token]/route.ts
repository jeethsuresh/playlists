import { eq } from "drizzle-orm";
import { playlistMembers, playlists, users } from "@playlists/db";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { ensureDbReady, getDb } from "@/lib/db";
import { notifyPlaylistUpdate } from "@/lib/ws-broadcast";

type RouteParams = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { token } = await params;
  const userId = authResult.session!.user.id;
  const db = getDb();

  const playlist = await db.query.playlists.findFirst({
    where: eq(playlists.shareToken, token),
  });
  if (!playlist) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  const existing = await db.query.playlistMembers.findFirst({
    where: (fields, { and, eq: eqFn }) =>
      and(eqFn(fields.playlistId, playlist.id), eqFn(fields.userId, userId)),
  });

  if (!existing) {
    await db.insert(playlistMembers).values({
      playlistId: playlist.id,
      userId,
      role: "member",
    });

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
    });

    await notifyPlaylistUpdate(playlist.id, {
      kind: "member_joined",
      userId,
      email: user?.email ?? "",
      role: "member",
    });
  }

  return NextResponse.json({ playlistId: playlist.id });
}
