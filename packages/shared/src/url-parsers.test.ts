import { describe, expect, it } from "vitest";
import { parseTrackUrl } from "./url-parsers";

describe("parseTrackUrl", () => {
  it("parses spotify open url", () => {
    expect(parseTrackUrl("https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6")).toEqual({
      vendor: "spotify",
      externalId: "6rqhFgbbKwnb9MLmUQDhG6",
    });
  });

  it("parses spotify uri", () => {
    expect(parseTrackUrl("spotify:track:abc123XYZ")).toEqual({
      vendor: "spotify",
      externalId: "abc123XYZ",
    });
  });

  it("parses youtube watch url", () => {
    expect(parseTrackUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      vendor: "youtube",
      externalId: "dQw4w9WgXcQ",
    });
  });

  it("parses youtu.be url", () => {
    expect(parseTrackUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      vendor: "youtube",
      externalId: "dQw4w9WgXcQ",
    });
  });

  it("returns null for invalid url", () => {
    expect(parseTrackUrl("https://example.com")).toBeNull();
  });
});
