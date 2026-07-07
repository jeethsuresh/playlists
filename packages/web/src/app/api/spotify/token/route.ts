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

  if (!user?.spotifyRefreshToken) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Spotify not configured" }, { status: 500 });
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotifyRefreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.json({ error: "Failed to refresh Spotify token" }, { status: 502 });
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
  };

  if (tokens.refresh_token) {
    await db
      .update(users)
      .set({ spotifyRefreshToken: tokens.refresh_token })
      .where(eq(users.id, authResult.session!.user.id));
  }

  return NextResponse.json({ accessToken: tokens.access_token });
}
