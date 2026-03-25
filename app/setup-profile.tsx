import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SetupProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem("@bara_patti_player_name", name.trim());
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Bara Patti</Text>
          <Text style={styles.subtitle}>What's your name?</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#81C784"
              value={name}
              onChangeText={setName}
              editable={!loading}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          <Text style={styles.hint}>
            This name will be used when you play with friends
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardDecoration}>
          <Text style={styles.cardSymbol}>♠</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D3B0F",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    alignItems: "center",
    gap: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFD700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E8F5E9",
    textAlign: "center",
  },
  inputWrapper: {
    width: "100%",
    gap: 8,
  },
  input: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: "#1A4D1E",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2E7D32",
    color: "#E8F5E9",
  },
  hint: {
    fontSize: 14,
    color: "#81C784",
    textAlign: "center",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: "#FFD700",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0D3B0F",
  },
  cardDecoration: {
    position: "absolute",
    bottom: 40,
    right: 24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A4D1E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  cardSymbol: {
    fontSize: 48,
    color: "#FFD700",
    fontWeight: "900",
  },
});
