import type { MemberRole } from "./types";

export function canEditPlaylist(role: MemberRole): boolean {
  return role === "owner" || role === "dj" || role === "member";
}

export function canControlPlayback(role: MemberRole): boolean {
  return role === "owner" || role === "dj";
}

export function canManageMembers(role: MemberRole): boolean {
  return role === "owner";
}

export function canDeletePlaylist(role: MemberRole): boolean {
  return role === "owner";
}

export function canLogin(status: string): boolean {
  return status === "approved";
}
