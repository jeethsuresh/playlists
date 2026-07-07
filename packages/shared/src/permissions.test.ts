import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canControlPlayback,
  canDeletePlaylist,
  canEditPlaylist,
  canLogin,
  canManageMembers,
} from "./permissions";

describe("permissions", () => {
  it("allows edit for all member roles", () => {
    assert.equal(canEditPlaylist("owner"), true);
    assert.equal(canEditPlaylist("dj"), true);
    assert.equal(canEditPlaylist("member"), true);
  });

  it("restricts playback control to owner and dj", () => {
    assert.equal(canControlPlayback("owner"), true);
    assert.equal(canControlPlayback("dj"), true);
    assert.equal(canControlPlayback("member"), false);
  });

  it("restricts member management to owner", () => {
    assert.equal(canManageMembers("owner"), true);
    assert.equal(canManageMembers("dj"), false);
  });

  it("restricts delete to owner", () => {
    assert.equal(canDeletePlaylist("owner"), true);
    assert.equal(canDeletePlaylist("member"), false);
  });

  it("allows login only for approved users", () => {
    assert.equal(canLogin("approved"), true);
    assert.equal(canLogin("pending"), false);
    assert.equal(canLogin("rejected"), false);
  });
});
