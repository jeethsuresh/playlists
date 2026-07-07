import { eq } from "drizzle-orm";
import { users } from "@playlists/db";
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
  const user = await db.query.users.findFirst({
    where: eq(users.id, authResult.session!.user.id),
    columns: { spotifyRefreshToken: true },
  });

  return NextResponse.json({ connected: Boolean(user?.spotifyRefreshToken) });
}

export async function DELETE() {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const db = getDb();
  await db
    .update(users)
    .set({ spotifyRefreshToken: null })
    .where(eq(users.id, authResult.session!.user.id));

  return NextResponse.json({ ok: true });
}
