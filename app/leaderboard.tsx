import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  games: number;
  winRate: string;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Chachu", points: 2850, games: 24, winRate: "58%" },
  { rank: 2, name: "Amma", points: 2620, games: 22, winRate: "55%" },
  { rank: 3, name: "Maasi", points: 2410, games: 20, winRate: "50%" },
  { rank: 4, name: "You", points: 1950, games: 18, winRate: "44%" },
  { rank: 5, name: "Bhaiya", points: 1840, games: 16, winRate: "38%" },
];

export default function LeaderboardScreen() {
  const router = useRouter();

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={styles.leaderboardRow}>
      <View style={styles.rankContainer}>
        {item.rank === 1 && (
          <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
        )}
        {item.rank === 2 && (
          <MaterialIcons name="emoji-events" size={24} color="#C0C0C0" />
        )}
        {item.rank === 3 && (
          <MaterialIcons name="emoji-events" size={24} color="#CD7F32" />
        )}
        {item.rank > 3 && (
          <Text style={styles.rankNumber}>{item.rank}</Text>
        )}
      </View>

      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerStats}>
          {item.games} games • {item.winRate} win rate
        </Text>
      </View>

      <Text style={styles.points}>{item.points}</Text>
    </View>
  );

  return (
    <ScreenContainer className="p-0">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#A5D6A7" />
          </TouchableOpacity>
          <Text style={styles.title}>Leaderboard</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={mockLeaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.rank.toString()}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFD700",
  },
  listContent: {
    paddingBottom: 20,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#1a3a1a",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0d2d0d",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ECEDEE",
    marginBottom: 4,
  },
  playerStats: {
    fontSize: 12,
    color: "#9BA1A6",
  },
  points: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
  },
});
