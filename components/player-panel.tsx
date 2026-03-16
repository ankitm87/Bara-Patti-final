import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlayerState, Seat, TURN_TIME_SECONDS } from "@/lib/game-engine";
import { PlayingCard } from "./playing-card";
import { CountdownTimer } from "./countdown-timer";

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
  const displayName = isMe ? "You" : player.name;
  const initials = player.odInitials || player.name[0]?.toUpperCase() || "?";
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
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: seatColor },
              isActive && styles.avatarActive,
              hasTrio && styles.avatarTrio,
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {isDealer && (
            <View style={styles.dealerBadge}>
              <Text style={styles.dealerBadgeText}>D</Text>
            </View>
          )}
          {hasTrio && (
            <View style={styles.crownBadge}>
              <Text style={styles.crownEmoji}>👑</Text>
            </View>
          )}
        </View>
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
    gap: 6,
    backgroundColor: "#0D3B0FCC",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarActive: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarTrio: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dealerBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  dealerBadgeText: {
    color: "#0D3B0F",
    fontSize: 8,
    fontWeight: "900",
  },
  crownBadge: {
    position: "absolute",
    top: -12,
    left: 4,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  crownEmoji: {
    fontSize: 16,
  },
  nameSection: {
    maxWidth: 70,
  },
  name: {
    color: "#E8F5E9",
    fontSize: 11,
    fontWeight: "700",
  },
  tricksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tricksLabel: {
    color: "#81C784",
    fontSize: 9,
    fontWeight: "500",
  },
  tricksValue: {
    fontSize: 11,
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
