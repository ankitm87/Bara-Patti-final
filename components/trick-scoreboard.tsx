import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlayerState, Seat } from "@/lib/game-engine";

interface TrickScoreboardProps {
  players: PlayerState[];
  currentPlayerSeat: Seat;
  mySeat: Seat;
}

const SEAT_COLORS = ["#4ADE80", "#60A5FA", "#FB923C", "#F472B6"];

export function TrickScoreboard({ players, currentPlayerSeat, mySeat }: TrickScoreboardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tricks</Text>
      {players.map((player) => (
        <View
          key={player.seat}
          style={[
            styles.row,
            currentPlayerSeat === player.seat && styles.activeRow,
          ]}
        >
          <View style={[styles.indicator, { backgroundColor: SEAT_COLORS[player.seat] }]} />
          <Text style={styles.name} numberOfLines={1}>
            {player.seat === mySeat ? "You" : player.name}
          </Text>
          <Text style={[styles.count, { color: SEAT_COLORS[player.seat] }]}>
            {player.handsWon}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0D3B0F99",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 110,
  },
  title: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  activeRow: {
    backgroundColor: "#FFD70015",
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    flex: 1,
    color: "#C8E6C9",
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 60,
  },
  count: {
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    minWidth: 16,
    textAlign: "right",
  },
});
