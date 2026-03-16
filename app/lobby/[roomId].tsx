import React, { useState, useEffect, useCallback } from "react";
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

const SEAT_LABELS = ["South", "West", "North", "East"];
const SEAT_COLORS = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63"];

export default function LobbyScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const { state, dispatch } = useGame();
  const [isReady, setIsReady] = useState(false);

  // Initialize room with current player
  useEffect(() => {
    if (!roomId) return;

    // If room not created yet, create it
    if (state.roomId !== roomId) {
      dispatch({ type: "CREATE_ROOM", roomId });
    }

    // Add current player if not already in
    const alreadyIn = state.players.find(
      (p) => p.userId === (user?.openId || "local-player")
    );
    if (!alreadyIn) {
      const seat = state.players.length as Seat;
      dispatch({
        type: "ADD_PLAYER",
        player: {
          seat,
          name: user?.name || user?.email?.split("@")[0] || "Player 1",
          odId: user?.openId || "local-player",
          odName: user?.name || "",
          odEmail: user?.email || "",
          odAvatar: "",
          odInitials: (user?.name || user?.email || "P")[0].toUpperCase(),
          odColor: SEAT_COLORS[seat],
          userId: user?.openId || "local-player",
          hand: [],
          handsWon: 0,
          isReady: false,
          hasDeclinedTrio: false,
        },
      });
    }
  }, [roomId, user]);

  const handleReady = () => {
    const mySeat = state.players.find(
      (p) => p.userId === (user?.openId || "local-player")
    )?.seat;
    if (mySeat !== undefined) {
      dispatch({ type: "SET_PLAYER_READY", seat: mySeat, isReady: !isReady });
      setIsReady(!isReady);
    }
  };

  const handleFillAI = () => {
    const currentCount = state.players.length;
    for (let i = currentCount; i < 4; i++) {
      dispatch({
        type: "ADD_PLAYER",
        player: {
          seat: i as Seat,
          name: `Bot ${i}`,
          odId: `bot-${i}`,
          odName: `Bot ${i}`,
          odEmail: "",
          odAvatar: "",
          odInitials: `B${i}`,
          odColor: SEAT_COLORS[i],
          userId: `bot-${i}`,
          hand: [],
          handsWon: 0,
          isReady: true,
          hasDeclinedTrio: false,
        },
      });
    }
  };

  const handleStartGame = () => {
    dispatch({ type: "START_DEALING" });
    router.replace(`/game/${roomId}` as any);
  };

  const allReady = state.players.length === 4 && state.players.every((p) => p.isReady);

  const handleShareWhatsApp = () => {
    const message = `Join my Bara Patti game! 🃏\n\nRoom Code: ${roomId}\n\nOpen the Bara Patti app and enter this code to join.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#A5D6A7" />
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
            <MaterialIcons name="share" size={22} color="#FFD700" />
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
              <Text style={styles.tableCenterText}>🃏</Text>
              <Text style={styles.tableCenterLabel}>
                {state.players.length}/4 Players
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
          <TouchableOpacity
            style={[styles.readyButton, isReady && styles.readyButtonActive]}
            onPress={handleReady}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={isReady ? "check-circle" : "radio-button-unchecked"}
              size={22}
              color={isReady ? "#0D3B0F" : "#FFD700"}
            />
            <Text
              style={[
                styles.readyButtonText,
                isReady && styles.readyButtonTextActive,
              ]}
            >
              {isReady ? "Ready!" : "Tap when Ready"}
            </Text>
          </TouchableOpacity>

          {state.players.length < 4 && (
            <TouchableOpacity
              style={styles.fillButton}
              onPress={handleFillAI}
              activeOpacity={0.7}
            >
              <MaterialIcons name="smart-toy" size={18} color="#A5D6A7" />
              <Text style={styles.fillButtonText}>Fill with Bots</Text>
            </TouchableOpacity>
          )}

          {allReady && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartGame}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>Start Game</Text>
              <MaterialIcons name="play-arrow" size={24} color="#0D3B0F" />
            </TouchableOpacity>
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
    marginTop: -30,
    marginLeft: -40,
    width: 80,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#163318",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  tableCenterText: {
    fontSize: 24,
  },
  tableCenterLabel: {
    fontSize: 11,
    color: "#A5D6A7",
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
    paddingBottom: 20,
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
  readyButtonActive: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  readyButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFD700",
  },
  readyButtonTextActive: {
    color: "#0D3B0F",
  },
  fillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
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
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D3B0F",
  },
});
