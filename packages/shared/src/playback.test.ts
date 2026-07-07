import { describe, expect, it } from "vitest";
import {
  advanceSongIndex,
  clampSongIndex,
  computeCurrentPositionMs,
  createInitialPlayback,
} from "./playback";

describe("playback", () => {
  it("creates initial playback state", () => {
    const state = createInitialPlayback("pl-1");
    expect(state).toEqual({
      playlistId: "pl-1",
      songIndex: 0,
      positionMs: 0,
      isPlaying: false,
      startedAt: null,
      controllerUserId: null,
    });
  });

  it("computes position while playing", () => {
    const state = {
      playlistId: "pl-1",
      songIndex: 0,
      positionMs: 1000,
      isPlaying: true,
      startedAt: 5000,
      controllerUserId: "u1",
    };
    expect(computeCurrentPositionMs(state, 8000)).toBe(4000);
  });

  it("returns stored position when paused", () => {
    const state = createInitialPlayback("pl-1");
    state.positionMs = 2500;
    expect(computeCurrentPositionMs(state, 99999)).toBe(2500);
  });

  it("advances and clamps song index", () => {
    expect(advanceSongIndex(0, 3, "next")).toBe(1);
    expect(advanceSongIndex(2, 3, "next")).toBe(2);
    expect(advanceSongIndex(1, 3, "prev")).toBe(0);
    expect(clampSongIndex(5, 3)).toBe(2);
    expect(clampSongIndex(-1, 3)).toBe(0);
  });
});
