import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type TabType = "leaderboard" | "recent";

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("leaderboard");
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const groupsQuery = trpc.leaderboard.getGroups.useQuery();
  const leaderboardQuery = trpc.leaderboard.getLeaderboard.useQuery(
    selectedGroup ? { groupName: selectedGroup } : undefined
  );
  const recentQuery = trpc.leaderboard.getRecentGames.useQuery(
    selectedGroup ? { groupName: selectedGroup } : undefined
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      groupsQuery.refetch(),
      leaderboardQuery.refetch(),
      recentQuery.refetch(),
    ]);
    setRefreshing(false);
  }, []);

  const groups = groupsQuery.data || [];
  const leaderboard = leaderboardQuery.data || [];
  const recentGames = recentQuery.data || [];

  const isLoading = leaderboardQuery.isLoading || recentQuery.isLoading;

  const renderGroupPicker = () => {
    if (!showGroupPicker) return null;
    return (
      <View style={styles.groupPickerOverlay}>
        <View style={styles.groupPicker}>
          <Text style={styles.groupPickerTitle}>Select Group</Text>
          <TouchableOpacity
            style={[styles.groupOption, !selectedGroup && styles.groupOptionActive]}
            onPress={() => { setSelectedGroup(undefined); setShowGroupPicker(false); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.groupOptionText, !selectedGroup && styles.groupOptionTextActive]}>
              All Groups
            </Text>
          </TouchableOpacity>
          {groups.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.groupOption, selectedGroup === g && styles.groupOptionActive]}
              onPress={() => { setSelectedGroup(g); setShowGroupPicker(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupOptionText, selectedGroup === g && styles.groupOptionTextActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.groupPickerClose}
            onPress={() => setShowGroupPicker(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.groupPickerCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
    return (
      <View style={[styles.leaderRow, index < 3 && styles.leaderRowTop]}>
        <View style={styles.rankCol}>
          {medal ? (
            <Text style={styles.medal}>{medal}</Text>
          ) : (
            <Text style={styles.rankNum}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.playerName} numberOfLines={1}>{item.playerName}</Text>
          <Text style={styles.playerMeta}>
            {item.gamesPlayed} games · {item.totalHandsWon} hands · {item.trioCount} trios
          </Text>
        </View>
        <View style={styles.pointsCol}>
          <Text style={[styles.pointsText, { color: item.totalPoints >= 0 ? "#4CAF50" : "#F44336" }]}>
            {item.totalPoints > 0 ? "+" : ""}{item.totalPoints}
          </Text>
        </View>
      </View>
    );
  };

  const renderRecentGame = ({ item }: { item: any }) => {
    const date = new Date(item.createdAt);
    const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return (
      <View style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentDate}>{dateStr}</Text>
          <View style={styles.recentMeta}>
            {item.trumpSuit && (
              <Text style={styles.recentTrump}>
                Trump: {item.trumpSuit === "hearts" ? "♥" : item.trumpSuit === "diamonds" ? "♦" : item.trumpSuit === "clubs" ? "♣" : "♠"}
              </Text>
            )}
            {item.hasTrio && <Text style={styles.recentTrioBadge}>TRIO</Text>}
          </View>
        </View>
        <View style={styles.recentPlayers}>
          {(item.players || []).map((p: any, i: number) => (
            <View key={i} style={styles.recentPlayerRow}>
              <Text style={styles.recentPlayerName} numberOfLines={1}>{p.playerName}</Text>
              <Text style={styles.recentPlayerHands}>{p.handsWon}H</Text>
              <Text style={[styles.recentPlayerPoints, { color: p.points >= 0 ? "#4CAF50" : "#F44336" }]}>
                {p.points > 0 ? "+" : ""}{p.points}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="p-0">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <TouchableOpacity
            style={styles.groupBtn}
            onPress={() => setShowGroupPicker(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="filter-list" size={18} color="#FFD700" />
            <Text style={styles.groupBtnText}>
              {selectedGroup || "All Groups"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "leaderboard" && styles.tabActive]}
            onPress={() => setActiveTab("leaderboard")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "leaderboard" && styles.tabTextActive]}>
              Rankings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "recent" && styles.tabActive]}
            onPress={() => setActiveTab("recent")}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === "recent" && styles.tabTextActive]}>
              Recent Games
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : activeTab === "leaderboard" ? (
          leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>No Scores Yet</Text>
              <Text style={styles.emptySubtitle}>
                Play some rounds and scores will appear here. Rankings are grouped by your game group name.
              </Text>
            </View>
          ) : (
            <FlatList
              data={leaderboard}
              keyExtractor={(item, index) => `${item.playerName}-${index}`}
              renderItem={renderLeaderboardItem}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
              }
            />
          )
        ) : recentGames.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🃏</Text>
            <Text style={styles.emptyTitle}>No Games Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your game history will appear here after you complete a round.
            </Text>
          </View>
        ) : (
          <FlatList
            data={recentGames}
            keyExtractor={(item) => String(item.sessionId)}
            renderItem={renderRecentGame}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
            }
          />
        )}

        {renderGroupPicker()}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#FFD700" },
  groupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A4D1E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  groupBtnText: { color: "#FFD700", fontSize: 13, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#0D3B0F",
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#2E7D32" },
  tabText: { color: "#81C784", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF" },
  loadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#E8F5E9", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#A5D6A7", textAlign: "center", lineHeight: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },

  // Leaderboard rows
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A4D1E",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2E7D3240",
  },
  leaderRowTop: { borderColor: "#FFD70040" },
  rankCol: { width: 36, alignItems: "center" },
  medal: { fontSize: 20 },
  rankNum: { color: "#81C784", fontSize: 16, fontWeight: "700" },
  nameCol: { flex: 1, marginLeft: 8 },
  playerName: { color: "#E8F5E9", fontSize: 15, fontWeight: "700" },
  playerMeta: { color: "#81C784", fontSize: 11, marginTop: 2 },
  pointsCol: { marginLeft: 8, alignItems: "flex-end" },
  pointsText: { fontSize: 18, fontWeight: "800" },

  // Recent games
  recentCard: {
    backgroundColor: "#1A4D1E",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2E7D3240",
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recentDate: { color: "#81C784", fontSize: 12, fontWeight: "600" },
  recentMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  recentTrump: { color: "#FFD700", fontSize: 12, fontWeight: "600" },
  recentTrioBadge: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#F44336",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  recentPlayers: { gap: 6 },
  recentPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recentPlayerName: { flex: 1, color: "#E8F5E9", fontSize: 13, fontWeight: "600" },
  recentPlayerHands: { color: "#A5D6A7", fontSize: 12, fontWeight: "600", width: 30, textAlign: "center" },
  recentPlayerPoints: { fontSize: 14, fontWeight: "700", width: 50, textAlign: "right" },

  // Group picker overlay
  groupPickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000080",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  groupPicker: {
    backgroundColor: "#1A4D1E",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxHeight: "60%",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  groupPickerTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  groupOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  groupOptionActive: { backgroundColor: "#2E7D32" },
  groupOptionText: { color: "#E8F5E9", fontSize: 15, fontWeight: "600" },
  groupOptionTextActive: { color: "#FFD700" },
  groupPickerClose: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2E7D3240",
  },
  groupPickerCloseText: { color: "#81C784", fontSize: 14, fontWeight: "600" },
});
