/**
 * Tests for the Quick Play flow - verifies that the game state
 * is correctly set up when starting a quick game with bots.
 */

import { describe, it, expect } from "vitest";
import {
  createInitialGameState,
  startNewRound,
  PlayerState,
  Seat,
  getValidCards,
  findTrios,
  getStartingPlayer,
  determineTrickWinner,
  TURN_TIME_SECONDS,
  REVEAL_TIME_SECONDS,
  TRIO_TIME_SECONDS,
} from "../game-engine";

describe("Quick Play Flow", () => {
  function setupQuickPlay() {
    // Simulate what the Quick Play button does
    let state = createInitialGameState("QP-TEST");
    state.phase = "waiting";

    // Add human player at seat 0
    const players: PlayerState[] = [
      {
        seat: 0,
        name: "You",
        odId: "local-player",
        odName: "You",
        odEmail: "",
        odAvatar: "",
        odInitials: "Y",
        odColor: "#4CAF50",
        userId: "local-player",
        hand: [],
        handsWon: 0,
        isReady: true,
        hasDeclinedTrio: false,
      },
      {
        seat: 1,
        name: "Amma",
        odId: "bot-1",
        odName: "Amma",
        odEmail: "",
        odAvatar: "",
        odInitials: "A",
        odColor: "#2196F3",
        userId: "bot-1",
        hand: [],
        handsWon: 0,
        isReady: true,
        hasDeclinedTrio: false,
      },
      {
        seat: 2,
        name: "Chachu",
        odId: "bot-2",
        odName: "Chachu",
        odEmail: "",
        odAvatar: "",
        odInitials: "C",
        odColor: "#FF9800",
        userId: "bot-2",
        hand: [],
        handsWon: 0,
        isReady: true,
        hasDeclinedTrio: false,
      },
      {
        seat: 3,
        name: "Maasi",
        odId: "bot-3",
        odName: "Maasi",
        odEmail: "",
        odAvatar: "",
        odInitials: "M",
        odColor: "#E91E63",
        userId: "bot-3",
        hand: [],
        handsWon: 0,
        isReady: true,
        hasDeclinedTrio: false,
      },
    ];

    state.players = players;
    return state;
  }

  it("should create a game with 4 players", () => {
    const state = setupQuickPlay();
    expect(state.players.length).toBe(4);
    expect(state.players[0].name).toBe("You");
    expect(state.players[0].userId).toBe("local-player");
    expect(state.players[1].userId).toBe("bot-1");
    expect(state.players[2].userId).toBe("bot-2");
    expect(state.players[3].userId).toBe("bot-3");
  });

  it("should deal 12 cards to each player after startNewRound", () => {
    const state = setupQuickPlay();
    const dealt = startNewRound(state);
    expect(dealt.players[0].hand.length).toBe(12);
    expect(dealt.players[1].hand.length).toBe(12);
    expect(dealt.players[2].hand.length).toBe(12);
    expect(dealt.players[3].hand.length).toBe(12);
  });

  it("should set trump card and suit after dealing", () => {
    const state = setupQuickPlay();
    const dealt = startNewRound(state);
    expect(dealt.trumpCard).not.toBeNull();
    expect(dealt.trumpSuit).not.toBeNull();
    expect(["hearts", "diamonds", "clubs", "spades"]).toContain(dealt.trumpSuit);
  });

  it("should have all players ready", () => {
    const state = setupQuickPlay();
    expect(state.players.every((p) => p.isReady)).toBe(true);
  });

  it("bots should be identifiable by userId prefix", () => {
    const state = setupQuickPlay();
    const bots = state.players.filter((p) => p.userId.startsWith("bot-"));
    expect(bots.length).toBe(3);
    const human = state.players.filter((p) => !p.userId.startsWith("bot-"));
    expect(human.length).toBe(1);
  });

  it("should have valid cards for each player after dealing", () => {
    const state = setupQuickPlay();
    const dealt = startNewRound(state);
    const startingSeat = getStartingPlayer(dealt.dealerSeat);

    // The starting player should have valid cards
    const startingPlayer = dealt.players.find((p) => p.seat === startingSeat)!;
    const validCards = getValidCards(
      startingPlayer.hand,
      null,
      dealt.trumpSuit!,
      true,
      true
    );
    // First card of first trick must be Ace of opposite suit
    expect(validCards.length).toBeGreaterThanOrEqual(1);
  });

  it("trio detection should work on dealt hands", () => {
    const state = setupQuickPlay();
    const dealt = startNewRound(state);
    // Just verify findTrios doesn't crash on each hand
    dealt.players.forEach((p) => {
      const trios = findTrios(p.hand);
      expect(Array.isArray(trios)).toBe(true);
    });
  });

  it("should have correct timing constants", () => {
    expect(TURN_TIME_SECONDS).toBe(20);
    expect(REVEAL_TIME_SECONDS).toBe(20);
    expect(TRIO_TIME_SECONDS).toBe(20);
  });
});
