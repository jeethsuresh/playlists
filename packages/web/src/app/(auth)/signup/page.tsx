"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      return;
    }
    setMessage(data.message ?? "Account created. Waiting for admin approval.");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          Sign up
        </button>
        <p className="mt-4 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
