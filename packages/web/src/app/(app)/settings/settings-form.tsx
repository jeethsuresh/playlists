"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SettingsForm() {
  const searchParams = useSearchParams();
  const spotifyStatus = searchParams.get("spotify");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/settings/spotify")
      .then((r) => r.json())
      .then((d: { connected: boolean }) => setSpotifyConnected(d.connected));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setMessage(res.ok ? "Password updated" : "Failed to update password");
  }

  async function disconnectSpotify() {
    await fetch("/api/settings/spotify", { method: "DELETE" });
    setSpotifyConnected(false);
  }

  return (
    <div className="max-w-lg p-8">
      <h2 className="text-2xl font-semibold">Settings</h2>

      <form onSubmit={(e) => void changePassword(e)} className="mt-8 space-y-4">
        <h3 className="text-sm font-medium text-zinc-300">Change password</h3>
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="New password (min 8 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          Update password
        </button>
        {message && <p className="text-sm text-zinc-400">{message}</p>}
      </form>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-zinc-300">Spotify</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Connect Spotify Premium to play full tracks. Required for Spotify songs in playlists.
        </p>
        {spotifyStatus === "connected" && (
          <p className="mt-2 text-sm text-emerald-400">Spotify connected successfully.</p>
        )}
        {spotifyStatus === "error" && (
          <p className="mt-2 text-sm text-red-400">Spotify connection failed.</p>
        )}
        <div className="mt-3 flex gap-2">
          <Link
            href="/api/spotify/connect"
            className="rounded-md bg-[#1DB954] px-4 py-2 text-sm font-medium text-black"
          >
            Connect Spotify
          </Link>
          <button
            type="button"
            onClick={() => void disconnectSpotify()}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm"
          >
            Disconnect
          </button>
        </div>
        {spotifyConnected !== null && (
          <p className="mt-2 text-xs text-zinc-500">
            Status: {spotifyConnected ? "Connected" : "Not connected"}
          </p>
        )}
      </div>
    </div>
  );
}
