/**
 * Bot Training System
 *
 * Tracks bot decision-making and learns from outcomes to improve play over time.
 * Uses pattern recognition to identify successful card plays in similar game states.
 */

import { Card, Suit, Rank, Trick } from "./game-engine";

/**
 * Represents a game state snapshot for learning
 */
export interface GameStateSnapshot {
  trumpSuit: Suit | null;
  myHand: Card[];
  currentTrick: { seat: number; card: Card }[];
  completedTricksCount: number;
  cardsPlayedByOpponents: Card[];
  isFirstTrick: boolean;
}

/**
 * A recorded bot move and its outcome
 */
export interface BotMoveRecord {
  stateHash: string;
  cardPlayed: Card;
  outcome: "won_trick" | "lost_trick" | "neutral";
  timestamp: number;
  successRate: number; // Percentage of times this move won the trick
}

/**
 * Learning data for a specific game state pattern
 */
export interface StatePattern {
  stateHash: string;
  moves: Map<string, BotMoveRecord>; // cardId -> move record
  totalOutcomes: number;
  successfulOutcomes: number;
}

/**
 * Bot training data storage
 */
export interface BotTrainingData {
  botId: string;
  patterns: Map<string, StatePattern>;
  totalGamesPlayed: number;
  totalTricksWon: number;
  lastUpdated: number;
}

/**
 * Create a hash of the game state for pattern matching
 * Simplified to focus on: trump suit, hand composition, trick cards
 */
export function hashGameState(snapshot: GameStateSnapshot): string {
  const handSignature = snapshot.myHand
    .map((c) => `${c.rank}${c.suit[0]}`)
    .sort()
    .join(",");

  const trickSignature = snapshot.currentTrick
    .map((c) => `${c.card.rank}${c.card.suit[0]}`)
    .join(",");

  const opponentSignature = snapshot.cardsPlayedByOpponents
    .slice(-8) // Last 8 cards played by opponents
    .map((c) => `${c.rank}${c.suit[0]}`)
    .join(",");

  return `${snapshot.trumpSuit || "none"}|${handSignature}|${trickSignature}|${opponentSignature}`;
}

/**
 * Initialize bot training data
 */
export function initializeBotTraining(botId: string): BotTrainingData {
  return {
    botId,
    patterns: new Map(),
    totalGamesPlayed: 0,
    totalTricksWon: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Record a bot move and its outcome
 */
export function recordBotMove(
  training: BotTrainingData,
  stateHash: string,
  cardPlayed: Card,
  outcome: "won_trick" | "lost_trick" | "neutral"
): void {
  let pattern = training.patterns.get(stateHash);
  if (!pattern) {
    pattern = {
      stateHash,
      moves: new Map(),
      totalOutcomes: 0,
      successfulOutcomes: 0,
    };
    training.patterns.set(stateHash, pattern);
  }

  const moveKey = cardPlayed.id;
  let moveRecord = pattern.moves.get(moveKey);

  if (!moveRecord) {
    moveRecord = {
      stateHash,
      cardPlayed,
      outcome,
      timestamp: Date.now(),
      successRate: outcome === "won_trick" ? 100 : 0,
    };
  } else {
    // Update success rate incrementally
    const totalMoves = pattern.totalOutcomes + 1;
    const successfulMoves = pattern.successfulOutcomes + (outcome === "won_trick" ? 1 : 0);
    moveRecord.successRate = (successfulMoves / totalMoves) * 100;
  }

  pattern.moves.set(moveKey, moveRecord);
  pattern.totalOutcomes++;
  if (outcome === "won_trick") {
    pattern.successfulOutcomes++;
  }

  training.totalTricksWon += outcome === "won_trick" ? 1 : 0;
  training.lastUpdated = Date.now();
}

/**
 * Get the best moves for a game state based on learned patterns
 * Returns cards sorted by success rate (highest first)
 */
export function getBestLearnedMoves(
  training: BotTrainingData,
  stateHash: string,
  validCards: Card[]
): Card[] {
  const pattern = training.patterns.get(stateHash);
  if (!pattern || pattern.moves.size === 0) {
    // No learned patterns - return valid cards in random order
    return validCards.sort(() => Math.random() - 0.5);
  }

  // Score each valid card based on learned success rate
  const scoredCards = validCards
    .map((card) => {
      const moveRecord = pattern.moves.get(card.id);
      const score = moveRecord ? moveRecord.successRate : 0;
      return { card, score };
    })
    .sort((a, b) => b.score - a.score);

  return scoredCards.map((sc) => sc.card);
}

/**
 * Get bot statistics
 */
export function getBotStats(training: BotTrainingData): {
  winRate: number;
  patternsLearned: number;
  gamesPlayed: number;
} {
  return {
    winRate: training.totalGamesPlayed > 0 ? (training.totalTricksWon / (training.totalGamesPlayed * 12)) * 100 : 0,
    patternsLearned: training.patterns.size,
    gamesPlayed: training.totalGamesPlayed,
  };
}

/**
 * Export training data as JSON for persistence
 */
export function exportTrainingData(training: BotTrainingData): string {
  const serializable = {
    botId: training.botId,
    patterns: Array.from(training.patterns.entries()).map(([hash, pattern]) => ({
      stateHash: hash,
      moves: Array.from(pattern.moves.entries()).map(([cardId, record]) => ({
        cardId,
        ...record,
      })),
      totalOutcomes: pattern.totalOutcomes,
      successfulOutcomes: pattern.successfulOutcomes,
    })),
    totalGamesPlayed: training.totalGamesPlayed,
    totalTricksWon: training.totalTricksWon,
    lastUpdated: training.lastUpdated,
  };

  return JSON.stringify(serializable);
}

/**
 * Import training data from JSON
 */
export function importTrainingData(botId: string, jsonData: string): BotTrainingData {
  try {
    const data = JSON.parse(jsonData);
    const training = initializeBotTraining(botId);

    training.totalGamesPlayed = data.totalGamesPlayed || 0;
    training.totalTricksWon = data.totalTricksWon || 0;
    training.lastUpdated = data.lastUpdated || Date.now();

    data.patterns?.forEach((patternData: any) => {
      const pattern: StatePattern = {
        stateHash: patternData.stateHash,
        moves: new Map(),
        totalOutcomes: patternData.totalOutcomes,
        successfulOutcomes: patternData.successfulOutcomes,
      };

      patternData.moves?.forEach((moveData: any) => {
        const moveRecord: BotMoveRecord = {
          stateHash: moveData.stateHash,
          cardPlayed: moveData.cardPlayed,
          outcome: moveData.outcome,
          timestamp: moveData.timestamp,
          successRate: moveData.successRate,
        };
        pattern.moves.set(moveData.cardId, moveRecord);
      });

      training.patterns.set(patternData.stateHash, pattern);
    });

    return training;
  } catch (error) {
    console.error("Failed to import training data:", error);
    return initializeBotTraining(botId);
  }
}
