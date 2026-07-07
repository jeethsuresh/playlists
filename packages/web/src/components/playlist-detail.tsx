"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useState } from "react";
import type { MemberRole, PlaylistEvent } from "@playlists/shared";
import {
  canDeletePlaylist,
  canEditPlaylist,
  canManageMembers,
} from "@playlists/shared";
import { usePlayback, type NowPlayingSong } from "@/contexts/playback-context";
import { wsUrl } from "@/lib/ws-broadcast";

interface Member {
  userId: string;
  email: string;
  role: MemberRole;
}

interface PlaylistData {
  id: string;
  name: string;
  syncPlayback: boolean;
  shareToken: string;
  role: MemberRole;
  songs: NowPlayingSong[];
  members: Member[];
}

function SortableSong({
  song,
  onRemove,
  onPlay,
}: {
  song: NowPlayingSong;
  onRemove: () => void;
  onPlay: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: song.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
    >
      <button type="button" className="cursor-grab text-zinc-500" {...attributes} {...listeners}>
        ⋮⋮
      </button>
      {song.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={song.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{song.title}</div>
        <div className="truncate text-sm text-zinc-400">
          {song.artist} · {song.vendor}
        </div>
      </div>
      <button
        type="button"
        onClick={onPlay}
        className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
      >
        Play
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-zinc-800"
      >
        Remove
      </button>
    </li>
  );
}

export function PlaylistDetail({ playlistId }: { playlistId: string }) {
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setPlaylist: setPlaybackPlaylist, applyPlaylistEvent, play, clearIfPlaylist } =
    usePlayback();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/playlists/${playlistId}`);
    if (!res.ok) {
      setError("Playlist not found");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { playlist: PlaylistData };
    setPlaylist(data.playlist);
    setPlaybackPlaylist(
      data.playlist.id,
      data.playlist.name,
      data.playlist.songs,
      data.playlist.syncPlayback,
      data.playlist.role,
    );
    setLoading(false);
  }, [playlistId, setPlaybackPlaylist]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    void (async () => {
      const tokenRes = await fetch("/api/ws-token");
      if (!tokenRes.ok) return;
      const { token } = (await tokenRes.json()) as { token: string };
      ws = new WebSocket(`${wsUrl()}?token=${encodeURIComponent(token)}`);
      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "join", playlistId, token }));
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as {
          type: string;
          event?: PlaylistEvent;
        };
        if (message.type === "playlist:updated" && message.event) {
          const event = message.event;
          applyPlaylistEvent(event);
          setPlaylist((prev) => {
            if (!prev) return prev;
            const next = { ...prev };
            switch (event.kind) {
              case "song_added":
                next.songs = [...prev.songs, event.song];
                break;
              case "song_removed":
                next.songs = prev.songs.filter((s) => s.id !== event.songId);
                break;
              case "songs_reordered": {
                const map = new Map(prev.songs.map((s) => [s.id, s]));
                next.songs = event.songIds
                  .map((id) => map.get(id))
                  .filter(Boolean) as NowPlayingSong[];
                break;
              }
              case "renamed":
                next.name = event.name;
                break;
              case "sync_toggled":
                next.syncPlayback = event.syncPlayback;
                break;
              case "member_joined":
                next.members = [
                  ...prev.members,
                  { userId: event.userId, email: event.email, role: event.role },
                ];
                break;
              case "member_role_changed":
                next.members = prev.members.map((m) =>
                  m.userId === event.userId ? { ...m, role: event.role } : m,
                );
                break;
              default: {
                const _exhaustive: never = event;
                return _exhaustive;
              }
            }
            return next;
          });
        }
      };
    })();
    return () => ws?.close();
  }, [playlistId, applyPlaylistEvent]);

  if (loading) {
    return <div className="p-8 text-zinc-400">Loading…</div>;
  }
  if (error || !playlist) {
    return <div className="p-8 text-red-400">{error ?? "Error"}</div>;
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${playlist.shareToken}`
      : `/invite/${playlist.shareToken}`;

  async function addSong() {
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to add song");
      return;
    }
    const data = (await res.json()) as { song: NowPlayingSong };
    setPlaylist((p) => (p ? { ...p, songs: [...p.songs, data.song] } : p));
    setUrl("");
    setError(null);
  }

  async function removeSong(songId: string) {
    await fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: "DELETE" });
    setPlaylist((p) =>
      p ? { ...p, songs: p.songs.filter((s) => s.id !== songId) } : p,
    );
  }

  async function reorderSongs(nextSongs: NowPlayingSong[]) {
    setPlaylist((p) => (p ? { ...p, songs: nextSongs } : p));
    await fetch(`/api/playlists/${playlistId}/songs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songIds: nextSongs.map((s) => s.id) }),
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!playlist) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = playlist.songs.findIndex((s) => s.id === active.id);
    const newIndex = playlist.songs.findIndex((s) => s.id === over.id);
    void reorderSongs(arrayMove(playlist.songs, oldIndex, newIndex));
  }

  async function toggleSync() {
    if (!playlist) return;
    await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncPlayback: !playlist.syncPlayback }),
    });
    setPlaylist((p) => (p ? { ...p, syncPlayback: !p.syncPlayback } : p));
  }

  async function updateMemberRole(userId: string, role: "member" | "dj") {
    await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberRole: { userId, role } }),
    });
  }

  async function deletePlaylist() {
    await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
    clearIfPlaylist(playlistId);
    window.location.href = "/";
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{playlist.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">Role: {playlist.role}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(playlist.role === "owner" || playlist.role === "dj") && (
            <button
              type="button"
              onClick={() => void toggleSync()}
              className={`rounded px-3 py-1.5 text-sm ${
                playlist.syncPlayback ? "bg-emerald-800" : "bg-zinc-800"
              }`}
            >
              Sync playback: {playlist.syncPlayback ? "On" : "Off"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(shareUrl)}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
          >
            Copy share link
          </button>
          {canDeletePlaylist(playlist.role) && (
            <button
              type="button"
              onClick={() => void deletePlaylist()}
              className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900"
            >
              Delete playlist
            </button>
          )}
        </div>
      </div>

      {canEditPlaylist(playlist.role) && (
        <div className="mt-6 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste Spotify or YouTube link"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void addSong()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Add song
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={playlist.songs.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-6 space-y-2">
            {playlist.songs.map((song, index) => (
              <SortableSong
                key={song.id}
                song={song}
                onRemove={() => void removeSong(song.id)}
                onPlay={() => play(index)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {canManageMembers(playlist.role) && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-zinc-300">Collaborators</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {playlist.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3 text-zinc-400">
                <span>{member.email}</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{member.role}</span>
                {member.role !== "owner" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void updateMemberRole(member.userId, "dj")}
                      className="text-xs text-emerald-400"
                    >
                      Make DJ
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateMemberRole(member.userId, "member")}
                      className="text-xs text-zinc-400"
                    >
                      Make member
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
