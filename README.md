# Playlist Mashup

Cross-vendor collaborative playlists (Spotify + YouTube) with real-time editing and optional synced playback.

## Quick start

```bash
cp .env.example .env
# Edit .env with your secrets and Spotify credentials

./build.sh
./test.sh
./deploy.sh --project-name "playlists-dev" --host-port 3456
```

Open http://localhost:3456 — sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, approve new users at `/admin`.

## Scripts

| Script | Purpose |
|--------|---------|
| `./build.sh` | Build Docker images |
| `./test.sh` | Run unit tests |
| `./deploy.sh` | Start stack via Docker Compose |
| `./teardown.sh` | Stop and remove stack |

All scripts support `-h` / `--help`. Postgres is **not** exposed to the host by default; use `./deploy.sh --postgres-host-port 35432` with the `debug` profile for direct DB access.

## Spotify setup

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI: `{NEXTAUTH_URL}/api/spotify/callback`
3. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`
4. Connect Spotify in Settings (requires Premium for full playback)
