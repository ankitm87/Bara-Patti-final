import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Game Sessions ──────────────────────────────────────────────────────────

export const gameSessions = mysqlTable("game_sessions", {
  id: int("id").autoincrement().primaryKey(),
  roomId: varchar("roomId", { length: 16 }).notNull(),
  /** Group name for grouping leaderboard by family/friend group */
  groupName: varchar("groupName", { length: 128 }).notNull().default("Default"),
  roundNumber: int("roundNumber").notNull().default(1),
  trumpSuit: varchar("trumpSuit", { length: 16 }),
  hasTrio: boolean("hasTrio").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = typeof gameSessions.$inferInsert;

// ─── Game Scores (per player per session) ───────────────────────────────────

export const gameScores = mysqlTable("game_scores", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  /** Player name (works for both logged-in users and bots) */
  playerName: varchar("playerName", { length: 128 }).notNull(),
  /** UserId from auth (null for bots) */
  userId: int("userId"),
  seat: int("seat").notNull(),
  handsWon: int("handsWon").notNull().default(0),
  points: int("points").notNull().default(0),
  hadTrio: boolean("hadTrio").default(false).notNull(),
  groupName: varchar("groupName", { length: 128 }).notNull().default("Default"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = typeof gameScores.$inferInsert;
