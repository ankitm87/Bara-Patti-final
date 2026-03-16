import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = async () => {
    await startOAuthLogin();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#A5D6A7" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Bara Patti</Text>
            <Text style={styles.subtitle}>Sign in to play</Text>
          </View>

          <View style={styles.cardIcons}>
            <Text style={styles.suitIcon}>♠</Text>
            <Text style={[styles.suitIcon, { color: "#E53935" }]}>♥</Text>
            <Text style={styles.suitIcon}>♣</Text>
            <Text style={[styles.suitIcon, { color: "#E53935" }]}>♦</Text>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <MaterialIcons name="email" size={22} color="#0D3B0F" />
            <Text style={styles.loginButtonText}>Sign in with Email</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Sign in to create or join games and track your scores
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingRight: 20,
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFD700",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#A5D6A7",
    marginTop: 8,
  },
  cardIcons: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 48,
  },
  suitIcon: {
    fontSize: 36,
    color: "#FFFFFF",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    maxWidth: 320,
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  disclaimer: {
    color: "#81C784",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
