import type { PlaylistEvent } from "@playlists/shared";

export function wsUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (publicUrl) {
    return publicUrl;
  }
  const port = process.env.NEXT_PUBLIC_WS_PORT ?? "3457";
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:${port}`;
  }
  return `ws://localhost:${port}`;
}

export async function notifyPlaylistUpdate(
  playlistId: string,
  event: PlaylistEvent,
): Promise<void> {
  const internalUrl = process.env.WS_INTERNAL_URL ?? "http://ws:3457";
  try {
    await fetch(`${internalUrl}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, event }),
    });
  } catch {
    // WS server may be unavailable during tests
  }
}
