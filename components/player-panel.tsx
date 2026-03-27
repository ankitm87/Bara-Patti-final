import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlayerState, Seat, TURN_TIME_SECONDS } from "@/lib/game-engine";
import { PlayingCard } from "./playing-card";
import { CountdownTimer } from "./countdown-timer";
import { Avatar } from "./avatar";

interface PlayerPanelProps {
  player: PlayerState | undefined;
  isActive: boolean;
  isDealer: boolean;
  hasTrio: boolean;
  position: "top" | "left" | "right" | "bottom";
  mySeat: Seat;
  onTimerComplete?: () => void;
  showTimer: boolean;
}

const SEAT_COLORS = ["#4ADE80", "#60A5FA", "#FB923C", "#F472B6"];

export function PlayerPanel({
  player,
  isActive,
  isDealer,
  hasTrio,
  position,
  mySeat,
  onTimerComplete,
  showTimer,
}: PlayerPanelProps) {
  if (!player) return <View style={styles.emptySlot} />;

  const cardCount = player.hand.length;
  const isMe = player.seat === mySeat;
  const playerNameDisplay = player.name?.split("@")[0] || "Player";
  const displayName = isMe ? "You" : playerNameDisplay;
  const initials = player.name?.charAt(0).toUpperCase() || "?";
  const seatColor = SEAT_COLORS[player.seat];

  const isHorizontal = position === "top" || position === "bottom";

  return (
    <View
      style={[
        styles.panel,
        isHorizontal ? styles.panelHorizontal : styles.panelVertical,
      ]}
    >
      {/* Avatar + Info */}
      <View style={styles.infoSection}>
        <Avatar
          name={player.name}
          size="medium"
          isActive={isActive}
          hasTrio={hasTrio}
          seatColor={seatColor}
          showDealer={isDealer}
          showCrown={hasTrio}
        />
        <View style={styles.nameSection}>
          <Text style={[styles.name, isActive && { color: "#FFD700" }, hasTrio && { color: "#FFD700" }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.tricksRow}>
            <Text style={styles.tricksLabel}>Hands:</Text>
            <Text style={[styles.tricksValue, { color: seatColor }]}>{player.handsWon}</Text>
          </View>
        </View>
      </View>

      {/* Timer (only for active non-bottom player) */}
      {showTimer && isActive && position !== "bottom" && (
        <CountdownTimer
          seconds={TURN_TIME_SECONDS}
          size={30}
          strokeWidth={2.5}
          onComplete={onTimerComplete}
        />
      )}

      {/* Face-down cards for opponents */}
      {!isMe && cardCount > 0 && (
        <View style={[styles.cardFan, isHorizontal ? styles.cardFanH : styles.cardFanV]}>
          {Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
            <View
              key={i}
              style={[
                isHorizontal
                  ? { marginLeft: i > 0 ? -16 : 0 }
                  : { marginTop: i > 0 ? -32 : 0 },
              ]}
            >
              <PlayingCard card={null} faceDown size="tiny" />
            </View>
          ))}
          {cardCount > 5 && (
            <Text style={styles.moreCards}>+{cardCount - 5}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    gap: 4,
  },
  panelHorizontal: {
    flexDirection: "column",
    alignItems: "center",
  },
  panelVertical: {
    flexDirection: "column",
    alignItems: "center",
  },
  emptySlot: {
    width: 60,
    height: 60,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D3B0FCC",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  nameSection: {
    maxWidth: 100,
  },
  name: {
    color: "#E8F5E9",
    fontSize: 15,
    fontWeight: "700",
  },
  tricksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tricksLabel: {
    color: "#81C784",
    fontSize: 11,
    fontWeight: "500",
  },
  tricksValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardFan: {
    alignItems: "center",
  },
  cardFanH: {
    flexDirection: "row",
    marginTop: 2,
  },
  cardFanV: {
    flexDirection: "column",
    marginTop: 2,
  },
  moreCards: {
    color: "#81C784",
    fontSize: 9,
    fontWeight: "600",
    marginLeft: 2,
  },
});
