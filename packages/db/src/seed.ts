import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Database } from "./index";
import { users } from "./schema";

export async function seedAdmin(
  db: Database,
  adminEmail: string,
  adminPassword: string,
): Promise<void> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, adminEmail.toLowerCase()),
  });

  if (existing) {
    const matches = await bcrypt.compare(adminPassword, existing.passwordHash);
    if (!matches) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.email, adminEmail.toLowerCase()));
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await db.insert(users).values({
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: "admin",
    status: "approved",
  });
}
