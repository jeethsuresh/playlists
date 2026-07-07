import { and, asc, eq } from "drizzle-orm";
import {
  playlistMembers,
  playlists,
  playlistSongs,
} from "@playlists/db";
import {
  canDeletePlaylist,
  canManageMembers,
} from "@playlists/shared";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { requireMember } from "@/lib/playlist-access";
import { ensureDbReady, getDb } from "@/lib/db";
import { notifyPlaylistUpdate } from "@/lib/ws-broadcast";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(id, userId);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const playlist = await db.query.playlists.findFirst({
    where: eq(playlists.id, id),
    with: {
      songs: { orderBy: asc(playlistSongs.position) },
      members: {
        with: { user: { columns: { id: true, email: true } } },
      },
    },
  });

  if (!playlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    playlist: {
      id: playlist.id,
      name: playlist.name,
      syncPlayback: playlist.syncPlayback,
      shareToken: playlist.shareToken,
      role,
      songs: playlist.songs,
      members: playlist.members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        role: m.role,
      })),
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(id, userId);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    syncPlayback?: boolean;
    memberRole?: { userId: string; role: "member" | "dj" };
  };

  const db = getDb();

  if (body.name !== undefined) {
    await db.update(playlists).set({ name: body.name.trim() }).where(eq(playlists.id, id));
    await notifyPlaylistUpdate(id, { kind: "renamed", name: body.name.trim() });
  }

  if (body.syncPlayback !== undefined) {
    if (!canManageMembers(role) && role !== "owner" && role !== "dj") {
      // owner only for sync toggle per spec - actually spec doesn't say who toggles. Allow owner and dj
    }
    if (role !== "owner" && role !== "dj") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db.update(playlists).set({ syncPlayback: body.syncPlayback }).where(eq(playlists.id, id));
    await notifyPlaylistUpdate(id, { kind: "sync_toggled", syncPlayback: body.syncPlayback });
  }

  if (body.memberRole) {
    if (!canManageMembers(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db
      .update(playlistMembers)
      .set({ role: body.memberRole.role })
      .where(
        and(
          eq(playlistMembers.playlistId, id),
          eq(playlistMembers.userId, body.memberRole.userId),
        ),
      );
    await notifyPlaylistUpdate(id, {
      kind: "member_role_changed",
      userId: body.memberRole.userId,
      role: body.memberRole.role,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const { id } = await params;
  const userId = authResult.session!.user.id;
  const role = await requireMember(id, userId);
  if (!role || !canDeletePlaylist(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  await db.delete(playlists).where(eq(playlists.id, id));
  return NextResponse.json({ ok: true });
}
