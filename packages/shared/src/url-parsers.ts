import type { Vendor } from "./types";

export interface ParsedTrackUrl {
  vendor: Vendor;
  externalId: string;
}

const SPOTIFY_PATTERNS = [
  /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
  /spotify:track:([a-zA-Z0-9]+)/,
];

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

export function parseTrackUrl(input: string): ParsedTrackUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const pattern of SPOTIFY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { vendor: "spotify", externalId: match[1] };
    }
  }

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { vendor: "youtube", externalId: match[1] };
    }
  }

  return null;
}
