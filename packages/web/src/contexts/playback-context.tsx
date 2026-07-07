"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PlaybackState, PlaylistEvent, Vendor, WsServerMessage } from "@playlists/shared";
import { canControlPlayback, type MemberRole } from "@playlists/shared";
import { wsUrl } from "@/lib/ws-broadcast";

export interface NowPlayingSong {
  id: string;
  vendor: Vendor;
  externalId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
}

interface PlaybackContextValue {
  playlistId: string | null;
  playlistName: string | null;
  songs: NowPlayingSong[];
  songIndex: number;
  positionMs: number;
  isPlaying: boolean;
  syncPlayback: boolean;
  memberRole: MemberRole | null;
  canControl: boolean;
  setPlaylist: (
    playlistId: string,
    name: string,
    songs: NowPlayingSong[],
    syncPlayback: boolean,
    role: MemberRole,
  ) => void;
  play: (index?: number) => void;
  pause: () => void;
  skip: (direction: "next" | "prev") => void;
  seek: (positionMs: number) => void;
  trackEnded: () => void;
  updateLocalPosition: (positionMs: number) => void;
  applyPlaylistEvent: (event: PlaylistEvent) => void;
  clearIfPlaylist: (playlistId: string) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState<string | null>(null);
  const [songs, setSongs] = useState<NowPlayingSong[]>([]);
  const [songIndex, setSongIndex] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncPlayback, setSyncPlayback] = useState(false);
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const syncPlaybackRef = useRef(false);
  const playlistIdRef = useRef<string | null>(null);

  const canControl = memberRole ? canControlPlayback(memberRole) : true;

  const sendWs = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connectWs = useCallback(async (targetPlaylistId: string) => {
    wsRef.current?.close();
    const tokenRes = await fetch("/api/ws-token");
    if (!tokenRes.ok) return;
    const { token } = (await tokenRes.json()) as { token: string };
    const ws = new WebSocket(`${wsUrl()}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", playlistId: targetPlaylistId, token }));
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as WsServerMessage;
      if (message.type === "playback:state") {
        applyRemoteState(message.playback);
      } else if (message.type === "joined" && message.playback) {
        applyRemoteState(message.playback);
      } else if (message.type === "playlist:updated") {
        // handled by playlist detail component via callback registration
      }
    };
  }, []);

  function applyRemoteState(state: PlaybackState) {
    setSongIndex(state.songIndex);
    setPositionMs(state.positionMs);
    setIsPlaying(state.isPlaying);
  }

  useEffect(() => {
    syncPlaybackRef.current = syncPlayback;
    playlistIdRef.current = playlistId;
    if (syncPlayback && playlistId) {
      void connectWs(playlistId);
    } else {
      wsRef.current?.close();
    }
    return () => wsRef.current?.close();
  }, [syncPlayback, playlistId, connectWs]);

  const setPlaylist = useCallback(
    (
      id: string,
      name: string,
      nextSongs: NowPlayingSong[],
      sync: boolean,
      role: MemberRole,
    ) => {
      setPlaylistId(id);
      setPlaylistName(name);
      setSongs(nextSongs);
      setSyncPlayback(sync);
      setMemberRole(role);
      if (playlistId !== id) {
        setSongIndex(0);
        setPositionMs(0);
        setIsPlaying(false);
      }
    },
    [playlistId],
  );

  const play = useCallback(
    (index?: number) => {
      if (syncPlayback && playlistId) {
        sendWs({ type: "playback:play", playlistId, songIndex: index });
        return;
      }
      if (index !== undefined) {
        setSongIndex(index);
        setPositionMs(0);
      }
      setIsPlaying(true);
    },
    [syncPlayback, playlistId, sendWs],
  );

  const pause = useCallback(() => {
    if (syncPlayback && playlistId) {
      sendWs({ type: "playback:pause", playlistId });
      return;
    }
    setIsPlaying(false);
  }, [syncPlayback, playlistId, sendWs]);

  const skip = useCallback(
    (direction: "next" | "prev") => {
      if (syncPlayback && playlistId) {
        sendWs({ type: "playback:skip", playlistId, direction });
        return;
      }
      setSongIndex((current) => {
        const next =
          direction === "next"
            ? Math.min(current + 1, Math.max(songs.length - 1, 0))
            : Math.max(current - 1, 0);
        setPositionMs(0);
        return next;
      });
    },
    [syncPlayback, playlistId, sendWs, songs.length],
  );

  const seek = useCallback(
    (ms: number) => {
      if (syncPlayback && playlistId) {
        sendWs({ type: "playback:seek", playlistId, positionMs: ms });
        return;
      }
      setPositionMs(ms);
    },
    [syncPlayback, playlistId, sendWs],
  );

  const trackEnded = useCallback(() => {
    if (syncPlayback && playlistId) {
      sendWs({ type: "playback:ended", playlistId });
      return;
    }
    if (songIndex < songs.length - 1) {
      setSongIndex((i) => i + 1);
      setPositionMs(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [syncPlayback, playlistId, sendWs, songIndex, songs.length]);

  const applyPlaylistEvent = useCallback((event: PlaylistEvent) => {
    if (event.kind === "song_added") {
      setSongs((prev) => [...prev, event.song]);
    } else if (event.kind === "song_removed") {
      setSongs((prev) => prev.filter((s) => s.id !== event.songId));
    } else if (event.kind === "songs_reordered") {
      setSongs((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        return event.songIds.map((id) => map.get(id)).filter(Boolean) as NowPlayingSong[];
      });
    } else if (event.kind === "sync_toggled") {
      setSyncPlayback(event.syncPlayback);
    } else if (event.kind === "renamed") {
      setPlaylistName(event.name);
    }
  }, []);

  const clearIfPlaylist = useCallback((id: string) => {
    if (playlistId === id) {
      setPlaylistId(null);
      setPlaylistName(null);
      setSongs([]);
      setIsPlaying(false);
    }
  }, [playlistId]);

  const updateLocalPosition = useCallback((ms: number) => {
    if (!syncPlaybackRef.current) {
      setPositionMs(ms);
    }
  }, []);

  const value = useMemo(
    () => ({
      playlistId,
      playlistName,
      songs,
      songIndex,
      positionMs,
      isPlaying,
      syncPlayback,
      memberRole,
      canControl: syncPlayback ? canControl : true,
      setPlaylist,
      play,
      pause,
      skip,
      seek,
      trackEnded,
      updateLocalPosition,
      applyPlaylistEvent,
      clearIfPlaylist,
    }),
    [
      playlistId,
      playlistName,
      songs,
      songIndex,
      positionMs,
      isPlaying,
      syncPlayback,
      memberRole,
      canControl,
      setPlaylist,
      play,
      pause,
      skip,
      seek,
      trackEnded,
      updateLocalPosition,
      applyPlaylistEvent,
      clearIfPlaylist,
    ],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used within PlaybackProvider");
  }
  return ctx;
}
