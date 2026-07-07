import { parseTrackUrl } from "@playlists/shared";

interface TrackMetadata {
  vendor: "spotify" | "youtube";
  externalId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
}

let spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  if (spotifyToken && spotifyToken.expiresAt > Date.now()) {
    return spotifyToken.token;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  spotifyToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
  return spotifyToken.token;
}

async function fetchSpotifyMetadata(externalId: string): Promise<TrackMetadata> {
  const token = await getSpotifyAccessToken();
  if (!token) {
    return {
      vendor: "spotify",
      externalId,
      title: "Spotify Track",
      artist: "Unknown",
      thumbnail: null,
    };
  }

  const response = await fetch(`https://api.spotify.com/v1/tracks/${externalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return {
      vendor: "spotify",
      externalId,
      title: "Spotify Track",
      artist: "Unknown",
      thumbnail: null,
    };
  }

  const data = (await response.json()) as {
    name: string;
    artists: Array<{ name: string }>;
    album: { images: Array<{ url: string }> };
  };

  return {
    vendor: "spotify",
    externalId,
    title: data.name,
    artist: data.artists.map((a) => a.name).join(", "),
    thumbnail: data.album.images[0]?.url ?? null,
  };
}

async function fetchYouTubeMetadata(externalId: string): Promise<TrackMetadata> {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${externalId}&format=json`,
  );

  if (!response.ok) {
    return {
      vendor: "youtube",
      externalId,
      title: "YouTube Video",
      artist: "Unknown",
      thumbnail: `https://img.youtube.com/vi/${externalId}/hqdefault.jpg`,
    };
  }

  const data = (await response.json()) as {
    title: string;
    author_name: string;
    thumbnail_url: string;
  };

  return {
    vendor: "youtube",
    externalId,
    title: data.title,
    artist: data.author_name,
    thumbnail: data.thumbnail_url,
  };
}

export async function fetchTrackMetadata(url: string): Promise<TrackMetadata | null> {
  const parsed = parseTrackUrl(url);
  if (!parsed) {
    return null;
  }

  if (parsed.vendor === "spotify") {
    return fetchSpotifyMetadata(parsed.externalId);
  }
  return fetchYouTubeMetadata(parsed.externalId);
}

export { parseTrackUrl };
