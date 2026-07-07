import { relations } from "drizzle-orm";
import {
  playlistMembers,
  playlists,
  playlistSongs,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  ownedPlaylists: many(playlists),
  memberships: many(playlistMembers),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  owner: one(users, {
    fields: [playlists.ownerId],
    references: [users.id],
  }),
  songs: many(playlistSongs),
  members: many(playlistMembers),
}));

export const playlistSongsRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistSongs.playlistId],
    references: [playlists.id],
  }),
}));

export const playlistMembersRelations = relations(playlistMembers, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistMembers.playlistId],
    references: [playlists.id],
  }),
  user: one(users, {
    fields: [playlistMembers.userId],
    references: [users.id],
  }),
}));
