import { auth } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = `${publicAppUrl()}/api/spotify/callback`;
  if (!clientId) {
    return NextResponse.redirect(new URL("/settings?spotify=error", request.url));
  }

  const scopes = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state: session.user.id,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
