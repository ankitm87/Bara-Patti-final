import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getSuitSymbol, getSuitColor } from "@/lib/game-engine";

export interface LogEntry {
  id: string;
  text: string;
  type: "play" | "trick_win" | "trio" | "system";
  timestamp: number;
}

interface ActivityLogProps {
  entries: LogEntry[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const displayEntries = expanded ? entries.slice(0, 20) : entries.slice(0, 3);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="list" size={14} color="#A5D6A7" />
        <Text style={styles.headerText}>Activity</Text>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={16}
          color="#A5D6A7"
        />
      </TouchableOpacity>
      {displayEntries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View
            style={[
              styles.dot,
              entry.type === "trick_win" && styles.dotWin,
              entry.type === "trio" && styles.dotTrio,
            ]}
          />
          <Text style={styles.entryText} numberOfLines={1}>
            {entry.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0D3B0F99",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxWidth: 170,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2E7D3260",
    marginBottom: 4,
  },
  headerText: {
    flex: 1,
    color: "#A5D6A7",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#4ADE80",
  },
  dotWin: {
    backgroundColor: "#FFD700",
  },
  dotTrio: {
    backgroundColor: "#F59E0B",
  },
  entryText: {
    flex: 1,
    color: "#C8E6C9",
    fontSize: 11,
    fontWeight: "500",
  },
});
