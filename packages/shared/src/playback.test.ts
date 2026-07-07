import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceSongIndex,
  clampSongIndex,
  computeCurrentPositionMs,
  createInitialPlayback,
} from "./playback";

describe("playback", () => {
  it("creates initial playback state", () => {
    assert.deepEqual(createInitialPlayback("pl-1"), {
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
    assert.equal(computeCurrentPositionMs(state, 8000), 4000);
  });

  it("returns stored position when paused", () => {
    const state = createInitialPlayback("pl-1");
    state.positionMs = 2500;
    assert.equal(computeCurrentPositionMs(state, 99999), 2500);
  });

  it("advances and clamps song index", () => {
    assert.equal(advanceSongIndex(0, 3, "next"), 1);
    assert.equal(advanceSongIndex(2, 3, "next"), 2);
    assert.equal(advanceSongIndex(1, 3, "prev"), 0);
    assert.equal(clampSongIndex(5, 3), 2);
    assert.equal(clampSongIndex(-1, 3), 0);
  });
});
