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

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
}

const achievements: Achievement[] = [
  {
    id: "first_win",
    title: "First Victory",
    description: "Win your first game",
    icon: "emoji-events",
    unlocked: true,
  },
  {
    id: "hat_trick",
    title: "Hat Trick",
    description: "Win 3 games in a row",
    icon: "local-fire-department",
    unlocked: false,
    progress: 1,
  },
  {
    id: "perfect_hand",
    title: "Perfect Hand",
    description: "Win all 12 hands in a game",
    icon: "star",
    unlocked: false,
  },
  {
    id: "trio_master",
    title: "Trio Master",
    description: "Declare trio 5 times",
    icon: "cards",
    unlocked: false,
    progress: 2,
  },
  {
    id: "comeback_king",
    title: "Comeback King",
    description: "Win after being down by 100 points",
    icon: "trending-up",
    unlocked: false,
  },
  {
    id: "speed_player",
    title: "Speed Player",
    description: "Play 10 games in one day",
    icon: "speed",
    unlocked: false,
    progress: 3,
  },
];

export default function AchievementsScreen() {
  const router = useRouter();

  const renderAchievementItem = ({ item }: { item: Achievement }) => (
    <View
      style={[
        styles.achievementCard,
        !item.unlocked && styles.achievementCardLocked,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          !item.unlocked && styles.iconContainerLocked,
        ]}
      >
        <MaterialIcons
          name={item.icon as any}
          size={32}
          color={item.unlocked ? "#FFD700" : "#687076"}
        />
      </View>

      <View style={styles.achievementInfo}>
        <Text
          style={[
            styles.achievementTitle,
            !item.unlocked && styles.achievementTitleLocked,
          ]}
        >
          {item.title}
        </Text>
        <Text style={styles.achievementDescription}>{item.description}</Text>
        {item.progress !== undefined && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(item.progress / 5) * 100}%` },
              ]}
            />
          </View>
        )}
      </View>

      {item.unlocked && (
        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
      )}
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
          <Text style={styles.title}>Achievements</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={achievements}
          renderItem={renderAchievementItem}
          keyExtractor={(item) => item.id}
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
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#1a3a1a",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  achievementCardLocked: {
    backgroundColor: "#0d2d0d",
    borderLeftColor: "#687076",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0d2d0d",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconContainerLocked: {
    backgroundColor: "#1a1a1a",
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ECEDEE",
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: "#687076",
  },
  achievementDescription: {
    fontSize: 12,
    color: "#9BA1A6",
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#0d2d0d",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
});
