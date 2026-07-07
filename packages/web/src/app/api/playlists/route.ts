import { and, asc, eq } from "drizzle-orm";
import { playlistMembers, playlists, playlistSongs } from "@playlists/db";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { ensureDbReady, getDb } from "@/lib/db";

export async function GET() {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const db = getDb();
  const userId = authResult.session!.user.id;

  const memberships = await db.query.playlistMembers.findMany({
    where: eq(playlistMembers.userId, userId),
    with: {
      playlist: {
        with: {
          songs: {
            orderBy: asc(playlistSongs.position),
          },
        },
      },
    },
  });

  const result = memberships.map((m) => ({
    id: m.playlist.id,
    name: m.playlist.name,
    syncPlayback: m.playlist.syncPlayback,
    shareToken: m.playlist.shareToken,
    role: m.role,
    songCount: m.playlist.songs.length,
    createdAt: m.playlist.createdAt,
  }));

  return NextResponse.json({ playlists: result });
}

export async function POST(request: Request) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim() || "Untitled Playlist";
  const userId = authResult.session!.user.id;
  const shareToken = randomBytes(16).toString("hex");

  const db = getDb();
  const [playlist] = await db
    .insert(playlists)
    .values({ name, ownerId: userId, shareToken })
    .returning();

  await db.insert(playlistMembers).values({
    playlistId: playlist.id,
    userId,
    role: "owner",
  });

  return NextResponse.json({ playlist: { ...playlist, role: "owner", songCount: 0 } });
}
