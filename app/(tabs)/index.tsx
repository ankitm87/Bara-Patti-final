import React from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGame } from "@/lib/game-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { dispatch } = useGame();

  const handleQuickPlay = () => {
    // Generate a room code
    const code = `QP${Date.now().toString(36).slice(-4).toUpperCase()}`;
    // Reset state first to prevent duplicate players from stale state
    dispatch({ type: "RESET" });
    dispatch({ type: "CREATE_ROOM", roomId: code });

    // Add the human player at seat 0
    const playerName = user?.name || user?.email?.split("@")[0] || "You";
    dispatch({
      type: "ADD_PLAYER",
      player: {
        seat: 0,
        name: playerName,
        odId: user?.openId || "local-player",
        odName: playerName,
        odEmail: user?.email || "",
        odAvatar: "",
        odInitials: playerName[0].toUpperCase(),
        odColor: "#FFD700",
        userId: user?.openId || "local-player",
        hand: [],
        handsWon: 0,
        isReady: true,
        hasDeclinedTrio: false,
      },
    });

    // Add 3 bot players
    const botNames = ["Amma", "Chachu", "Maasi"];
    const botColors = ["#2ECC71", "#E74C3C", "#3498DB"];
    for (let i = 1; i <= 3; i++) {
      dispatch({
        type: "ADD_PLAYER",
        player: {
          seat: i as 0 | 1 | 2 | 3,
          name: botNames[i - 1],
          odId: `bot-${i}`,
          odName: botNames[i - 1],
          odEmail: "",
          odAvatar: "",
          odInitials: botNames[i - 1][0],
          odColor: botColors[i - 1],
          userId: `bot-${i}`,
          hand: [],
          handsWon: 0,
          isReady: true,
          hasDeclinedTrio: false,
        },
      });
    }

    // Start dealing immediately
    dispatch({ type: "START_DEALING" });

    // Navigate to game screen
    router.push(`/game/${code}` as any);
  };

  const handleCreateGame = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    router.push("/create-room");
  };

  const handleJoinGame = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    router.push("/join-room");
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Bara Patti</Text>
            <Text style={styles.subtitle}>The Classic Card Game</Text>
          </View>

          {/* User greeting */}
          {isAuthenticated && user && (
            <View style={styles.greeting}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.name || user.email || "?")[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.greetingText}>
                Welcome, {user.name || user.email?.split("@")[0] || "Player"}
              </Text>
            </View>
          )}

          {/* Quick Play - Main CTA */}
          <TouchableOpacity
            style={styles.quickPlayButton}
            onPress={handleQuickPlay}
            activeOpacity={0.85}
          >
            <View style={styles.quickPlayIcon}>
              <MaterialIcons name="play-arrow" size={44} color="#0F1419" />
            </View>
            <View style={styles.quickPlayTextWrap}>
              <Text style={styles.quickPlayTitle}>Quick Play</Text>
              <Text style={styles.quickPlaySub}>
                Start instantly with 3 bot players
              </Text>
            </View>
          </TouchableOpacity>

          {/* Multiplayer Actions */}
          <View style={styles.multiplayerSection}>
            <Text style={styles.sectionLabel}>Play with Friends</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleCreateGame}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add-circle" size={32} color="#FFD700" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.secondaryButtonText}>Create Game</Text>
                  <Text style={styles.secondaryButtonSub}>
                    Invite friends with a code
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleJoinGame}
                activeOpacity={0.85}
              >
                <MaterialIcons name="group-add" size={32} color="#FFD700" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.secondaryButtonText}>Join Game</Text>
                  <Text style={styles.secondaryButtonSub}>
                    Enter an invite code
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Game Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How to Play</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🃏</Text>
              <Text style={styles.infoText}>
                48 cards (no 2s), 4 players, 12 hands per round
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>👑</Text>
              <Text style={styles.infoText}>
                Last card dealt to dealer is the trump
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🏆</Text>
              <Text style={styles.infoText}>
                Win a trio (3 of a kind) for bonus points
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>⏱️</Text>
              <Text style={styles.infoText}>
                20 seconds per turn - play fast!
              </Text>
            </View>
          </View>

          {/* Login prompt if not authenticated */}
          {!isAuthenticated && !loading && (
            <TouchableOpacity
              style={styles.loginPrompt}
              onPress={() => router.push("/login")}
              activeOpacity={0.85}
            >
              <MaterialIcons name="login" size={24} color="#FFD700" />
              <Text style={styles.loginPromptText}>
                Sign in to play with friends
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFD700",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: "#D4AF37",
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 8,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#1A1F2E",
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#0F1419",
    fontSize: 28,
    fontWeight: "900",
  },
  greetingText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  // Quick Play
  quickPlayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: "#FFD700",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 32,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  quickPlayIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF40",
    justifyContent: "center",
    alignItems: "center",
  },
  quickPlayTextWrap: {
    flex: 1,
  },
  quickPlayTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F1419",
  },
  quickPlaySub: {
    fontSize: 16,
    color: "#1A1F2E",
    fontWeight: "600",
    marginTop: 4,
  },
  // Multiplayer section
  multiplayerSection: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 16,
    color: "#D4AF37",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 16,
  },
  actions: {
    gap: 14,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "#1A1F2E",
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  buttonTextContainer: {
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFD700",
  },
  secondaryButtonSub: {
    fontSize: 15,
    color: "#A0A0A0",
    marginTop: 4,
  },
  // Info card
  infoCard: {
    backgroundColor: "#1A1F2E",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD700",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  infoEmoji: {
    fontSize: 28,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: "#E0E0E0",
    fontWeight: "500",
    lineHeight: 24,
  },
  // Login prompt
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: "#1A1F2E",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  loginPromptText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD700",
  },
});
