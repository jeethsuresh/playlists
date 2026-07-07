import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as relations from "./relations";
import * as schema from "./schema";

const fullSchema = { ...schema, ...relations };

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  const db = drizzle(client, { schema: fullSchema });
  return { db, client };
}

export type Database = ReturnType<typeof createDb>["db"];

export * from "./schema";
export * from "./migrate";
export * from "./seed";
