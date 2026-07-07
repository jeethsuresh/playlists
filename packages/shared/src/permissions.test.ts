import { describe, expect, it } from "vitest";
import {
  canControlPlayback,
  canDeletePlaylist,
  canEditPlaylist,
  canLogin,
  canManageMembers,
} from "./permissions";

describe("permissions", () => {
  it("allows edit for all member roles", () => {
    expect(canEditPlaylist("owner")).toBe(true);
    expect(canEditPlaylist("dj")).toBe(true);
    expect(canEditPlaylist("member")).toBe(true);
  });

  it("restricts playback control to owner and dj", () => {
    expect(canControlPlayback("owner")).toBe(true);
    expect(canControlPlayback("dj")).toBe(true);
    expect(canControlPlayback("member")).toBe(false);
  });

  it("restricts member management to owner", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("dj")).toBe(false);
  });

  it("restricts delete to owner", () => {
    expect(canDeletePlaylist("owner")).toBe(true);
    expect(canDeletePlaylist("member")).toBe(false);
  });

  it("allows login only for approved users", () => {
    expect(canLogin("approved")).toBe(true);
    expect(canLogin("pending")).toBe(false);
    expect(canLogin("rejected")).toBe(false);
  });
});
