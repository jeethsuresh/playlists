import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@playlists/db";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { ensureDbReady, getDb } from "@/lib/db";

export async function POST(request: Request) {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword || body.newPassword.length < 8) {
    return NextResponse.json({ error: "Invalid password payload" }, { status: 400 });
  }

  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, authResult.session!.user.id),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(body.newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
