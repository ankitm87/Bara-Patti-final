import { describe, it, expect } from "vitest";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  findTrios,
  getWinningTrio,
  getValidCards,
  determineTrickWinner,
  calculateRoundScores,
  getOppositeSuit,
  getSuitSymbol,
  getSuitColor,
  generateRoomCode,
  getCardDisplay,
  compareRanks,
  rotateDealer,
  getStartingPlayer,
  createInitialGameState,
  startNewRound,
  Card,
  Suit,
  Rank,
  Seat,
  Trick,
  Trio,
  PlayerState,
  SUITS,
  RANKS,
  RANK_ORDER,
  TOTAL_CARDS,
  CARDS_PER_PLAYER,
} from "../game-engine";

// ─── Deck Operations ─────────────────────────────────────────────────────────

describe("createDeck", () => {
  it("creates a 48-card deck without 2s", () => {
    const deck = createDeck();
    expect(deck.length).toBe(48);
  });

  it("has no 2s in the deck - only ranks 3 through A", () => {
    const deck = createDeck();
    const validRanks = new Set<string>(RANKS);
    const allValid = deck.every((c) => validRanks.has(c.rank));
    expect(allValid).toBe(true);
    // Verify lowest rank is 3
    expect(RANKS[0]).toBe("3");
  });

  it("has 12 cards per suit", () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      const suitCards = deck.filter((c) => c.suit === suit);
      expect(suitCards.length).toBe(12);
    }
  });

  it("has 4 cards per rank", () => {
    const deck = createDeck();
    for (const rank of RANKS) {
      const rankCards = deck.filter((c) => c.rank === rank);
      expect(rankCards.length).toBe(4);
    }
  });

  it("each card has a unique id", () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(48);
  });
});

describe("shuffleDeck", () => {
  it("returns a deck of the same size", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled.length).toBe(48);
  });

  it("contains the same cards", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const originalIds = new Set(deck.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(shuffledIds).toEqual(originalIds);
  });

  it("does not modify the original deck", () => {
    const deck = createDeck();
    const originalOrder = deck.map((c) => c.id);
    shuffleDeck(deck);
    expect(deck.map((c) => c.id)).toEqual(originalOrder);
  });
});

describe("dealCards", () => {
  it("deals 12 cards to each player", () => {
    const deck = shuffleDeck(createDeck());
    const { hands } = dealCards(deck, 0 as Seat);
    for (const hand of hands) {
      expect(hand.length).toBe(12);
    }
  });

  it("returns a trump card", () => {
    const deck = shuffleDeck(createDeck());
    const { trumpCard } = dealCards(deck, 0 as Seat);
    expect(trumpCard).toBeDefined();
    expect(trumpCard.suit).toBeDefined();
    expect(trumpCard.rank).toBeDefined();
  });

  it("trump card is in the dealer's hand", () => {
    const deck = shuffleDeck(createDeck());
    const dealerSeat = 2 as Seat;
    const { hands, trumpCard } = dealCards(deck, dealerSeat);
    const dealerHand = hands[dealerSeat];
    const hasTrump = dealerHand.some((c) => c.id === trumpCard.id);
    expect(hasTrump).toBe(true);
  });

  it("all 48 cards are distributed", () => {
    const deck = shuffleDeck(createDeck());
    const { hands } = dealCards(deck, 0 as Seat);
    const allCards = hands.flat();
    expect(allCards.length).toBe(48);
    const uniqueIds = new Set(allCards.map((c) => c.id));
    expect(uniqueIds.size).toBe(48);
  });

  it("hands are sorted by suit then rank", () => {
    const deck = shuffleDeck(createDeck());
    const { hands } = dealCards(deck, 0 as Seat);
    for (const hand of hands) {
      for (let i = 1; i < hand.length; i++) {
        const prevSuitIdx = SUITS.indexOf(hand[i - 1].suit);
        const currSuitIdx = SUITS.indexOf(hand[i].suit);
        if (prevSuitIdx === currSuitIdx) {
          expect(RANK_ORDER[hand[i - 1].rank]).toBeLessThanOrEqual(
            RANK_ORDER[hand[i].rank]
          );
        } else {
          expect(prevSuitIdx).toBeLessThanOrEqual(currSuitIdx);
        }
      }
    }
  });
});

// ─── Suit Operations ─────────────────────────────────────────────────────────

describe("getOppositeSuit", () => {
  it("hearts opposite is diamonds", () => {
    expect(getOppositeSuit("hearts")).toBe("diamonds");
  });

  it("diamonds opposite is hearts", () => {
    expect(getOppositeSuit("diamonds")).toBe("hearts");
  });

  it("clubs opposite is spades", () => {
    expect(getOppositeSuit("clubs")).toBe("spades");
  });

  it("spades opposite is clubs", () => {
    expect(getOppositeSuit("spades")).toBe("clubs");
  });
});

describe("getSuitSymbol", () => {
  it("returns correct symbols", () => {
    expect(getSuitSymbol("hearts")).toBe("♥");
    expect(getSuitSymbol("diamonds")).toBe("♦");
    expect(getSuitSymbol("clubs")).toBe("♣");
    expect(getSuitSymbol("spades")).toBe("♠");
  });
});

describe("getSuitColor", () => {
  it("hearts and diamonds are red", () => {
    expect(getSuitColor("hearts")).toBe("red");
    expect(getSuitColor("diamonds")).toBe("red");
  });

  it("clubs and spades are black", () => {
    expect(getSuitColor("clubs")).toBe("black");
    expect(getSuitColor("spades")).toBe("black");
  });
});

// ─── Trio Detection ──────────────────────────────────────────────────────────

describe("findTrios", () => {
  it("finds a trio of 3 same-rank cards", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "A", id: "hearts-A" },
      { suit: "diamonds", rank: "A", id: "diamonds-A" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "spades", rank: "K", id: "spades-K" },
    ];
    const trios = findTrios(hand);
    expect(trios.length).toBe(1);
    expect(trios[0].rank).toBe("A");
    expect(trios[0].cards.length).toBe(3);
  });

  it("returns empty array when no trio exists", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "A", id: "hearts-A" },
      { suit: "diamonds", rank: "K", id: "diamonds-K" },
      { suit: "clubs", rank: "Q", id: "clubs-Q" },
    ];
    const trios = findTrios(hand);
    expect(trios.length).toBe(0);
  });

  it("finds multiple trios", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "A", id: "hearts-A" },
      { suit: "diamonds", rank: "A", id: "diamonds-A" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "diamonds", rank: "K", id: "diamonds-K" },
      { suit: "clubs", rank: "K", id: "clubs-K" },
    ];
    const trios = findTrios(hand);
    expect(trios.length).toBe(2);
  });

  it("handles 4 of a kind as a trio (takes first 3)", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "A", id: "hearts-A" },
      { suit: "diamonds", rank: "A", id: "diamonds-A" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "spades", rank: "A", id: "spades-A" },
    ];
    const trios = findTrios(hand);
    expect(trios.length).toBe(1);
    expect(trios[0].cards.length).toBe(3);
  });
});

describe("getWinningTrio", () => {
  it("returns null for empty declarations", () => {
    expect(getWinningTrio([])).toBeNull();
  });

  it("returns the highest rank trio", () => {
    const declarations = [
      {
        seat: 0 as Seat,
        trio: {
          rank: "K" as Rank,
          cards: [
            { suit: "hearts" as Suit, rank: "K" as Rank, id: "hearts-K" },
            { suit: "diamonds" as Suit, rank: "K" as Rank, id: "diamonds-K" },
            { suit: "clubs" as Suit, rank: "K" as Rank, id: "clubs-K" },
          ],
        },
      },
      {
        seat: 2 as Seat,
        trio: {
          rank: "A" as Rank,
          cards: [
            { suit: "hearts" as Suit, rank: "A" as Rank, id: "hearts-A" },
            { suit: "diamonds" as Suit, rank: "A" as Rank, id: "diamonds-A" },
            { suit: "clubs" as Suit, rank: "A" as Rank, id: "clubs-A" },
          ],
        },
      },
    ];
    const winner = getWinningTrio(declarations);
    expect(winner).not.toBeNull();
    expect(winner!.seat).toBe(2);
    expect(winner!.trio.rank).toBe("A");
  });
});

// ─── Card Play Validation ────────────────────────────────────────────────────

describe("getValidCards", () => {
  const trumpSuit: Suit = "hearts";

  it("first trick first card must be Ace of opposite suit", () => {
    const hand: Card[] = [
      { suit: "diamonds", rank: "A", id: "diamonds-A" },
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "clubs", rank: "Q", id: "clubs-Q" },
    ];
    const valid = getValidCards(hand, null, trumpSuit, true, true);
    expect(valid.length).toBe(1);
    expect(valid[0].id).toBe("diamonds-A");
  });

  it("must follow suit when possible", () => {
    const hand: Card[] = [
      { suit: "diamonds", rank: "K", id: "diamonds-K" },
      { suit: "diamonds", rank: "Q", id: "diamonds-Q" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
    ];
    const trick: Trick = {
      trickNumber: 2,
      leadSeat: 1 as Seat,
      cards: [
        {
          seat: 1 as Seat,
          card: { suit: "diamonds", rank: "J", id: "diamonds-J" },
        },
      ],
      winnerSeat: null,
    };
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    expect(valid.length).toBe(2);
    expect(valid.every((c) => c.suit === "diamonds")).toBe(true);
  });

  it("must cut with trump when cannot follow suit and has trump", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "spades", rank: "Q", id: "spades-Q" },
    ];
    const trick: Trick = {
      trickNumber: 2,
      leadSeat: 1 as Seat,
      cards: [
        {
          seat: 1 as Seat,
          card: { suit: "diamonds", rank: "J", id: "diamonds-J" },
        },
      ],
      winnerSeat: null,
    };
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    // Must play trump (hearts K) - compulsory cut
    expect(valid.length).toBe(1);
    expect(valid[0].suit).toBe("hearts");
  });

  it("can play any card when cannot follow suit and has NO trump", () => {
    const hand: Card[] = [
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "spades", rank: "Q", id: "spades-Q" },
      { suit: "clubs", rank: "3", id: "clubs-3" },
    ];
    const trick: Trick = {
      trickNumber: 2,
      leadSeat: 1 as Seat,
      cards: [
        {
          seat: 1 as Seat,
          card: { suit: "diamonds", rank: "J", id: "diamonds-J" },
        },
      ],
      winnerSeat: null,
    };
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    // No diamonds, no hearts (trump) - can play anything
    expect(valid.length).toBe(3);
  });

  it("must play higher trump when trump is led and player has higher trump", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "hearts", rank: "3", id: "hearts-3" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
    ];
    const trick: Trick = {
      trickNumber: 2,
      leadSeat: 1 as Seat,
      cards: [
        {
          seat: 1 as Seat,
          card: { suit: "hearts", rank: "J", id: "hearts-J" },
        },
      ],
      winnerSeat: null,
    };
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    // Must play higher trump (K of hearts), not lower (3 of hearts)
    expect(valid.length).toBe(1);
    expect(valid[0].id).toBe("hearts-K");
  });

  it("can play any trump when has trump but no higher trump than lead", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "3", id: "hearts-3" },
      { suit: "hearts", rank: "4", id: "hearts-4" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
    ];
    const trick: Trick = {
      trickNumber: 2,
      leadSeat: 1 as Seat,
      cards: [
        {
          seat: 1 as Seat,
          card: { suit: "hearts", rank: "A", id: "hearts-A" },
        },
      ],
      winnerSeat: null,
    };
    const valid = getValidCards(hand, trick, trumpSuit, false, false);
    // Has hearts but no higher than A, so can play any heart
    expect(valid.length).toBe(2);
    expect(valid.every((c) => c.suit === "hearts")).toBe(true);
  });

  it("leading a new trick allows any card", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "K", id: "hearts-K" },
      { suit: "clubs", rank: "A", id: "clubs-A" },
      { suit: "diamonds", rank: "Q", id: "diamonds-Q" },
    ];
    const valid = getValidCards(hand, null, trumpSuit, false, true);
    expect(valid.length).toBe(3);
  });
});

// ─── Trick Resolution ────────────────────────────────────────────────────────

describe("determineTrickWinner", () => {
  const trumpSuit: Suit = "hearts";

  it("highest of lead suit wins when no trump played", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "d-A" } },
        { seat: 1 as Seat, card: { suit: "diamonds", rank: "K", id: "d-K" } },
        { seat: 2 as Seat, card: { suit: "diamonds", rank: "Q", id: "d-Q" } },
        { seat: 3 as Seat, card: { suit: "clubs", rank: "A", id: "c-A" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, trumpSuit)).toBe(0);
  });

  it("trump beats non-trump", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "d-A" } },
        { seat: 1 as Seat, card: { suit: "hearts", rank: "3", id: "h-3" } },
        { seat: 2 as Seat, card: { suit: "diamonds", rank: "K", id: "d-K" } },
        { seat: 3 as Seat, card: { suit: "clubs", rank: "A", id: "c-A" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, trumpSuit)).toBe(1);
  });

  it("highest trump wins when multiple trumps played", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "diamonds", rank: "A", id: "d-A" } },
        { seat: 1 as Seat, card: { suit: "hearts", rank: "3", id: "h-3" } },
        { seat: 2 as Seat, card: { suit: "hearts", rank: "K", id: "h-K" } },
        { seat: 3 as Seat, card: { suit: "clubs", rank: "A", id: "c-A" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, trumpSuit)).toBe(2);
  });

  it("when trump is led, highest trump wins", () => {
    const trick: Trick = {
      trickNumber: 1,
      leadSeat: 0 as Seat,
      cards: [
        { seat: 0 as Seat, card: { suit: "hearts", rank: "J", id: "h-J" } },
        { seat: 1 as Seat, card: { suit: "hearts", rank: "A", id: "h-A" } },
        { seat: 2 as Seat, card: { suit: "hearts", rank: "K", id: "h-K" } },
        { seat: 3 as Seat, card: { suit: "hearts", rank: "Q", id: "h-Q" } },
      ],
      winnerSeat: null,
    };
    expect(determineTrickWinner(trick, trumpSuit)).toBe(1);
  });
});

// ─── Scoring ─────────────────────────────────────────────────────────────────

describe("calculateRoundScores", () => {
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

  it("without trio: 3 hands required, scores relative to 3", () => {
    const players = makePlayers([5, 3, 2, 2]);
    const scores = calculateRoundScores(players, null);
    expect(scores[0].points).toBe(20); // 5-3 = +2 * 10
    expect(scores[1].points).toBe(0); // 3-3 = 0
    expect(scores[2].points).toBe(-10); // 2-3 = -1 * 10
    expect(scores[3].points).toBe(-10); // 2-3 = -1 * 10
  });

  it("with trio: trio winner gets all hands as bonus, others need 4", () => {
    const players = makePlayers([5, 4, 2, 1]);
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
    expect(scores[0].points).toBe(50); // Trio winner: 5 * 10 = +50
    expect(scores[1].points).toBe(0); // 4-4 = 0
    expect(scores[2].points).toBe(-20); // 2-4 = -2 * 10
    expect(scores[3].points).toBe(-30); // 1-4 = -3 * 10
  });
});

// ─── Utility Functions ───────────────────────────────────────────────────────

describe("generateRoomCode", () => {
  it("generates a 6-character code", () => {
    const code = generateRoomCode();
    expect(code.length).toBe(6);
  });

  it("contains only valid characters", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("generates different codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));
    // With 31^6 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

describe("rotateDealer", () => {
  it("rotates from 0 to 1", () => {
    expect(rotateDealer(0 as Seat)).toBe(1);
  });

  it("rotates from 3 back to 0", () => {
    expect(rotateDealer(3 as Seat)).toBe(0);
  });
});

describe("getStartingPlayer", () => {
  it("starting player is left of dealer", () => {
    expect(getStartingPlayer(0 as Seat)).toBe(1);
    expect(getStartingPlayer(3 as Seat)).toBe(0);
  });
});

describe("compareRanks", () => {
  it("Ace is higher than King", () => {
    expect(compareRanks("A", "K")).toBeGreaterThan(0);
  });

  it("3 is the lowest", () => {
    expect(compareRanks("3", "4")).toBeLessThan(0);
  });
});

describe("createInitialGameState", () => {
  it("creates a valid initial state", () => {
    const state = createInitialGameState("TEST123");
    expect(state.roomId).toBe("TEST123");
    expect(state.phase).toBe("waiting");
    expect(state.players.length).toBe(0);
    expect(state.roundNumber).toBe(0);
  });
});
