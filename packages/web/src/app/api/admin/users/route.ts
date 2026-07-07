import { eq } from "drizzle-orm";
import { users } from "@playlists/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { ensureDbReady, getDb } from "@/lib/db";

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const db = getDb();
  const pending = await db.query.users.findMany({
    where: eq(users.status, "pending"),
    columns: { id: true, email: true, createdAt: true },
  });

  return NextResponse.json({ users: pending });
}

export async function PATCH(request: Request) {
  const authResult = await requireAdmin();
  if (authResult.error) {
    return authResult.error;
  }

  await ensureDbReady();
  const body = (await request.json()) as { userId?: string; action?: "approve" | "reject" };
  if (!body.userId || !body.action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const db = getDb();
  const status = body.action === "approve" ? "approved" : "rejected";
  const [updated] = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, body.userId))
    .returning({ id: users.id, email: users.email, status: users.status });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
