import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { MediaEngine } from "@/components/media-engine";
import { PlaybackProvider } from "@/contexts/playback-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <PlaybackProvider>
        <AppShell isAdmin={session?.user.role === "admin"}>{children}</AppShell>
        <MediaEngine />
      </PlaybackProvider>
    </SessionProvider>
  );
}
