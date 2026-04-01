import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGame } from "@/lib/game-context";
import { Seat, PlayerState } from "@/lib/game-engine";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { useSocket } from "@/hooks/use-socket";
import { useRoomPolling } from "@/hooks/use-room-polling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

const SEAT_COLORS = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63"];

interface PlayerSlotProps {
  player?: PlayerState;
  label: string;
  color: string;
}

export default function LobbyScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [isReady, setIsReady] = useState(false);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const hasNavigated = useRef(false);
  const previousPlayerCountRef = useRef(0);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  const socket = useSocket(apiUrl);
  const roomState = useRoomPolling(roomId, 1000); // Poll every 1 second
  
  // Move mutations to component level (fix hook error)
  const createRoomMutation = trpc.room.create.useMutation();
  const joinRoomMutation = trpc.room.join.useMutation();

  // Initialize room with current player and sync with server
  useEffect(() => {
    if (!roomId || !user) return;

    // If room not created yet, create it
    if (state.roomId !== roomId) {
      dispatch({ type: "CREATE_ROOM", roomId });
    }

    // Load player name from AsyncStorage (for web app users)
    AsyncStorage.getItem("playerName").then((savedName) => {
      const playerName = savedName || user?.name || user?.email?.split("@")[0] || "Player";
      const playerData = {
        name: playerName,
        odId: user?.openId || "local-player",
        odName: user?.name || "",
        odEmail: user?.email || "",
        odAvatar: "",
        odInitials: playerName[0].toUpperCase(),
        userId: user?.openId || "local-player",
        hand: [],
        handsWon: 0,
        isReady: false,
        hasDeclinedTrio: false,
      };

      // Check if this is the first player (room creator) or joining player
      const isFirstPlayer = state.players.length === 0;
      if (isFirstPlayer) {
        // First player creates room via HTTP
        createRoomMutation.mutate(
          {
            roomId,
            playerName: user?.openId || "local-player",
            displayName: playerName,
          },
          {
            onSuccess: () => {
              dispatch({
                type: "ADD_PLAYER",
                player: { ...playerData, seat: 0 as Seat, odColor: SEAT_COLORS[0] },
              });
            },
            onError: (error: any) => {
              console.error("Failed to create room:", error);
            },
          }
        );
      } else {
        // Other players join room via HTTP
        const alreadyIn = state.players.find(
          (p) => p.userId === (user?.openId || "local-player")
        );
        if (!alreadyIn && state.players.length < 4) {
          joinRoomMutation.mutate(
            {
              roomId,
              playerName: user?.openId || "local-player",
              displayName: playerName,
            },
            {
              onSuccess: () => {
                dispatch({
                  type: "ADD_PLAYER",
                  player: { ...playerData, seat: state.players.length as Seat, odColor: SEAT_COLORS[state.players.length] },
                });
              },
              onError: (error: any) => {
                console.error("Failed to join room:", error);
              },
            }
          );
        }
      }
    });
  }, [roomId, user]);

  // Listen for room state updates via HTTP polling
  useEffect(() => {
    if (!roomState) return;

    // Check for new players joining
    const newPlayerCount = roomState.players.length;
    if (newPlayerCount > previousPlayerCountRef.current) {
      // Find the new player
      const newPlayer = roomState.players.find((p) => {
        const alreadyIn = state.players.find((existing) => existing.name === p.displayName);
        return !alreadyIn;
      });
      if (newPlayer) {
        setJoinNotification(`${newPlayer.displayName} joined the game!`);
        setTimeout(() => setJoinNotification(null), 3000);
      }
    }
    previousPlayerCountRef.current = newPlayerCount;
  }, [roomState, state.players]);

  // Listen for game state updates from server (keep WebSocket for game state)
  useEffect(() => {
    if (!roomId) return;
    return socket.onGameState((serverState) => {
      // When game starts on server, navigate to game screen
      if (serverState.phase === "dealing" || serverState.phase === "trump_reveal") {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        dispatch({ type: "START_DEALING" });
        setTimeout(() => {
          router.replace(`/game/${roomId}` as any);
        }, 150);
      }
    });
  }, [roomId, socket]);


  const mySeat = state.players.find(
    (p) => p.userId === (user?.openId || "local-player")
  )?.seat;
  const isRoomCreator = mySeat === 0;

  const handleReady = () => {
    if (mySeat !== undefined) {
      const newReady = !isReady;
      dispatch({ type: "SET_PLAYER_READY", seat: mySeat, isReady: newReady });
      setIsReady(newReady);
      
      // Emit ready status via WebSocket if connected
      if (socket?.isConnected && roomId && mySeat !== undefined) {
        socket.setReady(roomId, mySeat, newReady);
      }
    }
  };

  const handleFillAI = () => {
    const botNames = ["Amma", "Chachu", "Maasi"];
    const currentCount = state.players.length;
    let botIdx = 0;
    for (let i = currentCount; i < 4; i++) {
      dispatch({
        type: "ADD_PLAYER",
        player: {
          seat: i as Seat,
          name: botNames[botIdx] || `Bot ${i}`,
          odId: `bot-${i}`,
          odName: botNames[botIdx] || `Bot ${i}`,
          odEmail: "",
          odAvatar: "",
          odInitials: (botNames[botIdx] || `B${i}`)[0],
          odColor: SEAT_COLORS[i],
          userId: `bot-${i}`,
          hand: [],
          handsWon: 0,
          isReady: true,
          hasDeclinedTrio: false,
        },
      });
      botIdx++;
    }
  };

  // Compute ready state
  const playerCount = state.players.length;
  const readyCount = state.players.filter((p) => p.isReady).length;
  const allReady = playerCount === 4 && readyCount === 4;

  // Navigate to game when all ready
  const startGame = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    dispatch({ type: "START_DEALING" });
    setTimeout(() => {
      router.replace(`/game/${roomId}` as any);
    }, 150);
  };

  // Auto-start when all 4 players are ready
  useEffect(() => {
    if (allReady && !hasNavigated.current) {
      startGame();
    }
  }, [allReady]);

  // Also check after every render in case useEffect missed it
  if (allReady && !hasNavigated.current) {
    // Schedule for next tick to avoid dispatch during render
    setTimeout(() => startGame(), 0);
  }

  const handleShareWhatsApp = () => {
    const message = `Join my Bara Patti game! \u{1F0CF}\n\nRoom Code: ${roomId}\n\nOpen the Bara Patti app and enter this code to join.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl);
  };

  // Manual start button as fallback — only room creator (seat 0) can start
  const handleStartGame = () => {
    if (hasNavigated.current) return;
    if (playerCount < 4) return;
    if (!isRoomCreator) return; // Only room creator can start

    // Mark all players as ready
    state.players.forEach((p) => {
      if (!p.isReady) {
        dispatch({ type: "SET_PLAYER_READY", seat: p.seat, isReady: true });
      }
    });

    startGame();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Join Notification Toast */}
      {joinNotification && (
        <View style={styles.notificationToast}>
          <Text style={styles.notificationText}>{joinNotification}</Text>
        </View>
      )}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            {Platform.OS === "web" ? (
              <Text style={{ fontSize: 24, color: "#A5D6A7" }}>←</Text>
            ) : (
              <MaterialIcons name="arrow-back" size={24} color="#A5D6A7" />
            )}
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Game Lobby</Text>
            <Text style={styles.roomCode}>Room: {roomId}</Text>
          </View>
          <TouchableOpacity
            onPress={handleShareWhatsApp}
            style={styles.shareBtn}
            activeOpacity={0.7}
          >
            {Platform.OS === "web" ? (
              <Text style={{ fontSize: 22, color: "#FFD700" }}>📤</Text>
            ) : (
              <MaterialIcons name="share" size={22} color="#FFD700" />
            )}
          </TouchableOpacity>
        </View>

        {/* Table Layout */}
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            {/* North (top) */}
            <View style={[styles.seatPosition, styles.seatNorth]}>
              <PlayerSlot
                player={state.players.find((p) => p.seat === 2)}
                label="North"
                color={SEAT_COLORS[2]}
              />
            </View>

            {/* West (left) */}
            <View style={[styles.seatPosition, styles.seatWest]}>
              <PlayerSlot
                player={state.players.find((p) => p.seat === 1)}
                label="West"
                color={SEAT_COLORS[1]}
              />
            </View>

            {/* Center */}
            <View style={styles.tableCenter}>
              <Text style={styles.tableCenterText}>{"\u{1F0CF}"}</Text>
              <Text style={styles.tableCenterLabel}>
                {playerCount}/4 Players
              </Text>
              <Text style={styles.tableCenterReady}>
                {readyCount} Ready
              </Text>
            </View>

            {/* East (right) */}
            <View style={[styles.seatPosition, styles.seatEast]}>
              <PlayerSlot
                player={state.players.find((p) => p.seat === 3)}
                label="East"
                color={SEAT_COLORS[3]}
              />
            </View>

            {/* South (bottom - current player) */}
            <View style={[styles.seatPosition, styles.seatSouth]}>
              <PlayerSlot
                player={state.players.find((p) => p.seat === 0)}
                label="You"
                color={SEAT_COLORS[0]}
                isCurrentPlayer
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Fill with AI button */}
          {playerCount < 4 && (
            <TouchableOpacity
              style={styles.fillButton}
              onPress={handleFillAI}
              activeOpacity={0.8}
            >
              <Text style={styles.fillButtonText}>Fill with AI Players</Text>
            </TouchableOpacity>
          )}

          {/* Ready button */}
          {playerCount === 4 && !isReady && (
            <TouchableOpacity
              style={styles.readyButton}
              onPress={handleReady}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="radio-button-unchecked"
                size={22}
                color="#FFD700"
              />
              <Text style={styles.readyButtonText}>Tap when Ready</Text>
            </TouchableOpacity>
          )}

          {/* Already ready, waiting for others */}
          {isReady && !allReady && (
            <View style={styles.waitingRow}>
              <MaterialIcons name="check-circle" size={20} color="#4ADE80" />
              <Text style={styles.waitingText}>You are ready. Waiting for others...</Text>
            </View>
          )}

          {/* Start Game button — visible only to room creator when 4 players and user is ready */}
          {playerCount === 4 && isReady && !allReady && isRoomCreator && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartGame}
              activeOpacity={0.8}
            >
              <MaterialIcons name="play-arrow" size={22} color="#0D3B0F" />
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          )}

          {/* Message for non-creators waiting for room creator to start */}
          {playerCount === 4 && isReady && !allReady && !isRoomCreator && (
            <View style={styles.waitingRow}>
              <MaterialIcons name="hourglass-empty" size={18} color="#FFD700" />
              <Text style={styles.waitingText}>Waiting for room creator to start...</Text>
            </View>
          )}

          {/* When all are ready and navigating */}
          {allReady && (
            <View style={styles.startingRow}>
              <MaterialIcons name="hourglass-top" size={18} color="#FFD700" />
              <Text style={styles.startingText}>Starting game...</Text>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

function PlayerSlot({
  player,
  label,
  color,
  isCurrentPlayer = false,
}: {
  player?: PlayerState;
  label: string;
  color: string;
  isCurrentPlayer?: boolean;
}) {
  if (!player) {
    return (
      <View style={styles.slotEmpty}>
        <View style={[styles.slotAvatar, { borderColor: "#2E7D32" }]}>
          <MaterialIcons name="person-add" size={20} color="#2E7D32" />
        </View>
        <Text style={styles.slotEmptyText}>Waiting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.slot}>
      <View
        style={[
          styles.slotAvatar,
          {
            backgroundColor: color,
            borderColor: player.isReady ? "#FFD700" : color,
          },
        ]}
      >
        <Text style={styles.slotAvatarText}>{player.odInitials}</Text>
      </View>
      <Text style={styles.slotName} numberOfLines={1}>
        {isCurrentPlayer ? "You" : player.name}
      </Text>
      {player.isReady && (
        <MaterialIcons name="check-circle" size={14} color="#FFD700" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  roomCode: {
    fontSize: 13,
    color: "#FFD700",
    fontWeight: "600",
  },
  shareBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  table: {
    width: 280,
    height: 320,
    position: "relative",
  },
  seatPosition: {
    position: "absolute",
    alignItems: "center",
  },
  seatNorth: {
    top: 0,
    left: "50%",
    marginLeft: -40,
  },
  seatSouth: {
    bottom: 0,
    left: "50%",
    marginLeft: -40,
  },
  seatWest: {
    top: "50%",
    left: 0,
    marginTop: -30,
  },
  seatEast: {
    top: "50%",
    right: 0,
    marginTop: -30,
  },
  tableCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -36,
    marginLeft: -44,
    width: 88,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#163318",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  tableCenterText: {
    fontSize: 22,
  },
  tableCenterLabel: {
    fontSize: 11,
    color: "#A5D6A7",
    fontWeight: "600",
  },
  tableCenterReady: {
    fontSize: 10,
    color: "#FFD700",
    fontWeight: "600",
  },
  slot: {
    alignItems: "center",
    gap: 4,
    width: 80,
  },
  slotEmpty: {
    alignItems: "center",
    gap: 4,
    width: 80,
    opacity: 0.5,
  },
  slotAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "#163318",
  },
  slotAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  slotName: {
    color: "#E8F5E9",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  slotEmptyText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "500",
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  readyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#1A4D1E",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  readyButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFD700",
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#1A4D1E",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#4ADE80",
  },
  waitingText: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "600",
  },
  fillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#163318",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2E7D3280",
  },
  fillButtonText: {
    color: "#A5D6A7",
    fontSize: 14,
    fontWeight: "600",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4ADE80",
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D3B0F",
  },
  startingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  startingText: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "700",
  },
  notificationToast: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#4ADE80",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  notificationText: {
    color: "#0D3B0F",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
