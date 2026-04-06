import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Game Session & Score Queries ─────────────────────────────────────────

import { gameSessions, gameScores, InsertGameSession, InsertGameScore } from "../drizzle/schema";
import { desc, sql } from "drizzle-orm";

export async function createGameSession(data: InsertGameSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gameSessions).values(data);
  return Number(result[0].insertId);
}

export async function saveGameScores(scores: InsertGameScore[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (scores.length === 0) return;
  await db.insert(gameScores).values(scores);
}

export async function getLeaderboard(groupName?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = groupName
    ? sql`WHERE ${gameScores.groupName} = ${groupName}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      playerName,
      groupName,
      COUNT(*) as gamesPlayed,
      SUM(points) as totalPoints,
      SUM(handsWon) as totalHandsWon,
      SUM(CASE WHEN hadTrio = 1 THEN 1 ELSE 0 END) as trioCount,
      MAX(createdAt) as lastPlayed
    FROM game_scores
    ${conditions}
    GROUP BY playerName, groupName
    ORDER BY totalPoints DESC
  `);

  return (result[0] as unknown as any[]).map((row: any) => ({
    playerName: row.playerName as string,
    groupName: row.groupName as string,
    gamesPlayed: Number(row.gamesPlayed),
    totalPoints: Number(row.totalPoints),
    totalHandsWon: Number(row.totalHandsWon),
    trioCount: Number(row.trioCount),
    lastPlayed: row.lastPlayed as string,
  }));
}

export async function getGroupNames(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT DISTINCT groupName FROM game_scores ORDER BY groupName
  `);

  return (result[0] as unknown as any[]).map((row: any) => row.groupName as string);
}

export async function getRecentGames(groupName?: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const conditions = groupName
    ? sql`WHERE gs.groupName = ${groupName}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      gs.id as sessionId,
      gs.roomId,
      gs.groupName,
      gs.roundNumber,
      gs.trumpSuit,
      gs.hasTrio,
      gs.createdAt,
      gsc.playerName,
      gsc.handsWon,
      gsc.points,
      gsc.hadTrio
    FROM game_sessions gs
    JOIN game_scores gsc ON gsc.sessionId = gs.id
    ${conditions}
    ORDER BY gs.createdAt DESC, gsc.seat ASC
    LIMIT ${limit * 4}
  `);

  // Group by session
  const sessions = new Map<number, any>();
  for (const row of result[0] as unknown as any[]) {
    const sid = Number(row.sessionId);
    if (!sessions.has(sid)) {
      sessions.set(sid, {
        sessionId: sid,
        roomId: row.roomId,
        groupName: row.groupName,
        roundNumber: Number(row.roundNumber),
        trumpSuit: row.trumpSuit,
        hasTrio: Boolean(row.hasTrio),
        createdAt: row.createdAt,
        players: [],
      });
    }
    sessions.get(sid)!.players.push({
      playerName: row.playerName,
      handsWon: Number(row.handsWon),
      points: Number(row.points),
      hadTrio: Boolean(row.hadTrio),
    });
  }

  return Array.from(sessions.values());
}


// ─── Room State Management (for HTTP polling) ─────────────────────────────────

// In-memory room state storage (for development/testing)
// In production, this should be stored in a database or Redis
const roomStates = new Map<string, any>();
const roomExpirationTimers = new Map<string, ReturnType<typeof setTimeout>>();
const ROOM_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// Clean up expired rooms periodically
setInterval(() => {
  const now = new Date();
  for (const [roomId, room] of roomStates.entries()) {
    const createdAt = new Date(room.createdAt);
    const age = now.getTime() - createdAt.getTime();
    if (age > ROOM_EXPIRATION_TIME) {
      roomStates.delete(roomId);
      const timer = roomExpirationTimers.get(roomId);
      if (timer) clearTimeout(timer);
      roomExpirationTimers.delete(roomId);
      console.log(`[db] Room expired and deleted: ${roomId}`);
    }
  }
}, 30000); // Check every 30 seconds

export function getRoomState(roomId: string) {
  console.log(`[db] getRoomState called for roomId: ${roomId}`);
  console.log(`[db] Available rooms: ${Array.from(roomStates.keys()).join(', ')}`);
  const room = roomStates.get(roomId);
  if (!room) {
    console.log(`[db] Room not found: ${roomId}`);
    return null;
  }
  console.log(`[db] Room found: ${roomId}, players: ${room.players.map((p: any) => p.displayName).join(', ')}`);
  
  // Check if room has expired
  const createdAt = new Date(room.createdAt);
  const age = new Date().getTime() - createdAt.getTime();
  console.log(`[db] Room age: ${age}ms, expiration time: ${ROOM_EXPIRATION_TIME}ms`);
  if (age > ROOM_EXPIRATION_TIME) {
    console.log(`[db] Room expired: ${roomId}`);
    roomStates.delete(roomId);
    const timer = roomExpirationTimers.get(roomId);
    if (timer) clearTimeout(timer);
    roomExpirationTimers.delete(roomId);
    return null;
  }
  
  return room;
}

export function createRoom(roomId: string, playerName: string, displayName: string) {
  const room = {
    roomId,
    players: [{ playerName, displayName, seat: 0 }],
    status: "waiting",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + ROOM_EXPIRATION_TIME),
  };
  roomStates.set(roomId, room);
  
  console.log(`[db] Room created: ${roomId} by ${displayName}. Total rooms: ${roomStates.size}`);
  
  // Set expiration timer
  const existingTimer = roomExpirationTimers.get(roomId);
  if (existingTimer) clearTimeout(existingTimer);
  
  const timer = setTimeout(() => {
    roomStates.delete(roomId);
    roomExpirationTimers.delete(roomId);
    console.log(`[db] Room expired: ${roomId}`);
  }, ROOM_EXPIRATION_TIME);
  
  roomExpirationTimers.set(roomId, timer);
  return room;
}

export function addPlayerToRoom(roomId: string, playerName: string, displayName: string) {
  const room = roomStates.get(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  // Check if player already exists
  const existingPlayer = room.players.find((p: any) => p.playerName === playerName);
  if (existingPlayer) {
    return room;
  }

  // Add new player with next available seat
  const nextSeat = room.players.length;
  room.players.push({ playerName, displayName, seat: nextSeat });
  roomStates.set(roomId, room);
  
  console.log(`[db] Player ${playerName} added to room ${roomId}. Total players: ${room.players.length}`);
  return room;
}

export function getRoomExpirationTime(roomId: string): number | null {
  const room = roomStates.get(roomId);
  if (!room) return null;
  
  const expiresAt = new Date(room.expiresAt);
  const now = new Date();
  const remainingMs = expiresAt.getTime() - now.getTime();
  
  return Math.max(0, remainingMs);
}
