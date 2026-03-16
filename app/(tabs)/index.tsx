import React from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const colors = useColors();

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
            <View style={styles.logoContainer}>
              <Text style={styles.title}>Bara Patti</Text>
              <Text style={styles.subtitle}>The Classic Card Game</Text>
            </View>
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

          {/* Main Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateGame}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-circle" size={28} color="#0D3B0F" />
              <View style={styles.buttonTextContainer}>
                <Text style={styles.primaryButtonText}>Create Game</Text>
                <Text style={styles.primaryButtonSub}>
                  Start a new room and invite friends
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleJoinGame}
              activeOpacity={0.8}
            >
              <MaterialIcons name="group-add" size={28} color="#FFD700" />
              <View style={styles.buttonTextContainer}>
                <Text style={styles.secondaryButtonText}>Join Game</Text>
                <Text style={styles.secondaryButtonSub}>
                  Enter an invite code to join
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Game Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How to Play</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🃏</Text>
              <Text style={styles.infoText}>
                48 cards, 4 players, 12 tricks per round
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
              <MaterialIcons name="login" size={20} color="#FFD700" />
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
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
  },
  logoContainer: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFD700",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#A5D6A7",
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1A4D1E",
    borderRadius: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  greetingText: {
    color: "#E8F5E9",
    fontSize: 16,
    fontWeight: "600",
  },
  actions: {
    gap: 14,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFD700",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A4D1E",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  primaryButtonSub: {
    fontSize: 13,
    color: "#1B5E20",
    marginTop: 2,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD700",
  },
  secondaryButtonSub: {
    fontSize: 13,
    color: "#A5D6A7",
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#1A4D1E",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#E8F5E9",
    flex: 1,
    lineHeight: 20,
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "#1A4D1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  loginPromptText: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "600",
  },
});
