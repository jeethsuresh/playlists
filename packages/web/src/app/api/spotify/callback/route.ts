import { eq } from "drizzle-orm";
import { users } from "@playlists/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureDbReady, getDb } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?spotify=error", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || state !== session.user.id) {
    return NextResponse.redirect(new URL("/settings?spotify=error", request.url));
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/settings?spotify=error", request.url));
  }

  const tokens = (await tokenResponse.json()) as { refresh_token?: string };
  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL("/settings?spotify=error", request.url));
  }

  await ensureDbReady();
  const db = getDb();
  await db
    .update(users)
    .set({ spotifyRefreshToken: tokens.refresh_token })
    .where(eq(users.id, session.user.id));

  return NextResponse.redirect(new URL("/settings?spotify=connected", request.url));
}
