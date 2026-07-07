import { createDb, migrate, seedAdmin } from "@playlists/db";

const globalForDb = globalThis as unknown as {
  dbInstance?: ReturnType<typeof createDb>;
  dbReady?: Promise<void>;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function getDb() {
  if (!globalForDb.dbInstance) {
    globalForDb.dbInstance = createDb(getDatabaseUrl());
  }
  return globalForDb.dbInstance.db;
}

export async function ensureDbReady(): Promise<void> {
  if (!globalForDb.dbReady) {
    globalForDb.dbReady = (async () => {
      if (!globalForDb.dbInstance) {
        globalForDb.dbInstance = createDb(getDatabaseUrl());
      }
      const { db } = globalForDb.dbInstance;
      await migrate(db);
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        await seedAdmin(db, adminEmail, adminPassword);
      }
    })();
  }
  await globalForDb.dbReady;
}
