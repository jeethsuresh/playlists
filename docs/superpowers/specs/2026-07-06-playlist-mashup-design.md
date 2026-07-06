# Playlist Mashup App — Design Spec

**Date:** 2026-07-06  
**Status:** Approved (pending final spec review)

## Summary

A Next.js web app for creating cross-vendor playlists (Spotify + YouTube), collaborating in real time, and playing songs sequentially with optional synced playback across collaborators. Self-hosted via Docker Compose.

---

## Requirements

### Authentication & accounts

- Email + password signup and login (bcrypt hashed passwords).
- **No email verification.**
- **Admin approval required:** new accounts are created with `status: pending` and cannot log in until an admin approves them. Pending users see a clear message; rejected users cannot log in.
- Settings page: change password (current password required).
- **Spotify connect** (separate OAuth in Settings): stores encrypted refresh token per user; required before playing Spotify tracks. Requires Spotify Premium.

### Admin

- Seed one admin user from environment on first deploy: `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- Admin-only page (`/admin/users`): list pending signups, approve or reject.
- Admins have `role: admin`; all other approved users have `role: user`.

### Playlists

- Sidebar: list all playlists the user owns or is a member of; create new playlist.
- Detail view: open selected playlist — add songs via pasted URL, drag-and-drop reorder, remove songs, delete playlist (owner only).
- Share link (`/invite/{share_token}`): requires login; adds user as `member`; redirects to playlist.

### Collaboration roles

| Role   | Edit playlist | Control playback (when sync on) | Manage members/DJ roles | Delete playlist |
|--------|---------------|----------------------------------|-------------------------|-----------------|
| owner  | yes           | yes                              | yes                     | yes             |
| dj     | yes           | yes                              | no                      | no              |
| member | yes           | no (follow only)                 | no                      | no              |

- Owner can promote members → DJ or demote DJs → member.

### Sync playback

- Per-playlist toggle: **Sync playback** on/off.
- When on: WebSocket server is authoritative for `{ songIndex, positionMs, isPlaying, startedAt, controllerUserId }`.
- Owner + DJs control play/pause/skip/seek; members follow.
- On track end: server advances to next song, broadcasts to room.
- **Late joiner:** on connect, server sends full playback state; client seeks to `positionMs` and starts if `isPlaying`.
- Vendor handoff: stop current player (Spotify SDK or YouTube iframe), start next.

### Playback (local)

- When sync off: only local user controls playback on their device.
- Sequential playback across vendors in playlist order.
- **Spotify:** Web Playback SDK (Premium + connected account).
- **YouTube:** IFrame API embed (full video when embeddable).
- **Now playing bar** pinned to bottom of sidebar: current song, artist, vendor, playlist name, controls — visible regardless of open playlist.

### URL parsing

- **Spotify:** `open.spotify.com/track/{id}`, `spotify:track:{id}` → Web API for metadata (client credentials).
- **YouTube:** `youtube.com/watch?v=`, `youtu.be/` → oEmbed (no API key required) or Data API if key provided.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js client)                               │
│  ├─ Sidebar (playlists + now playing bar)               │
│  ├─ Playlist detail                                     │
│  ├─ YouTube IFrame Player                               │
│  ├─ Spotify Web Playback SDK                            │
│  └─ WebSocket client                                    │
└──────────────┬──────────────────────┬───────────────────┘
               │ REST/API              │ WebSocket
┌──────────────▼──────────┐  ┌─────────▼─────────────────┐
│  Next.js App             │  │  WS Server (Node)         │
│  Auth, CRUD, metadata    │  │  Edit broadcast           │
│  Admin approval          │  │  Playback state sync      │
└──────────────┬──────────┘  └─────────┬─────────────────┘
               │                        │
               └────────────┬───────────┘
                            ▼
                     PostgreSQL
                   (internal only)
```

**Containers:** `app`, `ws`, `postgres` — three services in Docker Compose.

---

## Data model

| Table | Key fields |
|-------|------------|
| `users` | id, email, password_hash, role (user/admin), status (pending/approved/rejected), spotify_refresh_token?, created_at |
| `playlists` | id, owner_id, name, sync_playback (bool), share_token (unique), created_at |
| `playlist_songs` | id, playlist_id, vendor (spotify/youtube), external_id, title, artist, thumbnail, position |
| `playlist_members` | playlist_id, user_id, role (owner/member/dj), joined_at |

---

## Docker & Postgres isolation

Postgres must **not interfere** with other Postgres instances on the host:

1. **No host port published** for the Postgres service — it is reachable only on the Compose internal network (`postgres:5432`). The app and WS server connect via the service name, not `localhost`.
2. **Project-scoped resources:** `COMPOSE_PROJECT_NAME` (via `--project-name` flag on scripts) prefixes container names, networks, and volumes so they never collide with other stacks.
3. **Dedicated network:** Compose creates an isolated bridge network; Postgres is not attached to the host network.
4. **Optional debug access:** scripts accept `--postgres-host-port` to publish Postgres on a custom high port (e.g. 35432) for local debugging only; default is no publish.

Scripts: `build.sh`, `test.sh`, `deploy.sh`, `teardown.sh` with `-h`/`--help`, shared parsing in `scripts/lib/common.sh`.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (internal Docker URL) |
| `NEXTAUTH_SECRET` | Session signing |
| `NEXTAUTH_URL` | App base URL |
| `ADMIN_EMAIL` | Seed admin account email |
| `ADMIN_PASSWORD` | Seed admin account password |
| `SPOTIFY_CLIENT_ID` | Spotify app credentials |
| `SPOTIFY_CLIENT_SECRET` | Spotify app credentials |
| `YOUTUBE_API_KEY` | Optional; oEmbed works without it |
| `WS_PORT` | WebSocket server port (internal) |

---

## UI layout

- **Sidebar:** New Playlist button, scrollable playlist list, now-playing bar at bottom.
- **Main area:** Playlist detail, settings, or admin panel.
- **Settings:** Change password, connect/disconnect Spotify.
- **Admin:** Pending user approvals.

---

## Testing

- Unit tests: URL parsers, playback state machine, role permission checks, admin approval gate on login.
- Integration tests: auth flows (signup pending → admin approve → login), playlist CRUD API.
- Run via `./test.sh`.

---

## Out of scope (v1)

- Email verification
- Email-based invites (share link only)
- Mobile-native apps
- Additional vendors beyond Spotify and YouTube
