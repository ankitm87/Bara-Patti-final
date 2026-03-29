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
          activeOpacity={0.8}
        >
          <View style={styles.quickPlayIcon}>
            <Text style={styles.quickPlayEmoji}>▶️</Text>
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
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonEmoji}>➕</Text>
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
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonEmoji}>👥</Text>
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
            activeOpacity={0.8}
          >
            <Text style={styles.loginPromptEmoji}>🔐</Text>
            <Text style={styles.loginPromptText}>
              Sign in to play with friends
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    alignItems: "center",
    paddingVertical: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFD700",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#D4AF37",
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1A1F2E",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#0F1419",
    fontSize: 18,
    fontWeight: "900",
  },
  greetingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Quick Play
  quickPlayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFD700",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickPlayIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF30",
    justifyContent: "center",
    alignItems: "center",
  },
  quickPlayEmoji: {
    fontSize: 32,
  },
  quickPlayTextWrap: {
    flex: 1,
  },
  quickPlayTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0D3B0F",
  },
  quickPlaySub: {
    fontSize: 14,
    color: "#1B5E20",
    fontWeight: "500",
    marginTop: 2,
  },
  // Multiplayer section
  multiplayerSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    color: "#D4AF37",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  actions: {
    gap: 10,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A1F2E",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  secondaryButtonEmoji: {
    fontSize: 24,
  },
  buttonTextContainer: {
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
  },
  secondaryButtonSub: {
    fontSize: 12,
    color: "#A0A0A0",
    marginTop: 2,
  },
  // Info card
  infoCard: {
    backgroundColor: "#1A1F2E",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFD700",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  infoEmoji: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#E0E0E0",
    fontWeight: "500",
    lineHeight: 18,
  },
  // Login prompt
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#1A1F2E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  loginPromptEmoji: {
    fontSize: 20,
  },
  loginPromptText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFD700",
    textAlign: "center",
  },
});
