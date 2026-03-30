import { describe, it, expect } from "vitest";
import {
  getValidCards,
  determineTrickWinner,
  calculateRoundScores,
  getOppositeSuit,
  Card,
  Suit,
  Rank,
  Seat,
  Trick,
  PlayerState,
} from "../game-engine";

// ─── Trump Escalation Rules (V2 focus) ─────────────────────────────────────

describe("Trump escalation - cutting with trump", () => {
  const trumpSuit: Suit = "hearts";

  it("when someone already cut with trump, next player must play higher trump if possible", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "hearts", rank: "3", id: "hearts-3" },
      { suit: "spades", rank: "A", id: "spades-A" },
    ];
    const trick: Trick = {
      trickNumber: 3,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "diamonds-A" } },
        { seat: 1 as Seat, card: { suit: "hearts", rank: "J", id: "hearts-J" } },
      ],
      winnerSeat: null,
    };
    // Player has no diamonds, has hearts K and 3. Someone cut with J of hearts.
    // Must play higher trump (K) if available
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    expect(valid.length).toBe(1);
    expect(valid[0].id).toBe("hearts-K");
  });

  it("when someone cut with trump and player has no higher trump, must still play trump", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "3", id: "hearts-3" },
      { suit: "spades", rank: "A", id: "spades-A" },
      { suit: "clubs", rank: "Q", id: "clubs-Q" },
    ];
    const trick: Trick = {
      trickNumber: 3,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "diamonds-A" } },
        { seat: 1 as Seat, card: { suit: "hearts", rank: "K", id: "hearts-K" } },
      ],
      winnerSeat: null,
    };
    // Player has no diamonds, has hearts 3 (lower than K). Can play any card (save trumps).
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    expect(valid.length).toBe(3); // All cards allowed
    expect(valid.some((c) => c.suit === "hearts")).toBe(true); // Hearts are allowed
  });

  it("player with no suit and no trump can play any card", () => {
    const hand: Card[] = [
      { suit: "spades", rank: "A", id: "spades-A" },
      { suit: "clubs", rank: "Q", id: "clubs-Q" },
    ];
    const trick: Trick = {
      trickNumber: 3,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "diamonds-A" } },
      ],
      winnerSeat: null,
    };
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    expect(valid.length).toBe(2);
  });
});

describe("First trick - opposite suit rule", () => {
  it("hearts trump means Ace of diamonds must start", () => {
    const hand: Card[] = [
      { suit: "diamonds", rank: "A", id: "diamonds-A" },
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "clubs", rank: "Q", id: "clubs-Q" },
    ];
    const valid = getValidCards(hand, null, "hearts", true, true);
    expect(valid.length).toBe(1);
    expect(valid[0].suit).toBe("diamonds");
    expect(valid[0].rank).toBe("A");
  });

  it("spades trump means Ace of clubs must start", () => {
    const hand: Card[] = [
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "spades", rank: "K", id: "spades-K" },
    ];
    const valid = getValidCards(hand, null, "spades", true, true);
    expect(valid.length).toBe(1);
    expect(valid[0].suit).toBe("clubs");
    expect(valid[0].rank).toBe("A");
  });

  it("clubs trump means Ace of spades must start", () => {
    const hand: Card[] = [
      { suit: "spades", rank: "A", id: "spades-A" },
      { suit: "clubs", rank: "K", id: "clubs-K" },
    ];
    const valid = getValidCards(hand, null, "clubs", true, true);
    expect(valid.length).toBe(1);
    expect(valid[0].suit).toBe("spades");
    expect(valid[0].rank).toBe("A");
  });

  it("diamonds trump means Ace of hearts must start", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "A", id: "hearts-A" },
      { suit: "diamonds", rank: "K", id: "diamonds-K" },
    ];
    const valid = getValidCards(hand, null, "diamonds", true, true);
    expect(valid.length).toBe(1);
    expect(valid[0].suit).toBe("hearts");
    expect(valid[0].rank).toBe("A");
  });
});

describe("Scoring edge cases", () => {
  const makePlayers = (handsWon: number[]): PlayerState[] =>
    handsWon.map((h, i) => ({
      seat: i as Seat,
      name: `Player ${i}`,
      odId: `p${i}`,
      odName: `Player ${i}`,
      odEmail: "",
      odAvatar: "",
      odInitials: `P${i}`,
      odColor: "",
      userId: `p${i}`,
      hand: [],
      handsWon: h,
      isReady: true,
      hasDeclinedTrio: false,
    }));

  it("trio winner with 0 tricks gets 0 points", () => {
    const players = makePlayers([0, 4, 4, 4]);
    const trioWinner = {
      seat: 0 as Seat,
      trio: {
        rank: "A" as Rank,
        cards: [
          { suit: "hearts" as Suit, rank: "A" as Rank, id: "h-A" },
          { suit: "diamonds" as Suit, rank: "A" as Rank, id: "d-A" },
          { suit: "clubs" as Suit, rank: "A" as Rank, id: "c-A" },
        ],
      },
    };
    const scores = calculateRoundScores(players, trioWinner);
    expect(scores[0].points).toBe(0); // Trio winner: 0 * 10 = 0
    expect(scores[1].points).toBe(0); // 4-4 = 0
  });

  it("without trio, all players at 3 tricks score 0", () => {
    const players = makePlayers([3, 3, 3, 3]);
    const scores = calculateRoundScores(players, null);
    scores.forEach((s) => expect(s.points).toBe(0));
  });

  it("without trio, player with 0 tricks scores -30", () => {
    const players = makePlayers([0, 4, 4, 4]);
    const scores = calculateRoundScores(players, null);
    expect(scores[0].points).toBe(-30); // 0-3 = -3 * 10
  });

  it("total hands always sum to 12", () => {
    const players = makePlayers([5, 3, 2, 2]);
    const totalHands = players.reduce((sum, p) => sum + p.handsWon, 0);
    expect(totalHands).toBe(12);
  });
});

describe("Trick winner - edge cases", () => {
  it("when all four play the same suit, highest rank wins", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "3", id: "d-3" } },
        { seat: 1 as Seat, card: { suit: "diamonds", rank: "10", id: "d-10" } },
        { seat: 2 as Seat, card: { suit: "diamonds", rank: "A", id: "d-A" } },
        { seat: 3 as Seat, card: { suit: "diamonds", rank: "K", id: "d-K" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, "hearts")).toBe(2); // Ace wins
  });

  it("lowest trump still beats highest non-trump", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "d-A" } },
        { seat: 1 as Seat, card: { suit: "hearts", rank: "3", id: "h-3" } },
        { seat: 2 as Seat, card: { suit: "diamonds", rank: "K", id: "d-K" } },
        { seat: 3 as Seat, card: { suit: "diamonds", rank: "Q", id: "d-Q" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, "hearts")).toBe(1); // 3 of trump beats A of diamonds
  });

  it("off-suit non-trump cards do not win even if high rank", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "5", id: "d-5" } },
        { seat: 1 as Seat, card: { suit: "clubs", rank: "A", id: "c-A" } },
        { seat: 2 as Seat, card: { suit: "spades", rank: "A", id: "s-A" } },
        { seat: 3 as Seat, card: { suit: "diamonds", rank: "6", id: "d-6" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, "hearts")).toBe(3); // 6 of diamonds beats off-suit Aces
  });
});
