import { eq } from "drizzle-orm";
import { playlistMembers, playlists } from "@playlists/db";
import { auth } from "@/lib/auth";
import { ensureDbReady, getDb } from "@/lib/db";
import { notifyPlaylistUpdate } from "@/lib/ws-broadcast";
import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  await ensureDbReady();
  const db = getDb();
  const playlist = await db.query.playlists.findFirst({
    where: eq(playlists.shareToken, token),
  });
  if (!playlist) {
    redirect("/");
  }

  const existing = await db.query.playlistMembers.findFirst({
    where: (fields, { and, eq: eqFn }) =>
      and(eqFn(fields.playlistId, playlist.id), eqFn(fields.userId, session.user.id)),
  });

  if (!existing) {
    await db.insert(playlistMembers).values({
      playlistId: playlist.id,
      userId: session.user.id,
      role: "member",
    });
    await notifyPlaylistUpdate(playlist.id, {
      kind: "member_joined",
      userId: session.user.id,
      email: session.user.email ?? "",
      role: "member",
    });
  }

  redirect(`/playlists/${playlist.id}`);
}
