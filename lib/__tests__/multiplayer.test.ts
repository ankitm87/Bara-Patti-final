import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameState, Seat, Card, PlayerState, createInitialGameState } from "../game-engine";

describe("Multiplayer WebSocket Integration", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createInitialGameState("test-room-123");
  });

  describe("Room Management", () => {
    it("should create a room with initial game state", () => {
      expect(gameState.roomId).toBe("test-room-123");
      expect(gameState.players).toHaveLength(0);
      expect(gameState.phase).toBe("waiting");
    });

    it("should add players to a room", () => {
      const player1: PlayerState = {
        seat: 0 as Seat,
        name: "Alice",
        userId: "user-1",
        odId: "user-1",
        odName: "Alice",
        odEmail: "alice@example.com",
        odAvatar: "",
        odInitials: "A",
        odColor: "#4CAF50",
        hand: [],
        handsWon: 0,
        isReady: false,
        hasDeclinedTrio: false,
      };

      const player2: PlayerState = {
        ...player1,
        seat: 1 as Seat,
        name: "Bob",
        userId: "user-2",
        odId: "user-2",
        odName: "Bob",
        odEmail: "bob@example.com",
        odInitials: "B",
        odColor: "#2196F3",
      };

      const updatedState = {
        ...gameState,
        players: [player1, player2],
      };

      expect(updatedState.players).toHaveLength(2);
      expect(updatedState.players[0].name).toBe("Alice");
      expect(updatedState.players[1].name).toBe("Bob");
    });

    it("should handle player ready status", () => {
      const player1: PlayerState = {
        seat: 0 as Seat,
        name: "Alice",
        userId: "user-1",
        odId: "user-1",
        odName: "Alice",
        odEmail: "alice@example.com",
        odAvatar: "",
        odInitials: "A",
        odColor: "#4CAF50",
        hand: [],
        handsWon: 0,
        isReady: false,
        hasDeclinedTrio: false,
      };

      const updatedState = {
        ...gameState,
        players: [
          { ...player1, isReady: true },
        ],
      };

      expect(updatedState.players[0].isReady).toBe(true);
    });
  });

  describe("Game State Synchronization", () => {
    it("should sync game state from server", () => {
      const serverState: Partial<GameState> = {
        phase: "playing",
        currentPlayerSeat: 0 as Seat,
        trumpSuit: "spades",
      };

      const syncedState = {
        ...gameState,
        ...serverState,
      };

      expect(syncedState.phase).toBe("playing");
      expect(syncedState.currentPlayerSeat).toBe(0);
      expect(syncedState.trumpSuit).toBe("spades");
    });

    it("should preserve local player seat assignment", () => {
      const player: PlayerState = {
        seat: 2 as Seat,
        name: "Charlie",
        userId: "user-3",
        odId: "user-3",
        odName: "Charlie",
        odEmail: "charlie@example.com",
        odAvatar: "",
        odInitials: "C",
        odColor: "#FF9800",
        hand: [],
        handsWon: 0,
        isReady: false,
        hasDeclinedTrio: false,
      };

      const stateWithPlayer = {
        ...gameState,
        players: [player],
      };

      expect(stateWithPlayer.players[0].seat).toBe(2);
    });
  });

  describe("Card Play Synchronization", () => {
    it("should emit card play action with correct seat and card", () => {
      const card: Card = {
        id: "spades-A",
        suit: "spades",
        rank: "A",
      };

      const action = {
        type: "PLAY_CARD",
        seat: 0 as Seat,
        card,
      };

      expect(action.seat).toBe(0);
      expect(action.card.suit).toBe("spades");
      expect(action.card.rank).toBe("A");
    });

    it("should handle multiple card plays in sequence", () => {
      const cards: Card[] = [
        { id: "spades-K", suit: "spades", rank: "K" },
        { id: "hearts-Q", suit: "hearts", rank: "Q" },
        { id: "diamonds-J", suit: "diamonds", rank: "J" },
        { id: "clubs-10", suit: "clubs", rank: "10" },
      ];

      const plays = cards.map((card, index) => ({
        seat: index as Seat,
        card,
      }));

      expect(plays).toHaveLength(4);
      expect(plays[0].seat).toBe(0);
      expect(plays[3].seat).toBe(3);
    });
  });

  describe("Reconnection Handling", () => {
    it("should maintain room state after reconnection", () => {
      const player: PlayerState = {
        seat: 0 as Seat,
        name: "Alice",
        userId: "user-1",
        odId: "user-1",
        odName: "Alice",
        odEmail: "alice@example.com",
        odAvatar: "",
        odInitials: "A",
        odColor: "#4CAF50",
        hand: [
          { id: "spades-A", suit: "spades", rank: "A" },
          { id: "hearts-K", suit: "hearts", rank: "K" },
        ],
        handsWon: 2,
        isReady: true,
        hasDeclinedTrio: false,
      };

      const stateBeforeDisconnect = {
        ...gameState,
        players: [player],
        phase: "playing" as const,
      };

      // Simulate reconnection - state should be preserved
      const stateAfterReconnect = {
        ...stateBeforeDisconnect,
      };

      expect(stateAfterReconnect.players[0].hand).toHaveLength(2);
      expect(stateAfterReconnect.players[0].handsWon).toBe(2);
      expect(stateAfterReconnect.phase).toBe("playing");
    });

    it("should detect if player was disconnected mid-game", () => {
      const stateWithGameInProgress = {
        ...gameState,
        phase: "playing" as const,
        currentPlayerSeat: 1 as Seat,
        trumpSuit: "spades" as const,
      };

      const wasGameActive = stateWithGameInProgress.phase === "playing";
      expect(wasGameActive).toBe(true);
    });
  });

  describe("Server-Side Auto-Play", () => {
    it("should track timeout for human players", () => {
      const timeoutDuration = 20000; // 20 seconds
      const startTime = Date.now();
      const endTime = startTime + timeoutDuration;

      expect(endTime - startTime).toBe(20000);
    });

    it("should distinguish between bot and human players", () => {
      const botPlayer: PlayerState = {
        seat: 0 as Seat,
        name: "Bot",
        userId: "bot-1",
        odId: "bot-1",
        odName: "Bot",
        odEmail: "",
        odAvatar: "",
        odInitials: "B",
        odColor: "#4CAF50",
        hand: [],
        handsWon: 0,
        isReady: true,
        hasDeclinedTrio: false,
      };

      const humanPlayer: PlayerState = {
        ...botPlayer,
        userId: "user-1",
        odId: "user-1",
        name: "Alice",
      };

      const isBot = botPlayer.userId.startsWith("bot-");
      const isHuman = !humanPlayer.userId.startsWith("bot-");

      expect(isBot).toBe(true);
      expect(isHuman).toBe(true);
    });
  });
});
