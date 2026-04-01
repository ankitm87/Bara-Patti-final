import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface RoomState {
  roomId: string;
  players: Array<{
    playerName: string;
    displayName: string;
    seat: number;
  }>;
  status: "waiting" | "playing" | "finished";
  createdAt?: Date;
}

export function useRoomPolling(roomId: string | undefined, pollInterval = 1000) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [previousPlayerCount, setPreviousPlayerCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = trpc.useContext();

  const pollRoomState = useCallback(async () => {
    if (!roomId) return;
    try {
      const state = await queryClient.client.query("room.getState", { roomId });
      setRoomState(state as RoomState);

      // Check for new players
      if ((state as any).players?.length > previousPlayerCount) {
        setPreviousPlayerCount((state as any).players.length);
      }
    } catch (error) {
      console.error("Failed to poll room state:", error);
    }
  }, [roomId, queryClient, previousPlayerCount]);

  useEffect(() => {
    if (!roomId) return;

    // Poll immediately
    pollRoomState();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      pollRoomState();
    }, pollInterval) as any;

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [roomId, pollInterval, pollRoomState]);

  return roomState;
}
