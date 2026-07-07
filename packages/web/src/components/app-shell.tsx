"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { NowPlayingBar } from "@/components/now-playing-bar";

interface PlaylistSummary {
  id: string;
  name: string;
  songCount: number;
}

export function AppShell({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  const loadPlaylists = useCallback(async () => {
    const res = await fetch("/api/playlists");
    if (res.ok) {
      const data = (await res.json()) as { playlists: PlaylistSummary[] };
      setPlaylists(data.playlists);
    }
  }, []);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists, pathname]);

  async function createPlaylist() {
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Playlist" }),
    });
    if (res.ok) {
      const data = (await res.json()) as { playlist: PlaylistSummary };
      await loadPlaylists();
      router.push(`/playlists/${data.playlist.id}`);
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-4">
          <h1 className="text-lg font-semibold tracking-tight">Playlist Mashup</h1>
          <button
            type="button"
            onClick={() => void createPlaylist()}
            className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            + New Playlist
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {playlists.map((playlist) => {
            const active = pathname === `/playlists/${playlist.id}`;
            return (
              <Link
                key={playlist.id}
                href={`/playlists/${playlist.id}`}
                className={`block rounded-md px-3 py-2 text-sm ${
                  active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/60"
                }`}
              >
                <div className="font-medium">{playlist.name}</div>
                <div className="text-xs text-zinc-500">{playlist.songCount} songs</div>
              </Link>
            );
          })}
        </nav>
        <NowPlayingBar />
        <div className="border-t border-zinc-800 p-3 text-xs text-zinc-500">
          <div className="flex gap-3">
            <Link href="/settings" className="hover:text-zinc-300">
              Settings
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:text-zinc-300">
                Admin
              </Link>
            )}
            <button type="button" onClick={() => signOut()} className="hover:text-zinc-300">
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
