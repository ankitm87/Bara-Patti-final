import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HowToPlayScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#A5D6A7" />
            </TouchableOpacity>
            <Text style={styles.title}>How to Play</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            {/* Game Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Game Overview</Text>
              <Text style={styles.sectionText}>
                Bara Patti is a classic Indian card game played with 4 players
                and 48 cards (no 2s). The goal is to win tricks and score the
                most points.
              </Text>
            </View>

            {/* Setup */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Setup</Text>
              <Text style={styles.sectionText}>
                • 4 players, 12 hands per round{"\n"}
                • Each player gets 12 cards{"\n"}
                • Last card dealt to dealer determines trump suit{"\n"}
                • Dealer rotates after each round
              </Text>
            </View>

            {/* Trump Rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trump Rules</Text>
              <Text style={styles.sectionText}>
                • Trump suit is determined by the last card dealt to the
                dealer{"\n"}
                • If you don't have the led suit, you must play trump if you
                have it{"\n"}
                • If you have the led suit, you can play any card
              </Text>
            </View>

            {/* Trio Declaration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trio Declaration</Text>
              <Text style={styles.sectionText}>
                • If you have 3 cards of the same rank, you can declare a trio
                {"\n"}
                • Trio must be declared within 20 seconds of trump reveal{"\n"}
                • Trio winner gets bonus points
              </Text>
            </View>

            {/* Scoring */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scoring</Text>
              <Text style={styles.sectionText}>
                • Each hand won = 1 point{"\n"}
                • Trio bonus = 5 points{"\n"}
                • Play 12 hands per round{"\n"}
                • First to reach target score wins the game
              </Text>
            </View>

            {/* Special Rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Special Rules</Text>
              <Text style={styles.sectionText}>
                • Ace of opposite suit must start if you have it{"\n"}
                • Must play higher trump if you have it and trump is led{"\n"}
                • 20 seconds per turn - auto-play lowest legal card on timeout
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  content: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#1a3a1a",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#ECEDEE",
    lineHeight: 22,
  },
});
