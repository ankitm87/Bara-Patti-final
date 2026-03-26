import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ReconnectionHandlerProps {
  isReconnecting: boolean;
  timeRemaining: number;
  onReconnect: () => void;
  onGiveUp: () => void;
}

export function ReconnectionHandler({
  isReconnecting,
  timeRemaining,
  onReconnect,
  onGiveUp,
}: ReconnectionHandlerProps) {
  const colors = useColors();

  if (!isReconnecting) return null;

  return (
    <Modal transparent visible={isReconnecting} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Connection Lost
          </Text>
          <Text style={[styles.message, { color: colors.muted }]}>
            Reconnecting in {timeRemaining}s...
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={onReconnect}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Reconnect Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.error, marginTop: 12 },
              ]}
              onPress={onGiveUp}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Leave Game
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    minWidth: 280,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
