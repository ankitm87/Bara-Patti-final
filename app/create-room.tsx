import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGame } from "@/lib/game-context";
import { generateRoomCode } from "@/lib/game-engine";
import * as Linking from "expo-linking";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

export default function CreateRoomScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { dispatch } = useGame();
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [playersJoined, setPlayersJoined] = useState(1);
  const [groupName, setGroupName] = useState("Family");
  const createRoomMutation = trpc.room.create.useMutation();

  useEffect(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    dispatch({ type: "CREATE_ROOM", roomId: code });
    
    // Create room on server via HTTP API
    const playerName = user?.openId || "local-player";
    const displayName = user?.name || user?.email?.split("@")[0] || "Player";
    createRoomMutation.mutate(
      {
        roomId: code,
        playerName,
        displayName,
      },
      {
        onSuccess: () => {
          console.log("[create-room] Room created on server:", code);
        },
        onError: (error) => {
          console.error("[create-room] Failed to create room on server:", error);
        },
      }
    );
    
    // Load saved group name
    AsyncStorage.getItem("bara-patti-group-name").then((name) => {
      if (name) setGroupName(name);
    });
  }, []);

  const handleGroupNameChange = (text: string) => {
    setGroupName(text);
    AsyncStorage.setItem("bara-patti-group-name", text);
  };

  const handleCopyCode = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  const handleShareWhatsApp = () => {
    // Generate join URL for direct joining
    const appBaseUrl = Platform.OS === "web" ? window.location.origin : "exp://";
    const joinUrl = `${appBaseUrl}/join-room?code=${roomCode}`;
    const message = `Join my Bara Patti game! 🃏\n\nClick here to join: ${joinUrl}\n\nOr enter code: ${roomCode}\nGroup: ${groupName}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl);
  };

  const handleShare = () => {
    // Generate join URL for direct joining
    const appBaseUrl = Platform.OS === "web" ? window.location.origin : "exp://";
    const joinUrl = `${appBaseUrl}/join-room?code=${roomCode}`;
    const message = `Join my Bara Patti game! Click here: ${joinUrl}`;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Bara Patti Game", text: message });
    } else {
      handleShareWhatsApp();
    }
  };

  const handleStartGame = () => {
    router.replace(`/lobby/${roomCode}` as any);
  };

  return (
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
          <Text style={styles.headerTitle}>Create Game</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Group Name */}
          <View style={styles.groupSection}>
            <Text style={styles.groupLabel}>Group Name</Text>
            <TextInput
              style={styles.groupInput}
              value={groupName}
              onChangeText={handleGroupNameChange}
              placeholder="e.g. Family, Friends, Office"
              placeholderTextColor="#2E7D32"
              returnKeyType="done"
              maxLength={40}
            />
            <Text style={styles.groupHint}>
              Scores are grouped by this name on the leaderboard
            </Text>
          </View>

          {/* Room Code Display */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Your Room Code</Text>
            <View style={styles.codeDisplay}>
              {roomCode.split("").map((char, i) => (
                <View key={i} style={styles.codeChar}>
                  <Text style={styles.codeCharText}>{char}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={copied ? "check" : "content-copy"}
                size={18}
                color={copied ? "#4CAF50" : "#A5D6A7"}
              />
              <Text style={[styles.copyText, copied && { color: "#4CAF50" }]}>
                {copied ? "Copied!" : "Copy Code"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Share Buttons */}
          <View style={styles.shareSection}>
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleShareWhatsApp}
              activeOpacity={0.8}
            >
              <MaterialIcons name="chat" size={22} color="#FFFFFF" />
              <Text style={styles.whatsappText}>Share via WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <MaterialIcons name="share" size={22} color="#FFD700" />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Players Waiting */}
          <View style={styles.playersSection}>
            <Text style={styles.playersTitle}>
              Players ({playersJoined}/4)
            </Text>
            {[0, 1, 2, 3].map((seat) => (
              <View key={seat} style={styles.playerSlot}>
                <View
                  style={[
                    styles.playerAvatar,
                    seat === 0 && { backgroundColor: "#4CAF50" },
                  ]}
                >
                  {seat === 0 ? (
                    <Text style={styles.playerAvatarText}>
                      {(user?.name || user?.email || "Y")[0].toUpperCase()}
                    </Text>
                  ) : (
                    <MaterialIcons name="person-outline" size={20} color="#2E7D32" />
                  )}
                </View>
                <Text
                  style={[
                    styles.playerName,
                    seat > 0 && { color: "#2E7D32" },
                  ]}
                >
                  {seat === 0
                    ? user?.name || user?.email?.split("@")[0] || "You"
                    : "Waiting..."}
                </Text>
                {seat === 0 && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostBadgeText}>Host</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[
              styles.startButton,
              playersJoined < 4 && styles.startButtonDisabled,
            ]}
            onPress={handleStartGame}
            activeOpacity={0.8}
            disabled={playersJoined < 4}
          >
            <Text style={styles.startButtonText}>
              {playersJoined < 4
                ? `Waiting for ${4 - playersJoined} more player${4 - playersJoined > 1 ? "s" : ""}...`
                : "Start Game"}
            </Text>
          </TouchableOpacity>

          {/* Dev: Quick start for testing */}
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => {
              setPlayersJoined(4);
              router.replace(`/lobby/${roomCode}` as any);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.devButtonText}>
              Fill with AI Players (Demo)
            </Text>
          </TouchableOpacity>
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
    gap: 20,
  },
  // Group name
  groupSection: {
    gap: 6,
  },
  groupLabel: {
    fontSize: 13,
    color: "#A5D6A7",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  groupInput: {
    backgroundColor: "#1A4D1E",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD700",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  groupHint: {
    fontSize: 12,
    color: "#81C784",
  },
  // Code section
  codeSection: {
    alignItems: "center",
    paddingVertical: 12,
  },
  codeLabel: {
    fontSize: 14,
    color: "#A5D6A7",
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeDisplay: {
    flexDirection: "row",
    gap: 8,
  },
  codeChar: {
    width: 44,
    height: 52,
    backgroundColor: "#1A4D1E",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  codeCharText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFD700",
    fontVariant: ["tabular-nums"],
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  copyText: {
    color: "#A5D6A7",
    fontSize: 13,
    fontWeight: "600",
  },
  shareSection: {
    flexDirection: "row",
    gap: 12,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 14,
    borderRadius: 12,
  },
  whatsappText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A4D1E",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  shareText: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "700",
  },
  playersSection: {
    gap: 10,
  },
  playersTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#A5D6A7",
    marginBottom: 4,
  },
  playerSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A4D1E",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#163318",
    justifyContent: "center",
    alignItems: "center",
  },
  playerAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  playerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#E8F5E9",
  },
  hostBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hostBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  startButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  startButtonDisabled: {
    backgroundColor: "#2E7D32",
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0D3B0F",
  },
  devButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  devButtonText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "500",
  },
});
