import { createContext, useContext, ReactNode, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useGame } from "./game-context";
import { GameState, Seat, Card, Trio, PlayerState } from "./game-engine";
import { useAuth } from "@/hooks/use-auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MultiplayerContextType {
  isMultiplayer: boolean;
  isConnected: boolean;
  roomId: string | null;
  currentSeat: Seat | null;
  syncGameState: (state: GameState) => void;
  emitPlayCard: (card: Card) => void;
  emitDeclareTrio: (trio: Trio) => void;
  emitSetReady: (isReady: boolean) => void;
  emitStartGame: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface MultiplayerProviderProps {
  children: ReactNode;
  roomId?: string;
  isMultiplayer?: boolean;
}

export function MultiplayerProvider({
  children,
  roomId,
  isMultiplayer = false,
}: MultiplayerProviderProps) {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const socketHook = useSocket(process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000");
  const currentSeatRef = useRef<Seat | null>(null);
  const isInitializedRef = useRef(false);

  // ─── Initialize Multiplayer Connection ────────────────────────────────────

  useEffect(() => {
    if (!isMultiplayer || !roomId || !socketHook.socket || isInitializedRef.current) return;

    isInitializedRef.current = true;

    const initializeConnection = async () => {
      const playerName = user?.name || user?.email?.split("@")[0] || "Player";
      const playerAvatar = ""; // Avatar not available from user object

      if (state.players.length === 0) {
        // Create room if we're the first player
        const result = await socketHook.createRoom(roomId, {
          name: playerName,
          avatar: playerAvatar,
        });

        if (result.success) {
          currentSeatRef.current = 0 as Seat;
        }
      } else {
        // Join existing room
        const result = await socketHook.joinRoom(roomId, {
          name: playerName,
          avatar: playerAvatar,
        });

        if (result.success && result.seat !== undefined) {
          currentSeatRef.current = result.seat;
        }
      }
    };

    initializeConnection();

    // Listen for room state updates
    const unsubscribeRoom = socketHook.onRoomState((newState: GameState) => {
      dispatch({ type: "UPDATE_GAME_STATE", state: newState });
    });

    // Listen for game state updates
    const unsubscribeGame = socketHook.onGameState((newState: GameState) => {
      dispatch({ type: "UPDATE_GAME_STATE", state: newState });
    });

    return () => {
      unsubscribeRoom();
      unsubscribeGame();
      socketHook.leaveRoom(roomId);
    };
  }, [isMultiplayer, roomId, socketHook.socket]);

  // ─── Emit Actions to Server ──────────────────────────────────────────────

  const emitPlayCard = useCallback(
    (card: Card) => {
      if (!isMultiplayer || !roomId || currentSeatRef.current === null) return;
      socketHook.playCard(roomId, currentSeatRef.current, card);
    },
    [isMultiplayer, roomId, socketHook]
  );

  const emitDeclareTrio = useCallback(
    (trio: Trio) => {
      if (!isMultiplayer || !roomId || currentSeatRef.current === null) return;
      socketHook.declareTrio(roomId, currentSeatRef.current, trio);
    },
    [isMultiplayer, roomId, socketHook]
  );

  const emitSetReady = useCallback(
    (isReady: boolean) => {
      if (!isMultiplayer || !roomId || currentSeatRef.current === null) return;
      socketHook.setReady(roomId, currentSeatRef.current, isReady);
    },
    [isMultiplayer, roomId, socketHook]
  );

  const emitStartGame = useCallback(() => {
    if (!isMultiplayer || !roomId) return;
    socketHook.startGame(roomId);
  }, [isMultiplayer, roomId, socketHook]);

  const syncGameState = useCallback((gameState: GameState) => {
    // This is called when local state changes in non-multiplayer mode
    // In multiplayer mode, state updates come from the server
  }, []);

  const value: MultiplayerContextType = {
    isMultiplayer,
    isConnected: socketHook.isConnected,
    roomId: roomId || null,
    currentSeat: currentSeatRef.current,
    syncGameState,
    emitPlayCard,
    emitDeclareTrio,
    emitSetReady,
    emitStartGame,
  };

  return (
    <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error("useMultiplayer must be used within a MultiplayerProvider");
  }
  return context;
}
