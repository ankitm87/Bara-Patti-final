import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated } from "react-native";

interface EmojiReactionsProps {
  onReactionSelect?: (emoji: string) => void;
}

const REACTIONS = [
  { emoji: "🎉", label: "Celebrate", category: "win" },
  { emoji: "😎", label: "Cool", category: "win" },
  { emoji: "🔥", label: "Fire", category: "win" },
  { emoji: "😂", label: "Laugh", category: "tease" },
  { emoji: "🤣", label: "Hilarious", category: "tease" },
  { emoji: "😜", label: "Tease", category: "tease" },
  { emoji: "😢", label: "Sad", category: "lose" },
  { emoji: "😭", label: "Cry", category: "lose" },
  { emoji: "🤦", label: "Facepalm", category: "lose" },
];

export function EmojiReactions({ onReactionSelect }: EmojiReactionsProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleReactionPress = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReactionSelect?.(emoji);

    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Clear selection after 2 seconds
    setTimeout(() => setSelectedEmoji(null), 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>React</Text>
      <View style={styles.reactionsGrid}>
        {REACTIONS.map((reaction) => (
          <TouchableOpacity
            key={reaction.emoji}
            style={[
              styles.reactionButton,
              selectedEmoji === reaction.emoji && styles.reactionButtonActive,
            ]}
            onPress={() => handleReactionPress(reaction.emoji)}
            activeOpacity={0.7}
          >
            <Animated.Text
              style={[
                styles.reactionEmoji,
                selectedEmoji === reaction.emoji && {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {reaction.emoji}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D4AF37",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 8,
  },
  reactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 4,
  },
  reactionButton: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#1A1F2E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionButtonActive: {
    borderColor: "#FFD700",
    backgroundColor: "#2A2F3E",
  },
  reactionEmoji: {
    fontSize: 28,
  },
});
