import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  leaderboard: router({
    /** Get aggregated leaderboard, optionally filtered by group */
    getLeaderboard: publicProcedure
      .input(z.object({ groupName: z.string().optional() }).optional())
      .query(({ input }) => {
        return db.getLeaderboard(input?.groupName);
      }),

    /** Get list of all group names */
    getGroups: publicProcedure.query(() => {
      return db.getGroupNames();
    }),

    /** Get recent game sessions with scores */
    getRecentGames: publicProcedure
      .input(z.object({ groupName: z.string().optional(), limit: z.number().optional() }).optional())
      .query(({ input }) => {
        return db.getRecentGames(input?.groupName, input?.limit);
      }),

    /** Save a completed round */
    saveRound: publicProcedure
      .input(z.object({
        roomId: z.string(),
        groupName: z.string().default("Default"),
        roundNumber: z.number(),
        trumpSuit: z.string().optional(),
        hasTrio: z.boolean().default(false),
        scores: z.array(z.object({
          playerName: z.string(),
          seat: z.number(),
          handsWon: z.number(),
          points: z.number(),
          hadTrio: z.boolean().default(false),
        })),
      }))
      .mutation(async ({ input }) => {
        const sessionId = await db.createGameSession({
          roomId: input.roomId,
          groupName: input.groupName,
          roundNumber: input.roundNumber,
          trumpSuit: input.trumpSuit,
          hasTrio: input.hasTrio,
        });

        await db.saveGameScores(
          input.scores.map((s) => ({
            sessionId,
            playerName: s.playerName,
            seat: s.seat,
            handsWon: s.handsWon,
            points: s.points,
            hadTrio: s.hadTrio,
            groupName: input.groupName,
          }))
        );

        return { sessionId };
      }),
  }),
});

export type AppRouter = typeof appRouter;
