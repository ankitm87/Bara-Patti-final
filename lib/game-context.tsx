import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import {
  GameState,
  GamePhase,
  Card,
  Seat,
  Trio,
  Trick,
  PlayerState,
  createInitialGameState,
  startNewRound,
  getValidCards,
  determineTrickWinner,
  calculateRoundScores,
  rotateDealer,
  getStartingPlayer,
  generateRoomCode,
  findTrios,
  getWinningTrio,
  TURN_TIME_SECONDS,
} from "./game-engine";

// ─── Actions ─────────────────────────────────────────────────────────────────

type GameAction =
  | { type: "CREATE_ROOM"; roomId: string }
  | { type: "JOIN_ROOM"; roomId: string }
  | { type: "ADD_PLAYER"; player: PlayerState }
  | { type: "REMOVE_PLAYER"; seat: Seat }
  | { type: "SET_PLAYER_READY"; seat: Seat; isReady: boolean }
  | { type: "START_DEALING" }
  | { type: "FINISH_DEALING" }
  | { type: "SHOW_TRUMP" }
  | { type: "FINISH_TRUMP_REVEAL" }
  | { type: "START_TRIO_CHECK" }
  | { type: "DECLARE_TRIO"; seat: Seat; trio: Trio }
  | { type: "DECLINE_TRIO"; seat: Seat }
  | { type: "FINISH_TRIO_CHECK" }
  | { type: "PLAY_CARD"; seat: Seat; card: Card }
  | { type: "COMPLETE_TRICK" }
  | { type: "END_ROUND" }
  | { type: "NEXT_ROUND" }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_TURN_START_TIME"; time: number }
  | { type: "UPDATE_GAME_STATE"; state: Partial<GameState> }
  | { type: "RESET" };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CREATE_ROOM":
      return { ...createInitialGameState(action.roomId), phase: "waiting" };

    case "JOIN_ROOM":
      return { ...state, roomId: action.roomId };

    case "ADD_PLAYER":
      return {
        ...state,
        players: [...state.players, action.player],
      };

    case "REMOVE_PLAYER":
      return {
        ...state,
        players: state.players.filter((p) => p.seat !== action.seat),
      };

    case "SET_PLAYER_READY":
      return {
        ...state,
        players: state.players.map((p) =>
          p.seat === action.seat ? { ...p, isReady: action.isReady } : p
        ),
      };

    case "START_DEALING": {
      const newState = startNewRound(state);
      return { ...newState, phase: "dealing", phaseStartTime: Date.now() };
    }

    case "FINISH_DEALING":
      return { ...state, phase: "trump_reveal", phaseStartTime: Date.now() };

    case "SHOW_TRUMP":
      return { ...state, phase: "trump_reveal", phaseStartTime: Date.now() };

    case "FINISH_TRUMP_REVEAL":
      return { ...state, phase: "trio_check", phaseStartTime: Date.now() };

    case "START_TRIO_CHECK":
      return { ...state, phase: "trio_check", phaseStartTime: Date.now() };

    case "DECLARE_TRIO": {
      const declarations = state.winningTrio
        ? [{ seat: state.winningTrio.seat, trio: state.winningTrio.trio }, { seat: action.seat, trio: action.trio }]
        : [{ seat: action.seat, trio: action.trio }];
      const winning = getWinningTrio(declarations);
      return {
        ...state,
        winningTrio: winning,
        players: state.players.map((p) =>
          p.seat === action.seat ? { ...p, hasDeclinedTrio: false } : p
        ),
      };
    }

    case "DECLINE_TRIO":
      return {
        ...state,
        players: state.players.map((p) =>
          p.seat === action.seat ? { ...p, hasDeclinedTrio: true } : p
        ),
      };

    case "FINISH_TRIO_CHECK": {
      const startingSeat = getStartingPlayer(state.dealerSeat);
      return {
        ...state,
        phase: "playing",
        currentPlayerSeat: startingSeat,
        currentTrick: {
          trickNumber: 1,
          leadSeat: startingSeat,
          cards: [],
          winnerSeat: null,
        },
        turnStartTime: Date.now(),
      };
    }

    case "PLAY_CARD": {
      if (!state.currentTrick) return state;

      const updatedPlayers = state.players.map((p) =>
        p.seat === action.seat
          ? { ...p, hand: p.hand.filter((c) => c.id !== action.card.id) }
          : p
      );

      const updatedTrick: Trick = {
        ...state.currentTrick,
        cards: [...state.currentTrick.cards, { seat: action.seat, card: action.card }],
      };

      // If trick is complete (4 cards played)
      if (updatedTrick.cards.length === 4) {
        const winnerSeat = determineTrickWinner(updatedTrick, state.trumpSuit!);
        const completedTrick = { ...updatedTrick, winnerSeat };

        const playersWithScore = updatedPlayers.map((p) =>
          p.seat === winnerSeat ? { ...p, handsWon: p.handsWon + 1 } : p
        );

        const isLastTrick = state.completedTricks.length + 1 === 12;

        if (isLastTrick) {
          return {
            ...state,
            players: playersWithScore,
            currentTrick: completedTrick,
            completedTricks: [...state.completedTricks, completedTrick],
            phase: "round_end",
            turnStartTime: null,
          };
        }

        // Start next trick
        return {
          ...state,
          players: playersWithScore,
          currentTrick: {
            trickNumber: state.completedTricks.length + 2,
            leadSeat: winnerSeat,
            cards: [],
            winnerSeat: null,
          },
          completedTricks: [...state.completedTricks, completedTrick],
          currentPlayerSeat: winnerSeat,
          turnStartTime: Date.now(),
        };
      }

      // Move to next player
      const nextSeat = ((action.seat + 1) % 4) as Seat;
      return {
        ...state,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentPlayerSeat: nextSeat,
        turnStartTime: Date.now(),
      };
    }

    case "END_ROUND": {
      const roundScores = calculateRoundScores(state.players, state.winningTrio);
      const updatedScores = { ...state.scores };
      for (const score of roundScores) {
        const player = state.players[score.seat];
        if (player) {
          updatedScores[player.userId] =
            (updatedScores[player.userId] || 0) + score.points;
        }
      }
      return {
        ...state,
        phase: "round_end",
        scores: updatedScores,
      };
    }

    case "NEXT_ROUND":
      return {
        ...state,
        dealerSeat: rotateDealer(state.dealerSeat),
        phase: "waiting",
        winningTrio: null,
        completedTricks: [],
        currentTrick: null,
      };

    case "SET_PHASE":
      return { ...state, phase: action.phase, phaseStartTime: Date.now() };

    case "SET_TURN_START_TIME":
      return { ...state, turnStartTime: action.time };

    case "UPDATE_GAME_STATE":
      return { ...state, ...action.state };

    case "RESET":
      return createInitialGameState("");

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  // Helper methods
  createRoom: () => string;
  getValidCardsForCurrentPlayer: () => Card[];
  playCard: (card: Card) => void;
  declareTrio: (seat: Seat, trio: Trio) => void;
  isMyTurn: (seat: Seat) => boolean;
  canPlayCard: (card: Card, seat: Seat) => boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, createInitialGameState(""));

  const createRoom = useCallback(() => {
    const roomId = generateRoomCode();
    dispatch({ type: "CREATE_ROOM", roomId });
    return roomId;
  }, []);

  const getValidCardsForCurrentPlayer = useCallback(() => {
    const player = state.players.find((p) => p.seat === state.currentPlayerSeat);
    if (!player || !state.trumpSuit) return [];

    const isFirstTrick = state.completedTricks.length === 0;
    const isFirstCard = !state.currentTrick || state.currentTrick.cards.length === 0;

    return getValidCards(
      player.hand,
      state.currentTrick,
      state.trumpSuit,
      isFirstTrick,
      isFirstCard
    );
  }, [state]);

  const playCard = useCallback(
    (card: Card) => {
      dispatch({
        type: "PLAY_CARD",
        seat: state.currentPlayerSeat,
        card,
      });
    },
    [state.currentPlayerSeat]
  );

  const declareTrio = useCallback((seat: Seat, trio: Trio) => {
    dispatch({ type: "DECLARE_TRIO", seat, trio });
  }, []);

  const isMyTurn = useCallback(
    (seat: Seat) => state.phase === "playing" && state.currentPlayerSeat === seat,
    [state.phase, state.currentPlayerSeat]
  );

  const canPlayCard = useCallback(
    (card: Card, seat: Seat) => {
      if (!isMyTurn(seat)) return false;
      const validCards = getValidCardsForCurrentPlayer();
      return validCards.some((c) => c.id === card.id);
    },
    [isMyTurn, getValidCardsForCurrentPlayer]
  );

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        createRoom,
        getValidCardsForCurrentPlayer,
        playCard,
        declareTrio,
        isMyTurn,
        canPlayCard,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
