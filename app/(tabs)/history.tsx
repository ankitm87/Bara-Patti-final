import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

interface GameRecord {
  id: string;
  date: string;
  players: string[];
  myScore: number;
  result: "win" | "loss" | "draw";
}

// Placeholder - will be populated from game history
const EMPTY_HISTORY: GameRecord[] = [];

export default function HistoryScreen() {
  return (
    <ScreenContainer className="p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Game History</Text>
        </View>

        {EMPTY_HISTORY.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🃏</Text>
            <Text style={styles.emptyTitle}>No Games Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your game history will appear here after you play your first round.
            </Text>
          </View>
        ) : (
          <FlatList
            data={EMPTY_HISTORY}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.gameCard}>
                <View style={styles.gameCardHeader}>
                  <Text style={styles.gameDate}>{item.date}</Text>
                  <View
                    style={[
                      styles.resultBadge,
                      item.result === "win" && styles.resultWin,
                      item.result === "loss" && styles.resultLoss,
                    ]}
                  >
                    <Text style={styles.resultText}>
                      {item.result.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.gamePlayers}>
                  {item.players.join(", ")}
                </Text>
                <Text
                  style={[
                    styles.gameScore,
                    {
                      color:
                        item.myScore > 0
                          ? "#4CAF50"
                          : item.myScore < 0
                          ? "#F44336"
                          : "#A5D6A7",
                    },
                  ]}
                >
                  {item.myScore > 0 ? "+" : ""}
                  {item.myScore} points
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFD700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E8F5E9",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#A5D6A7",
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  gameCard: {
    backgroundColor: "#1A4D1E",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2E7D32",
    gap: 6,
  },
  gameCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameDate: {
    color: "#A5D6A7",
    fontSize: 13,
    fontWeight: "600",
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#2E7D32",
  },
  resultWin: {
    backgroundColor: "#4CAF50",
  },
  resultLoss: {
    backgroundColor: "#F44336",
  },
  resultText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  gamePlayers: {
    color: "#E8F5E9",
    fontSize: 14,
    fontWeight: "500",
  },
  gameScore: {
    fontSize: 16,
    fontWeight: "700",
  },
});
