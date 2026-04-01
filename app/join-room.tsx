import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PlayerNameModal } from "@/components/player-name-modal";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function JoinRoomScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const pendingCodeRef = useRef<string>("");

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(cleaned);
    setError("");
  };

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-character code");
      return;
    }
    
    // Validate room exists on server
    setIsValidating(true);
    try {
      setError("");
      // Use fetch to validate room exists
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/trpc/room.getState?input=${encodeURIComponent(JSON.stringify({ roomId: code }))}`);
      
      if (!response.ok) {
        setError("Room not found. Please check the code.");
        setIsValidating(false);
        return;
      }
      
      const data = await response.json();
      if (!data.result?.data) {
        setError("Room not found. Please check the code.");
        setIsValidating(false);
        return;
      }
      
      // Store code and show name modal
      pendingCodeRef.current = code;
      setShowNameModal(true);
    } catch (err: any) {
      setError("Invalid room code. Please try again.");
      console.error("Room validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleNameSubmit = async (name: string) => {
    // Store player name in AsyncStorage
    await AsyncStorage.setItem("playerName", name);
    setPlayerName(name);
    setShowNameModal(false);
    // Navigate to lobby with the code
    router.replace(`/lobby/${pendingCodeRef.current}` as any);
  };

  return (
    <>
      <PlayerNameModal visible={showNameModal} onSubmit={handleNameSubmit} />
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color="#A5D6A7" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Game</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="group-add" size={48} color="#FFD700" />
          </View>

          <Text style={styles.instruction}>
            Enter the 6-character room code shared by your friend
          </Text>

          {/* Code Input */}
          <View style={styles.codeInputContainer}>
            <View style={styles.codeBoxes}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    code.length === i && styles.codeBoxActive,
                    error && styles.codeBoxError,
                  ]}
                >
                  <Text style={styles.codeBoxText}>{code[i] || ""}</Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Join Button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              (code.length < 6 || isValidating) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoin}
            activeOpacity={0.8}
            disabled={code.length < 6 || isValidating}
          >
            <Text style={styles.joinButtonText}>
              {isValidating ? "Validating..." : "Join Game"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
    </>
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
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    gap: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A4D1E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  instruction: {
    fontSize: 15,
    color: "#A5D6A7",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  codeInputContainer: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  codeBoxes: {
    flexDirection: "row",
    gap: 10,
  },
  codeBox: {
    width: 46,
    height: 56,
    backgroundColor: "#1A4D1E",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E7D32",
  },
  codeBoxActive: {
    borderColor: "#FFD700",
  },
  codeBoxError: {
    borderColor: "#F44336",
  },
  codeBoxText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFD700",
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: 56,
    opacity: 0,
  },
  errorText: {
    color: "#F44336",
    fontSize: 13,
    fontWeight: "600",
  },
  joinButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  joinButtonDisabled: {
    backgroundColor: "#2E7D32",
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0D3B0F",
  },
});
