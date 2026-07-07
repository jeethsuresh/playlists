export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "approved" | "rejected";
export type MemberRole = "owner" | "member" | "dj";
export type Vendor = "spotify" | "youtube";

export interface PlaybackState {
  playlistId: string;
  songIndex: number;
  positionMs: number;
  isPlaying: boolean;
  startedAt: number | null;
  controllerUserId: string | null;
}

export type WsClientMessage =
  | { type: "join"; playlistId: string; token: string }
  | { type: "playback:play"; playlistId: string; songIndex?: number }
  | { type: "playback:pause"; playlistId: string }
  | { type: "playback:seek"; playlistId: string; positionMs: number }
  | { type: "playback:skip"; playlistId: string; direction: "next" | "prev" }
  | { type: "playback:ended"; playlistId: string }
  | { type: "ping" };

export type WsServerMessage =
  | { type: "joined"; playback: PlaybackState | null; songCount: number }
  | { type: "playback:state"; playback: PlaybackState }
  | { type: "playlist:updated"; event: PlaylistEvent }
  | { type: "error"; message: string }
  | { type: "pong" };

export type PlaylistEvent =
  | { kind: "renamed"; name: string }
  | { kind: "sync_toggled"; syncPlayback: boolean }
  | { kind: "song_added"; song: PlaylistSongPayload }
  | { kind: "song_removed"; songId: string }
  | { kind: "songs_reordered"; songIds: string[] }
  | { kind: "member_joined"; userId: string; email: string; role: MemberRole }
  | { kind: "member_role_changed"; userId: string; role: MemberRole };

export interface PlaylistSongPayload {
  id: string;
  vendor: Vendor;
  externalId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  position: number;
}
