import { sql } from "drizzle-orm";
import type { Database } from "./index";

export async function migrate(db: Database): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('user', 'admin');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE member_role AS ENUM ('owner', 'member', 'dj');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE vendor AS ENUM ('spotify', 'youtube');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL DEFAULT 'user',
      status user_status NOT NULL DEFAULT 'pending',
      spotify_refresh_token TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS playlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sync_playback BOOLEAN NOT NULL DEFAULT FALSE,
      share_token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      vendor vendor NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      thumbnail TEXT,
      position INTEGER NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS playlist_members (
      playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role member_role NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (playlist_id, user_id)
    );
  `);
}
