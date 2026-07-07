"use client";

import { usePlayback } from "@/contexts/playback-context";

export function NowPlayingBar() {
  const {
    playlistName,
    songs,
    songIndex,
    isPlaying,
    play,
    pause,
    skip,
    playlistId,
  } = usePlayback();

  const song = songs[songIndex];
  if (!playlistId || !song) {
    return (
      <div className="border-t border-zinc-800 p-3 text-xs text-zinc-500">
        Nothing playing
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Now playing</div>
      <div className="mt-1 truncate text-sm font-medium">{song.title}</div>
      <div className="truncate text-xs text-zinc-400">{song.artist}</div>
      <div className="mt-1 truncate text-[10px] text-zinc-500">
        {playlistName} · {song.vendor}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => skip("prev")}
          className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => (isPlaying ? pause() : play())}
          className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => skip("next")}
          className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
