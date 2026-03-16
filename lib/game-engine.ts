/**
 * Bara Patti Game Engine
 *
 * Core game logic for the traditional Indian 4-player trick-taking card game.
 * - 48 cards (standard 52-card deck minus all 2s)
 * - Trump determined by last card dealt to dealer
 * - Trio rules: 3 cards of same rank = winning trio
 * - Opposite suit starting rule
 * - Trump escalation: must play higher trump when trump is active
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "hearts-A"
}

export type Seat = 0 | 1 | 2 | 3;

export interface PlayerState {
  seat: Seat;
  name: string;
  odId: string;
  odName: string;
  odEmail: string;
  odAvatar: string;
  odInitials: string;
  odColor: string;
  userId: string;
  hand: Card[];
  handsWon: number;
  isReady: boolean;
  hasDeclinedTrio: boolean;
}

export interface Trick {
  trickNumber: number;
  leadSeat: Seat;
  cards: { seat: Seat; card: Card }[];
  winnerSeat: Seat | null;
}

export interface Trio {
  rank: Rank;
  cards: Card[];
}

export type GamePhase =
  | "waiting"       // Waiting for players
  | "dealing"       // Cards being dealt
  | "trump_reveal"  // Trump card revealed, 20s countdown
  | "trio_check"    // Players can declare trio, 20s countdown
  | "playing"       // Active gameplay
  | "round_end"     // Round finished, showing scores
  | "game_end";     // Game over

export interface GameState {
  roomId: string;
  phase: GamePhase;
  dealerSeat: Seat;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  players: PlayerState[];
  currentTrick: Trick | null;
  completedTricks: Trick[];
  currentPlayerSeat: Seat;
  roundNumber: number;
  winningTrio: { seat: Seat; trio: Trio } | null;
  scores: Record<string, number>; // userId -> cumulative score
  turnStartTime: number | null;
  phaseStartTime: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const RANK_ORDER: Record<Rank, number> = {
  "3": 0, "4": 1, "5": 2, "6": 3, "7": 4, "8": 5,
  "9": 6, "10": 7, "J": 8, "Q": 9, "K": 10, "A": 11,
};
export const TURN_TIME_SECONDS = 20;
export const REVEAL_TIME_SECONDS = 20;
export const TRIO_TIME_SECONDS = 20;
export const CARDS_PER_PLAYER = 12;
export const TOTAL_CARDS = 48;
export const HANDS_REQUIRED_WITH_TRIO = 4;
export const HANDS_REQUIRED_NO_TRIO = 3;
export const POINTS_PER_HAND = 10;

// ─── Suit Relationships ──────────────────────────────────────────────────────

/** Get the opposite suit (hearts↔diamonds, clubs↔spades) */
export function getOppositeSuit(suit: Suit): Suit {
  const opposites: Record<Suit, Suit> = {
    hearts: "diamonds",
    diamonds: "hearts",
    clubs: "spades",
    spades: "clubs",
  };
  return opposites[suit];
}

/** Get suit color */
export function getSuitColor(suit: Suit): "red" | "black" {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}

/** Get suit symbol */
export function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  return symbols[suit];
}

// ─── Deck Operations ─────────────────────────────────────────────────────────

/** Create a 48-card deck (no 2s) */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Deal cards to 4 players, one at a time. Returns [hands, trumpCard] */
export function dealCards(
  deck: Card[],
  dealerSeat: Seat
): { hands: Card[][]; trumpCard: Card } {
  const hands: Card[][] = [[], [], [], []];
  let currentSeat = ((dealerSeat + 1) % 4) as Seat;

  // Deal one by one, 48 cards total, 12 each
  for (let i = 0; i < deck.length; i++) {
    hands[currentSeat].push(deck[i]);
    currentSeat = ((currentSeat + 1) % 4) as Seat;
  }

  // Last card dealt goes to dealer - that's the trump
  const trumpCard = hands[dealerSeat][hands[dealerSeat].length - 1];

  // Sort each hand by suit then rank
  for (const hand of hands) {
    hand.sort((a, b) => {
      const suitDiff = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    });
  }

  return { hands, trumpCard };
}

// ─── Trio Detection ──────────────────────────────────────────────────────────

/** Find all trios (3 cards of same rank) in a hand */
export function findTrios(hand: Card[]): Trio[] {
  const rankGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  }

  const trios: Trio[] = [];
  for (const [rank, cards] of Object.entries(rankGroups)) {
    if (cards.length >= 3) {
      // Take the first 3 cards of this rank
      trios.push({ rank: rank as Rank, cards: cards.slice(0, 3) });
    }
  }

  return trios;
}

/** Determine the winning trio among all declared trios (highest rank wins) */
export function getWinningTrio(
  declarations: { seat: Seat; trio: Trio }[]
): { seat: Seat; trio: Trio } | null {
  if (declarations.length === 0) return null;

  return declarations.reduce((best, current) => {
    if (RANK_ORDER[current.trio.rank] > RANK_ORDER[best.trio.rank]) {
      return current;
    }
    return best;
  });
}

// ─── Card Play Validation ────────────────────────────────────────────────────

/** Get valid cards a player can play given the current trick state */
export function getValidCards(
  hand: Card[],
  currentTrick: Trick | null,
  trumpSuit: Suit,
  isFirstTrick: boolean,
  isFirstCard: boolean
): Card[] {
  // First card of the entire game: must be Ace of opposite suit of trump
  if (isFirstTrick && isFirstCard) {
    const oppSuit = getOppositeSuit(trumpSuit);
    const aceOfOpp = hand.find((c) => c.rank === "A" && c.suit === oppSuit);
    if (aceOfOpp) return [aceOfOpp];
    // If player doesn't have it, this shouldn't happen in correct dealing
    // but fallback to any card
    return hand;
  }

  // Leading a new trick: can play any card
  if (!currentTrick || currentTrick.cards.length === 0) {
    return hand;
  }

  const leadCard = currentTrick.cards[0].card;
  const leadSuit = leadCard.suit;

  // Check if trump has been played in this trick
  const trumpPlayedInTrick = currentTrick.cards.some(
    (c) => c.card.suit === trumpSuit && leadSuit !== trumpSuit
  );

  // Must follow suit
  const sameSuitCards = hand.filter((c) => c.suit === leadSuit);
  if (sameSuitCards.length > 0) {
    // If lead suit is trump, must play higher trump if possible
    if (leadSuit === trumpSuit) {
      const highestTrumpInTrick = getHighestTrumpInTrick(currentTrick, trumpSuit);
      const higherTrumps = sameSuitCards.filter(
        (c) => RANK_ORDER[c.rank] > RANK_ORDER[highestTrumpInTrick!.rank]
      );
      if (higherTrumps.length > 0) return higherTrumps;
    }
    return sameSuitCards;
  }

  // Cannot follow suit — MUST cut with trump if you have trump cards
  const trumpCards = hand.filter((c) => c.suit === trumpSuit);

  if (trumpCards.length > 0) {
    // Player has trump — must play trump (compulsory cut)
    if (trumpPlayedInTrick) {
      // Someone already cut with trump — must play HIGHER trump if possible
      const highestTrumpInTrick = getHighestTrumpInTrick(currentTrick, trumpSuit);
      if (highestTrumpInTrick) {
        const higherTrumps = trumpCards.filter(
          (c) => RANK_ORDER[c.rank] > RANK_ORDER[highestTrumpInTrick.rank]
        );
        if (higherTrumps.length > 0) return higherTrumps;
      }
      // Has trump but no higher trump — must still play a trump card
      return trumpCards;
    }
    // No trump played yet — must cut with any trump
    return trumpCards;
  }

  // No trump cards either — can play any card
  return hand;
}

/** Get the highest trump card played in the current trick */
function getHighestTrumpInTrick(trick: Trick, trumpSuit: Suit): Card | null {
  const trumpCards = trick.cards
    .filter((c) => c.card.suit === trumpSuit)
    .map((c) => c.card);

  if (trumpCards.length === 0) return null;

  return trumpCards.reduce((highest, card) =>
    RANK_ORDER[card.rank] > RANK_ORDER[highest.rank] ? card : highest
  );
}

// ─── Trick Resolution ────────────────────────────────────────────────────────

/** Determine the winner of a completed trick */
export function determineTrickWinner(trick: Trick, trumpSuit: Suit): Seat {
  const leadSuit = trick.cards[0].card.suit;

  // Check if any trump was played (when lead suit is not trump)
  const trumpPlays = trick.cards.filter(
    (c) => c.card.suit === trumpSuit && leadSuit !== trumpSuit
  );

  if (trumpPlays.length > 0) {
    // Highest trump wins
    const winner = trumpPlays.reduce((best, current) =>
      RANK_ORDER[current.card.rank] > RANK_ORDER[best.card.rank] ? current : best
    );
    return winner.seat;
  }

  // If lead suit is trump, highest trump wins
  if (leadSuit === trumpSuit) {
    const winner = trick.cards.reduce((best, current) =>
      current.card.suit === trumpSuit &&
      RANK_ORDER[current.card.rank] > RANK_ORDER[best.card.rank]
        ? current
        : best
    );
    return winner.seat;
  }

  // No trump played - highest of lead suit wins
  const followSuitPlays = trick.cards.filter((c) => c.card.suit === leadSuit);
  const winner = followSuitPlays.reduce((best, current) =>
    RANK_ORDER[current.card.rank] > RANK_ORDER[best.card.rank] ? current : best
  );
  return winner.seat;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/** Calculate points for each player at end of round */
export function calculateRoundScores(
  players: PlayerState[],
  winningTrio: { seat: Seat; trio: Trio } | null
): { seat: Seat; handsWon: number; points: number }[] {
  const handsRequired = winningTrio ? HANDS_REQUIRED_WITH_TRIO : HANDS_REQUIRED_NO_TRIO;

  return players.map((player) => {
    let points: number;
    if (winningTrio && player.seat === winningTrio.seat) {
      // Trio winner: everything they make is bonus (+10 per hand)
      points = player.handsWon * POINTS_PER_HAND;
    } else {
      // Regular players: (handsWon - handsRequired) * 10
      points = (player.handsWon - handsRequired) * POINTS_PER_HAND;
    }
    return {
      seat: player.seat,
      handsWon: player.handsWon,
      points,
    };
  });
}

// ─── Game State Management ───────────────────────────────────────────────────

/** Create initial game state */
export function createInitialGameState(roomId: string): GameState {
  return {
    roomId,
    phase: "waiting",
    dealerSeat: 0,
    trumpCard: null,
    trumpSuit: null,
    players: [],
    currentTrick: null,
    completedTricks: [],
    currentPlayerSeat: 1 as Seat, // Left of dealer starts
    roundNumber: 0,
    winningTrio: null,
    scores: {},
    turnStartTime: null,
    phaseStartTime: null,
  };
}

/** Start a new round */
export function startNewRound(state: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  const { hands, trumpCard } = dealCards(deck, state.dealerSeat);

  const updatedPlayers = state.players.map((p, i) => ({
    ...p,
    hand: hands[i],
    handsWon: 0,
    hasDeclinedTrio: false,
  }));

  return {
    ...state,
    phase: "dealing",
    trumpCard,
    trumpSuit: trumpCard.suit,
    players: updatedPlayers,
    currentTrick: null,
    completedTricks: [],
    currentPlayerSeat: ((state.dealerSeat + 1) % 4) as Seat,
    roundNumber: state.roundNumber + 1,
    winningTrio: null,
    phaseStartTime: Date.now(),
  };
}

/** Get the starting player - whoever has the Ace of opposite suit of trump */
export function getStartingPlayer(dealerSeat: Seat, players?: PlayerState[], trumpSuit?: Suit): Seat {
  if (players && trumpSuit) {
    const oppSuit = getOppositeSuit(trumpSuit);
    for (const player of players) {
      if (player.hand.some((c) => c.rank === "A" && c.suit === oppSuit)) {
        return player.seat;
      }
    }
  }
  // Fallback: left of dealer
  return ((dealerSeat + 1) % 4) as Seat;
}

/** Rotate dealer to next player */
export function rotateDealer(currentDealer: Seat): Seat {
  return ((currentDealer + 1) % 4) as Seat;
}

/** Generate a random 6-character room code */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Get card display value */
export function getCardDisplay(card: Card): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`;
}

/** Compare two cards by rank */
export function compareRanks(a: Rank, b: Rank): number {
  return RANK_ORDER[a] - RANK_ORDER[b];
}
