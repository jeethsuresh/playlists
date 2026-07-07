import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrackUrl } from "./url-parsers";

describe("parseTrackUrl", () => {
  it("parses spotify open url", () => {
    assert.deepEqual(parseTrackUrl("https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6"), {
      vendor: "spotify",
      externalId: "6rqhFgbbKwnb9MLmUQDhG6",
    });
  });

  it("parses spotify uri", () => {
    assert.deepEqual(parseTrackUrl("spotify:track:abc123XYZ"), {
      vendor: "spotify",
      externalId: "abc123XYZ",
    });
  });

  it("parses youtube watch url", () => {
    assert.deepEqual(parseTrackUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), {
      vendor: "youtube",
      externalId: "dQw4w9WgXcQ",
    });
  });

  it("parses youtu.be url", () => {
    assert.deepEqual(parseTrackUrl("https://youtu.be/dQw4w9WgXcQ"), {
      vendor: "youtube",
      externalId: "dQw4w9WgXcQ",
    });
  });

  it("returns null for invalid url", () => {
    assert.equal(parseTrackUrl("https://example.com"), null);
  });
});
