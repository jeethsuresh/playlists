import { eq } from "drizzle-orm";
import { playlistMembers } from "@playlists/db";
import type { MemberRole } from "@playlists/shared";
import { getDb } from "./db";

export async function getMemberRole(
  playlistId: string,
  userId: string,
): Promise<MemberRole | null> {
  const db = getDb();
  const member = await db.query.playlistMembers.findFirst({
    where: (fields, { and, eq: eqFn }) =>
      and(eqFn(fields.playlistId, playlistId), eqFn(fields.userId, userId)),
  });
  return member?.role ?? null;
}

export async function requireMember(playlistId: string, userId: string) {
  const role = await getMemberRole(playlistId, userId);
  if (!role) {
    return null;
  }
  return role;
}
