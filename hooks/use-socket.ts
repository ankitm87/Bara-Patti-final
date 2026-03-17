import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { GameState, Seat, Card, Trio } from "@/lib/game-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomId: string | null;
  currentSeat: Seat | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSocket(serverUrl: string) {
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Connect to the server
    const socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("[socket] Connected:", socket.id);
      isConnectedRef.current = true;
    });

    socket.on("disconnect", () => {
      console.log("[socket] Disconnected");
      isConnectedRef.current = false;
    });

    socket.on("connect_error", (error) => {
      console.error("[socket] Connection error:", error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  // ─── Room Management ─────────────────────────────────────────────────────

  const createRoom = useCallback(
    (roomId: string, player: { name: string; avatar: string }) => {
      return new Promise<{ success: boolean; roomId?: string; error?: string }>((resolve) => {
        socketRef.current?.emit("create-room", { roomId, player }, resolve);
      });
    },
    []
  );

  const joinRoom = useCallback(
    (roomId: string, player: { name: string; avatar: string }) => {
      return new Promise<{ success: boolean; seat?: Seat; error?: string }>((resolve) => {
        socketRef.current?.emit("join-room", { roomId, player }, resolve);
      });
    },
    []
  );

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("leave-room", { roomId });
  }, []);

  // ─── Game Actions ────────────────────────────────────────────────────────

  const setReady = useCallback((roomId: string, seat: Seat, isReady: boolean) => {
    socketRef.current?.emit("set-ready", { roomId, seat, isReady });
  }, []);

  const startGame = useCallback((roomId: string) => {
    socketRef.current?.emit("start-game", { roomId });
  }, []);

  const playCard = useCallback((roomId: string, seat: Seat, card: Card) => {
    socketRef.current?.emit("play-card", { roomId, seat, card });
  }, []);

  const declareTrio = useCallback((roomId: string, seat: Seat, trio: Trio) => {
    socketRef.current?.emit("declare-trio", { roomId, seat, trio });
  }, []);

  // ─── Event Listeners ─────────────────────────────────────────────────────

  const onRoomState = useCallback((callback: (state: GameState) => void) => {
    socketRef.current?.on("room-state", callback);
    return () => {
      socketRef.current?.off("room-state", callback);
    };
  }, []);

  const onGameState = useCallback((callback: (state: GameState) => void) => {
    socketRef.current?.on("game-state", callback);
    return () => {
      socketRef.current?.off("game-state", callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    playCard,
    declareTrio,
    onRoomState,
    onGameState,
  };
}
