import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@playlists/db";
import { NextResponse } from "next/server";
import { ensureDbReady, getDb } from "@/lib/db";

export async function POST(request: Request) {
  await ensureDbReady();
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and password (min 8 chars) required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "user",
      status: "pending",
    })
    .returning({ id: users.id, email: users.email, status: users.status });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    status: user.status,
    message: "Account created. Waiting for admin approval.",
  });
}
