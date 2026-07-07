"use client";

import { useEffect, useRef } from "react";
import { usePlayback } from "@/contexts/playback-context";

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YtPlayer }) => void;
            onStateChange?: (event: { data: number; target: YtPlayer }) => void;
          };
        },
      ) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

export function MediaEngine() {
  const {
    songs,
    songIndex,
    positionMs,
    isPlaying,
    trackEnded,
    updateLocalPosition,
    seek,
  } = usePlayback();
  const song = songs[songIndex];
  const ytPlayerRef = useRef<YtPlayer | null>(null);
  const spotifyPlayerRef = useRef<SpotifyPlayer | null>(null);
  const spotifyDeviceIdRef = useRef<string | null>(null);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!song || song.vendor !== "youtube") return;
    let cancelled = false;

    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = new window.YT.Player("youtube-player", {
        videoId: song.externalId,
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: (event) => {
            if (isPlaying) event.target.playVideo();
            if (positionMs > 0) event.target.seekTo(positionMs / 1000, true);
          },
          onStateChange: (event) => {
            if (event.data === window.YT!.PlayerState.ENDED) {
              trackEnded();
            }
          },
        },
      });
      lastSongIdRef.current = song.id;
    });

    return () => {
      cancelled = true;
    };
  }, [song?.id, song?.externalId, song?.vendor]);

  useEffect(() => {
    if (!song || song.vendor !== "youtube" || !ytPlayerRef.current) return;
    if (isPlaying) ytPlayerRef.current.playVideo();
    else ytPlayerRef.current.pauseVideo();
  }, [isPlaying, song?.vendor]);

  useEffect(() => {
    if (!song || song.vendor !== "youtube" || !ytPlayerRef.current) return;
    ytPlayerRef.current.seekTo(positionMs / 1000, true);
  }, [positionMs, song?.id]);

  useEffect(() => {
    if (!song || song.vendor !== "spotify") return;

    let cancelled = false;
    const scriptId = "spotify-sdk";

    async function initSpotify() {
      if (!document.getElementById(scriptId)) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://sdk.scdn.co/spotify-player.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Spotify SDK failed"));
          document.body.appendChild(script);
          window.onSpotifyWebPlaybackSDKReady = () => resolve();
        });
      }

      const tokenRes = await fetch("/api/spotify/token");
      if (!tokenRes.ok || cancelled) return;
      const { accessToken } = (await tokenRes.json()) as { accessToken: string };

      spotifyPlayerRef.current?.disconnect();
      const player = new window.Spotify!.Player({
        name: "Playlist Mashup",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.8,
      });
      spotifyPlayerRef.current = player;

      player.addListener("ready", (raw) => {
        const { device_id } = raw as { device_id: string };
        spotifyDeviceIdRef.current = device_id;
        void fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ device_ids: [device_id], play: false }),
        });
        void playSpotifyTrack(accessToken, device_id, song!.externalId, positionMs, isPlaying);
      });

      player.addListener("player_state_changed", (raw) => {
        const state = raw as SpotifyPlayerState | null;
        if (!state) return;
        updateLocalPosition(state.position);
        if (state.paused === false && state.track_window.current_track === null) {
          trackEnded();
        }
      });

      player.addListener("initialization_error", (raw) =>
        console.error((raw as { message: string }).message),
      );
      await player.connect();
    }

    void initSpotify();
    lastSongIdRef.current = song.id;

    return () => {
      cancelled = true;
    };
  }, [song?.id, song?.externalId, song?.vendor]);

  useEffect(() => {
    if (!song || song.vendor !== "spotify" || !spotifyDeviceIdRef.current) return;
    void fetch("/api/spotify/token")
      .then((r) => r.json())
      .then(({ accessToken }: { accessToken: string }) =>
        playSpotifyTrack(
          accessToken,
          spotifyDeviceIdRef.current!,
          song.externalId,
          positionMs,
          isPlaying,
        ),
      );
  }, [isPlaying, positionMs, song?.externalId, song?.vendor]);

  return (
    <>
      <div id="youtube-player" className="hidden" />
      <div id="spotify-player" className="hidden" />
    </>
  );
}

async function playSpotifyTrack(
  accessToken: string,
  deviceId: string,
  trackId: string,
  positionMs: number,
  shouldPlay: boolean,
) {
  await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [`spotify:track:${trackId}`],
        position_ms: positionMs,
      }),
    },
  );
  if (!shouldPlay) {
    await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (payload: unknown) => void) => void;
}

interface SpotifyPlayerState {
  position: number;
  paused: boolean;
  track_window: { current_track: unknown | null };
}
