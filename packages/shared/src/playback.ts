import type { PlaybackState } from "./types";

export function createInitialPlayback(playlistId: string): PlaybackState {
  return {
    playlistId,
    songIndex: 0,
    positionMs: 0,
    isPlaying: false,
    startedAt: null,
    controllerUserId: null,
  };
}

export function computeCurrentPositionMs(state: PlaybackState, now = Date.now()): number {
  if (!state.isPlaying || state.startedAt === null) {
    return state.positionMs;
  }
  return state.positionMs + (now - state.startedAt);
}

export function advanceSongIndex(currentIndex: number, songCount: number, direction: "next" | "prev"): number {
  if (songCount <= 0) return 0;
  if (direction === "next") {
    return Math.min(currentIndex + 1, songCount - 1);
  }
  return Math.max(currentIndex - 1, 0);
}

export function clampSongIndex(index: number, songCount: number): number {
  if (songCount <= 0) return 0;
  return Math.max(0, Math.min(index, songCount - 1));
}
