import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Suit, getSuitSymbol, getSuitColor } from "@/lib/game-engine";

interface TrumpBannerProps {
  trumpSuit: Suit;
  trickNumber: number;
  totalTricks: number;
}

export function TrumpBanner({ trumpSuit, trickNumber, totalTricks }: TrumpBannerProps) {
  const suitSymbol = getSuitSymbol(trumpSuit);
  const isRed = getSuitColor(trumpSuit) === "red";
  const suitName = trumpSuit.charAt(0).toUpperCase() + trumpSuit.slice(1);

  return (
    <View style={styles.container}>
      <View style={styles.trumpSection}>
        <Text style={styles.trumpLabel}>TRUMP</Text>
        <Text style={[styles.trumpSuit, { color: isRed ? "#EF4444" : "#E8F5E9" }]}>
          {suitSymbol}
        </Text>
        <Text style={[styles.trumpName, { color: isRed ? "#FCA5A5" : "#A5D6A7" }]}>
          {suitName}
        </Text>
      </View>
      <View style={styles.trickSection}>
        <Text style={styles.trickLabel}>Hand</Text>
        <Text style={styles.trickNumber}>
          {trickNumber}/{totalTricks}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#0D3B0FDD",
    borderBottomWidth: 1,
    borderBottomColor: "#2E7D3240",
  },
  trumpSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trumpLabel: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  trumpSuit: {
    fontSize: 20,
    fontWeight: "bold",
  },
  trumpName: {
    fontSize: 13,
    fontWeight: "700",
  },
  trickSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A4D1E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E7D3260",
  },
  trickLabel: {
    color: "#81C784",
    fontSize: 10,
    fontWeight: "600",
  },
  trickNumber: {
    color: "#E8F5E9",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
