import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: "small" | "medium" | "large";
  isActive?: boolean;
  hasTrio?: boolean;
  seatColor?: string;
  showDealer?: boolean;
  showCrown?: boolean;
}

const AVATAR_SIZES = {
  small: 32,
  medium: 45,
  large: 60,
};

export function Avatar({
  name = "Player",
  imageUrl,
  size = "medium",
  isActive = false,
  hasTrio = false,
  seatColor = "#4ADE80",
  showDealer = false,
  showCrown = false,
}: AvatarProps) {
  const avatarSize = AVATAR_SIZES[size];
  const initials = name?.charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: seatColor,
          },
          isActive && styles.avatarActive,
          hasTrio && styles.avatarTrio,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
          />
        ) : (
          <Text
            style={[
              styles.avatarText,
              { fontSize: avatarSize * 0.4 },
            ]}
          >
            {initials}
          </Text>
        )}
      </View>

      {showDealer && (
        <View style={styles.dealerBadge}>
          <Text style={styles.dealerBadgeText}>D</Text>
        </View>
      )}

      {showCrown && (
        <View style={styles.crownBadge}>
          <Text style={styles.crownEmoji}>👑</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarActive: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarTrio: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dealerBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  dealerBadgeText: {
    color: "#0D3B0F",
    fontSize: 8,
    fontWeight: "900",
  },
  crownBadge: {
    position: "absolute",
    top: -12,
    left: 4,
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  crownEmoji: {
    fontSize: 16,
  },
});
