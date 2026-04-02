// server/_core/index.ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var gameSessions = mysqlTable("game_sessions", {
  id: int("id").autoincrement().primaryKey(),
  roomId: varchar("roomId", { length: 16 }).notNull(),
  /** Group name for grouping leaderboard by family/friend group */
  groupName: varchar("groupName", { length: 128 }).notNull().default("Default"),
  roundNumber: int("roundNumber").notNull().default(1),
  trumpSuit: varchar("trumpSuit", { length: 16 }),
  hasTrio: boolean("hasTrio").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var gameScores = mysqlTable("game_scores", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
import { sql } from "drizzle-orm";
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createGameSession(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gameSessions).values(data);
  return Number(result[0].insertId);
}
async function saveGameScores(scores) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (scores.length === 0) return;
  await db.insert(gameScores).values(scores);
}
async function getLeaderboard(groupName) {
  const db = await getDb();
  if (!db) return [];
  const conditions = groupName ? sql`WHERE ${gameScores.groupName} = ${groupName}` : sql``;
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
  return result[0].map((row) => ({
    playerName: row.playerName,
    groupName: row.groupName,
    gamesPlayed: Number(row.gamesPlayed),
    totalPoints: Number(row.totalPoints),
    totalHandsWon: Number(row.totalHandsWon),
    trioCount: Number(row.trioCount),
    lastPlayed: row.lastPlayed
  }));
}
async function getGroupNames() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT DISTINCT groupName FROM game_scores ORDER BY groupName
  `);
  return result[0].map((row) => row.groupName);
}
async function getRecentGames(groupName, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const conditions = groupName ? sql`WHERE gs.groupName = ${groupName}` : sql``;
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
  const sessions = /* @__PURE__ */ new Map();
  for (const row of result[0]) {
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
        players: []
      });
    }
    sessions.get(sid).players.push({
      playerName: row.playerName,
      handsWon: Number(row.handsWon),
      points: Number(row.points),
      hadTrio: Boolean(row.hadTrio)
    });
  }
  return Array.from(sessions.values());
}
var roomStates = /* @__PURE__ */ new Map();
var roomExpirationTimers = /* @__PURE__ */ new Map();
var ROOM_EXPIRATION_TIME = 5 * 60 * 1e3;
setInterval(() => {
  const now = /* @__PURE__ */ new Date();
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
}, 3e4);
function getRoomState(roomId) {
  console.log(`[db] getRoomState called for roomId: ${roomId}`);
  console.log(`[db] Available rooms: ${Array.from(roomStates.keys()).join(", ")}`);
  const room = roomStates.get(roomId);
  if (!room) {
    console.log(`[db] Room not found: ${roomId}`);
    return null;
  }
  console.log(`[db] Room found: ${roomId}`);
  const createdAt = new Date(room.createdAt);
  const age = (/* @__PURE__ */ new Date()).getTime() - createdAt.getTime();
  if (age > ROOM_EXPIRATION_TIME) {
    roomStates.delete(roomId);
    const timer = roomExpirationTimers.get(roomId);
    if (timer) clearTimeout(timer);
    roomExpirationTimers.delete(roomId);
    return null;
  }
  return room;
}
function createRoom(roomId, playerName, displayName) {
  const room = {
    roomId,
    players: [{ playerName, displayName, seat: 0 }],
    status: "waiting",
    createdAt: /* @__PURE__ */ new Date(),
    expiresAt: new Date(Date.now() + ROOM_EXPIRATION_TIME)
  };
  roomStates.set(roomId, room);
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
function addPlayerToRoom(roomId, playerName, displayName) {
  const room = roomStates.get(roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  const existingPlayer = room.players.find((p) => p.playerName === playerName);
  if (existingPlayer) {
    return room;
  }
  const nextSeat = room.players.length;
  room.players.push({ playerName, displayName, seat: nextSeat });
  roomStates.set(roomId, room);
  return room;
}
function getRoomExpirationTime(roomId) {
  const room = roomStates.get(roomId);
  if (!room) return null;
  const expiresAt = new Date(room.expiresAt);
  const now = /* @__PURE__ */ new Date();
  const remainingMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, remainingMs);
}

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getParentDomain(hostname) {
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return void 0;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) {
    return void 0;
  }
  return "." + parts.slice(-2).join(".");
}
function getSessionCookieOptions(req) {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(GET_USER_INFO_PATH, {
      accessToken: token.accessToken
    });
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(platforms.filter((p) => typeof p === "string"));
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
async function syncUser(userInfo) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }
  const lastSignedIn = /* @__PURE__ */ new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? {
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod ?? null,
    lastSignedIn
  };
}
function buildUserResponse(user) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? /* @__PURE__ */ new Date()).toISOString()
  };
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
  app.get("/api/oauth/mobile", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user)
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  room: router({
    /** Get current room state for polling */
    getState: publicProcedure.input(z2.object({ roomId: z2.string() })).query(({ input }) => {
      return getRoomState(input.roomId);
    }),
    /** Get room expiration time in milliseconds */
    getExpirationTime: publicProcedure.input(z2.object({ roomId: z2.string() })).query(({ input }) => {
      const remainingMs = getRoomExpirationTime(input.roomId);
      return { remainingMs, expiresAt: remainingMs ? new Date(Date.now() + remainingMs) : null };
    }),
    /** Join a room (HTTP alternative to socket) */
    join: publicProcedure.input(z2.object({
      roomId: z2.string(),
      playerName: z2.string(),
      displayName: z2.string()
    })).mutation(({ input }) => {
      return addPlayerToRoom(input.roomId, input.playerName, input.displayName);
    }),
    /** Create a new room (HTTP alternative to socket) */
    create: publicProcedure.input(z2.object({
      roomId: z2.string(),
      playerName: z2.string(),
      displayName: z2.string()
    })).mutation(({ input }) => {
      return createRoom(input.roomId, input.playerName, input.displayName);
    })
  }),
  leaderboard: router({
    /** Get aggregated leaderboard, optionally filtered by group */
    getLeaderboard: publicProcedure.input(z2.object({ groupName: z2.string().optional() }).optional()).query(({ input }) => {
      return getLeaderboard(input?.groupName);
    }),
    /** Get list of all group names */
    getGroups: publicProcedure.query(() => {
      return getGroupNames();
    }),
    /** Get recent game sessions with scores */
    getRecentGames: publicProcedure.input(z2.object({ groupName: z2.string().optional(), limit: z2.number().optional() }).optional()).query(({ input }) => {
      return getRecentGames(input?.groupName, input?.limit);
    }),
    /** Save a completed round */
    saveRound: publicProcedure.input(z2.object({
      roomId: z2.string(),
      groupName: z2.string().default("Default"),
      roundNumber: z2.number(),
      trumpSuit: z2.string().optional(),
      hasTrio: z2.boolean().default(false),
      scores: z2.array(z2.object({
        playerName: z2.string(),
        seat: z2.number(),
        handsWon: z2.number(),
        points: z2.number(),
        hadTrio: z2.boolean().default(false)
      }))
    })).mutation(async ({ input }) => {
      const sessionId = await createGameSession({
        roomId: input.roomId,
        groupName: input.groupName,
        roundNumber: input.roundNumber,
        trumpSuit: input.trumpSuit,
        hasTrio: input.hasTrio
      });
      await saveGameScores(
        input.scores.map((s) => ({
          sessionId,
          playerName: s.playerName,
          seat: s.seat,
          handsWon: s.handsWon,
          points: s.points,
          hadTrio: s.hadTrio,
          groupName: input.groupName
        }))
      );
      return { sessionId };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/socket-handler.ts
import { Server as SocketIOServer } from "socket.io";

// lib/game-engine.ts
var SUITS = ["hearts", "diamonds", "clubs", "spades"];
var RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
var RANK_ORDER = {
  "3": 0,
  "4": 1,
  "5": 2,
  "6": 3,
  "7": 4,
  "8": 5,
  "9": 6,
  "10": 7,
  "J": 8,
  "Q": 9,
  "K": 10,
  "A": 11
};
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
}
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function dealCards(deck, dealerSeat) {
  const hands = [[], [], [], []];
  let currentSeat = (dealerSeat + 1) % 4;
  for (let i = 0; i < deck.length; i++) {
    hands[currentSeat].push(deck[i]);
    currentSeat = (currentSeat + 1) % 4;
  }
  const trumpCard = hands[dealerSeat][hands[dealerSeat].length - 1];
  for (const hand of hands) {
    hand.sort((a, b) => {
      const suitDiff = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    });
  }
  return { hands, trumpCard };
}
function createInitialGameState(roomId) {
  return {
    roomId,
    phase: "waiting",
    dealerSeat: 0,
    trumpCard: null,
    trumpSuit: null,
    players: [],
    currentTrick: null,
    completedTricks: [],
    currentPlayerSeat: 1,
    // Left of dealer starts
    roundNumber: 0,
    winningTrio: null,
    scores: {},
    turnStartTime: null,
    phaseStartTime: null
  };
}
function startNewRound(state) {
  const deck = shuffleDeck(createDeck());
  const { hands, trumpCard } = dealCards(deck, state.dealerSeat);
  const updatedPlayers = state.players.map((p) => ({
    ...p,
    hand: hands[p.seat],
    handsWon: 0,
    hasDeclinedTrio: false
  }));
  return {
    ...state,
    phase: "dealing",
    trumpCard,
    trumpSuit: trumpCard.suit,
    players: updatedPlayers,
    currentTrick: null,
    completedTricks: [],
    currentPlayerSeat: (state.dealerSeat + 1) % 4,
    roundNumber: state.roundNumber + 1,
    winningTrio: null,
    phaseStartTime: Date.now()
  };
}

// server/socket-handler.ts
var gameRooms = /* @__PURE__ */ new Map();
var autoPlayTimers = /* @__PURE__ */ new Map();
function initializeSocketIO(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  io.on("connection", (socket) => {
    console.log(`[socket] Player connected: ${socket.id}`);
    socket.on("create-room", (data, callback) => {
      const room = {
        roomId: data.roomId,
        gameState: createInitialGameState(data.roomId),
        players: /* @__PURE__ */ new Map(),
        hostSocketId: socket.id
      };
      gameRooms.set(data.roomId, room);
      socket.join(data.roomId);
      room.players.set(socket.id, { ...data.player, seat: 0 });
      room.gameState.players = Array.from(room.players.values());
      createRoom(data.roomId, data.player.userId, data.player.odName || data.player.name);
      console.log(`[socket] Room created: ${data.roomId} by ${socket.id}`);
      callback({ success: true, roomId: data.roomId });
      io.to(data.roomId).emit("room-state", room.gameState);
    });
    socket.on("join-room", (data, callback) => {
      const room = gameRooms.get(data.roomId);
      if (!room) {
        callback({ success: false, error: "Room not found" });
        return;
      }
      socket.join(data.roomId);
      const usedSeats = new Set(room.players.values().map((p) => p.seat));
      let assignedSeat = 0;
      for (let i = 0; i < 4; i++) {
        if (!usedSeats.has(i)) {
          assignedSeat = i;
          break;
        }
      }
      room.players.set(socket.id, { ...data.player, seat: assignedSeat });
      room.gameState.players = Array.from(room.players.values());
      addPlayerToRoom(data.roomId, data.player.userId, data.player.odName || data.player.name);
      console.log(`[socket] Player joined room ${data.roomId}: ${socket.id} as seat ${assignedSeat}`);
      callback({ success: true, seat: assignedSeat });
      io.to(data.roomId).emit("room-state", room.gameState);
    });
    socket.on("leave-room", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      room.players.delete(socket.id);
      room.gameState.players = Array.from(room.players.values());
      if (room.players.size === 0) {
        gameRooms.delete(data.roomId);
        console.log(`[socket] Room deleted: ${data.roomId}`);
      } else {
        if (socket.id === room.hostSocketId) {
          const nextHost = room.players.keys().next().value;
          if (nextHost) room.hostSocketId = nextHost;
        }
        io.to(data.roomId).emit("room-state", room.gameState);
      }
      socket.leave(data.roomId);
    });
    socket.on("set-ready", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      const player = room.gameState.players.find((p) => p.seat === data.seat);
      if (player) {
        player.isReady = data.isReady;
      }
      io.to(data.roomId).emit("room-state", room.gameState);
    });
    socket.on("start-game", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room || socket.id !== room.hostSocketId) return;
      const allReady = room.gameState.players.every((p) => p.isReady);
      if (!allReady || room.gameState.players.length < 4) return;
      room.gameState = startNewRound(room.gameState);
      console.log(`[socket] Game started in room ${data.roomId}`);
      io.to(data.roomId).emit("game-state", room.gameState);
    });
    socket.on("play-card", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      if (room.gameState.currentPlayerSeat !== data.seat) return;
      const timerId = `${data.roomId}-${data.seat}`;
      if (autoPlayTimers.has(timerId)) {
        clearTimeout(autoPlayTimers.get(timerId));
        autoPlayTimers.delete(timerId);
      }
      room.gameState.players = room.gameState.players.map(
        (p) => p.seat === data.seat ? { ...p, hand: p.hand.filter((c) => c.id !== data.card.id) } : p
      );
      if (room.gameState.currentTrick) {
        room.gameState.currentTrick.cards.push({ seat: data.seat, card: data.card });
        if (room.gameState.currentTrick.cards.length === 4) {
          room.gameState.phase = "trick_complete";
        } else {
          room.gameState.currentPlayerSeat = (data.seat + 1) % 4;
        }
      }
      io.to(data.roomId).emit("game-state", room.gameState);
    });
    socket.on("declare-trio", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      io.to(data.roomId).emit("game-state", room.gameState);
    });
    socket.on("chat-message", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      const player = room.gameState.players.find((p) => p.seat === data.seatNumber);
      if (!player) return;
      io.to(data.roomId).emit("chat-message", {
        id: `${socket.id}-${data.timestamp}`,
        sender: player.name,
        text: data.message,
        timestamp: data.timestamp,
        seatNumber: data.seatNumber
      });
    });
    socket.on("audio-message", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      const player = room.gameState.players.find((p) => p.seat === data.seatNumber);
      if (!player) return;
      io.to(data.roomId).emit("audio-message", {
        id: `${socket.id}-${data.timestamp}`,
        sender: player.name,
        audioUrl: data.audioUrl,
        duration: data.duration,
        timestamp: data.timestamp,
        seatNumber: data.seatNumber
      });
    });
    socket.on("emoji-reaction", (data) => {
      const room = gameRooms.get(data.roomId);
      if (!room) return;
      const player = room.gameState.players.find((p) => p.seat === data.seatNumber);
      if (!player) return;
      io.to(data.roomId).emit("emoji-reaction", {
        id: `${socket.id}-${data.timestamp}`,
        sender: player.name,
        emoji: data.emoji,
        timestamp: data.timestamp,
        seatNumber: data.seatNumber
      });
    });
    socket.on("disconnect", () => {
      console.log(`[socket] Player disconnected: ${socket.id}`);
      for (const [roomId, room] of gameRooms.entries()) {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          room.gameState.players = Array.from(room.players.values());
          if (room.players.size === 0) {
            gameRooms.delete(roomId);
          } else {
            if (socket.id === room.hostSocketId) {
              const nextHost = room.players.keys().next().value;
              if (nextHost) room.hostSocketId = nextHost;
            }
            io.to(roomId).emit("room-state", room.gameState);
          }
        }
      }
    });
  });
  return io;
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  initializeSocketIO(server);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}
startServer().catch(console.error);
