import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card as CardType, getSuitSymbol, getSuitColor } from "@/lib/game-engine";

interface PlayingCardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: "small" | "medium" | "large";
  highlighted?: boolean;
  dimmed?: boolean;
}

const SIZES = {
  small: { width: 36, height: 50, fontSize: 10, suitSize: 12 },
  medium: { width: 56, height: 78, fontSize: 14, suitSize: 18 },
  large: { width: 70, height: 98, fontSize: 18, suitSize: 24 },
};

export function PlayingCard({
  card,
  faceDown = false,
  size = "medium",
  highlighted = false,
  dimmed = false,
}: PlayingCardProps) {
  const dims = SIZES[size];
  const suitSymbol = card ? getSuitSymbol(card.suit) : "";
  const color = card ? (getSuitColor(card.suit) === "red" ? "#E53935" : "#212121") : "#000";

  if (faceDown || !card) {
    return (
      <View
        style={[
          styles.card,
          {
            width: dims.width,
            height: dims.height,
            backgroundColor: "#1B5E20",
            borderColor: highlighted ? "#FFD700" : "#2E7D32",
            borderWidth: highlighted ? 2 : 1,
            opacity: dimmed ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.cardBack}>
          <Text style={[styles.cardBackPattern, { fontSize: dims.suitSize }]}>♠</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          width: dims.width,
          height: dims.height,
          backgroundColor: "#FFFFFF",
          borderColor: highlighted ? "#FFD700" : "#D0D0D0",
          borderWidth: highlighted ? 2 : 1,
          opacity: dimmed ? 0.5 : 1,
        },
      ]}
    >
      {/* Top-left rank and suit */}
      <View style={styles.cornerTop}>
        <Text style={[styles.rankText, { fontSize: dims.fontSize, color }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitText, { fontSize: dims.fontSize * 0.8, color }]}>
          {suitSymbol}
        </Text>
      </View>

      {/* Center suit */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { fontSize: dims.suitSize, color }]}>
          {suitSymbol}
        </Text>
      </View>

      {/* Bottom-right rank and suit (inverted) */}
      <View style={styles.cornerBottom}>
        <Text style={[styles.suitText, { fontSize: dims.fontSize * 0.8, color }]}>
          {suitSymbol}
        </Text>
        <Text style={[styles.rankText, { fontSize: dims.fontSize, color }]}>
          {card.rank}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  cardBack: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B5E20",
  },
  cardBackPattern: {
    color: "#2E7D32",
    opacity: 0.5,
  },
  cornerTop: {
    position: "absolute",
    top: 3,
    left: 4,
    alignItems: "center",
  },
  cornerBottom: {
    position: "absolute",
    bottom: 3,
    right: 4,
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerSuit: {
    fontWeight: "bold",
  },
  rankText: {
    fontWeight: "bold",
    lineHeight: 18,
  },
  suitText: {
    lineHeight: 16,
  },
});
