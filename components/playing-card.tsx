import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card as CardType, getSuitSymbol, getSuitColor } from "@/lib/game-engine";

interface PlayingCardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: "tiny" | "small" | "medium" | "large" | "xlarge";
  highlighted?: boolean;
  dimmed?: boolean;
  winning?: boolean;
}

const SIZES = {
  tiny: { width: 28, height: 40, fontSize: 8, suitSize: 10, cornerGap: 0, borderRadius: 4 },
  small: { width: 38, height: 54, fontSize: 10, suitSize: 13, cornerGap: 1, borderRadius: 5 },
  medium: { width: 52, height: 74, fontSize: 13, suitSize: 18, cornerGap: 2, borderRadius: 6 },
  large: { width: 64, height: 90, fontSize: 16, suitSize: 22, cornerGap: 2, borderRadius: 8 },
  xlarge: { width: 80, height: 112, fontSize: 20, suitSize: 28, cornerGap: 3, borderRadius: 10 },
};

export function PlayingCard({
  card,
  faceDown = false,
  size = "medium",
  highlighted = false,
  dimmed = false,
  winning = false,
}: PlayingCardProps) {
  const dims = SIZES[size];
  const suitSymbol = card ? getSuitSymbol(card.suit) : "";
  const isRed = card ? getSuitColor(card.suit) === "red" : false;
  const color = isRed ? "#DC2626" : "#1E293B";

  if (faceDown || !card) {
    return (
      <View
        style={[
          styles.card,
          {
            width: dims.width,
            height: dims.height,
            borderRadius: dims.borderRadius,
            borderColor: highlighted ? "#FFD700" : "#2E7D3280",
            borderWidth: highlighted ? 2 : 1,
            opacity: dimmed ? 0.4 : 1,
          },
        ]}
      >
        <View style={[styles.cardBack, { borderRadius: dims.borderRadius - 1 }]}>
          <View style={styles.cardBackInner}>
            <View style={[styles.cardBackDiamond, { width: dims.width * 0.5, height: dims.width * 0.5 }]} />
          </View>
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
          borderRadius: dims.borderRadius,
          backgroundColor: "#FFFFFF",
          borderColor: winning ? "#FFD700" : highlighted ? "#FFD700" : "#D4D4D8",
          borderWidth: winning ? 2.5 : highlighted ? 2 : 1,
          opacity: dimmed ? 0.35 : 1,
        },
        winning && styles.winningGlow,
      ]}
    >
      {/* Top-left corner */}
      <View style={[styles.cornerTop, { top: dims.cornerGap + 2, left: dims.cornerGap + 3 }]}>
        <Text
          style={[
            styles.rankText,
            { fontSize: dims.fontSize, color, lineHeight: dims.fontSize * 1.15 },
          ]}
        >
          {card.rank}
        </Text>
        <Text
          style={[
            styles.suitTextSmall,
            { fontSize: dims.fontSize * 0.75, color, lineHeight: dims.fontSize * 0.9 },
          ]}
        >
          {suitSymbol}
        </Text>
      </View>

      {/* Center suit(s) */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { fontSize: dims.suitSize * 1.2, color }]}>
          {suitSymbol}
        </Text>
      </View>

      {/* Bottom-right corner (inverted) */}
      <View style={[styles.cornerBottom, { bottom: dims.cornerGap + 2, right: dims.cornerGap + 3 }]}>
        <Text
          style={[
            styles.rankText,
            { fontSize: dims.fontSize, color, lineHeight: dims.fontSize * 1.15 },
          ]}
        >
          {card.rank}
        </Text>
        <Text
          style={[
            styles.suitTextSmall,
            { fontSize: dims.fontSize * 0.75, color, lineHeight: dims.fontSize * 0.9 },
          ]}
        >
          {suitSymbol}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  winningGlow: {
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  cardBack: {
    flex: 1,
    backgroundColor: "#1B5E20",
    overflow: "hidden",
  },
  cardBackInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B5E20",
    borderWidth: 2,
    borderColor: "#2E7D3260",
    margin: 3,
    borderRadius: 3,
  },
  cardBackDiamond: {
    backgroundColor: "#2E7D3240",
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
  cornerTop: {
    position: "absolute",
    alignItems: "center",
  },
  cornerBottom: {
    position: "absolute",
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
    fontWeight: "800",
  },
  suitTextSmall: {
    fontWeight: "600",
  },
});
