"use client";

import { useCallback, useEffect, useState } from "react";

interface PendingUser {
  id: string;
  email: string;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setError("Access denied or failed to load users");
      return;
    }
    const data = (await res.json()) as { users: PendingUser[] };
    setUsers(data.users);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(userId: string, action: "approve" | "reject") {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    void load();
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold">Pending approvals</h2>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <ul className="mt-6 space-y-2">
        {users.length === 0 && (
          <li className="text-sm text-zinc-400">No pending signups.</li>
        )}
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
          >
            <div>
              <div className="font-medium">{user.email}</div>
              <div className="text-xs text-zinc-500">
                {new Date(user.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void review(user.id, "approve")}
                className="rounded bg-emerald-700 px-3 py-1 text-sm hover:bg-emerald-600"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => void review(user.id, "reject")}
                className="rounded bg-red-900/50 px-3 py-1 text-sm text-red-300 hover:bg-red-900"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
