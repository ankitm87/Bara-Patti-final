import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <ScreenContainer className="p-0">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
          </View>
          <View style={styles.notLoggedIn}>
            <View style={styles.avatarLarge}>
              <MaterialIcons name="person" size={48} color="#2E7D32" />
            </View>
            <Text style={styles.notLoggedInTitle}>Not Signed In</Text>
            <Text style={styles.notLoggedInSub}>
              Sign in to track your scores and play with friends
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/login" as any)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="login" size={20} color="#0D3B0F" />
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const initials = (user.name || user.email || "?")[0].toUpperCase();
  const displayName = user.name || user.email?.split("@")[0] || "Player";

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarLargeGreen}>
              <Text style={styles.avatarLargeText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            {user.email && (
              <Text style={styles.profileEmail}>{user.email}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#4CAF50" }]}>0</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => router.push("/achievements" as any)}
            >
              <MaterialIcons name="emoji-events" size={22} color="#FFD700" />
              <Text style={styles.menuItemText}>Achievements</Text>
              <MaterialIcons name="chevron-right" size={22} color="#2E7D32" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => router.push("/leaderboard" as any)}
            >
              <MaterialIcons name="leaderboard" size={22} color="#FFD700" />
              <Text style={styles.menuItemText}>Leaderboard</Text>
              <MaterialIcons name="chevron-right" size={22} color="#2E7D32" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => router.push("/how-to-play" as any)}
            >
              <MaterialIcons name="help-outline" size={22} color="#A5D6A7" />
              <Text style={styles.menuItemText}>How to Play</Text>
              <MaterialIcons name="chevron-right" size={22} color="#2E7D32" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
            activeOpacity={0.7}
          >
            <MaterialIcons name="logout" size={20} color="#F44336" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFD700",
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
    gap: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#163318",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
    marginBottom: 8,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E8F5E9",
  },
  notLoggedInSub: {
    fontSize: 14,
    color: "#A5D6A7",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  avatarLargeGreen: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarLargeText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E8F5E9",
  },
  profileEmail: {
    fontSize: 14,
    color: "#A5D6A7",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A4D1E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFD700",
  },
  statLabel: {
    fontSize: 12,
    color: "#A5D6A7",
    fontWeight: "600",
    marginTop: 4,
  },
  menu: {
    gap: 2,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A4D1E",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#E8F5E9",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F44336",
  },
});
