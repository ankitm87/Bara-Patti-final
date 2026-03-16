import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

export function CountdownTimer({
  seconds,
  onComplete,
  size = 48,
  showLabel = false,
  label = "",
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [seconds]);

  const progress = remaining / seconds;
  const isWarning = remaining <= 5;
  const isCritical = remaining <= 3;

  const bgColor = isCritical
    ? "#F44336"
    : isWarning
    ? "#FF9800"
    : "#4CAF50";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: bgColor,
            backgroundColor: `${bgColor}20`,
          },
        ]}
      >
        <Text
          style={[
            styles.timeText,
            {
              fontSize: size * 0.4,
              color: bgColor,
            },
          ]}
        >
          {remaining}
        </Text>
      </View>
      {showLabel && label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  circle: {
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  timeText: {
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  label: {
    color: "#A5D6A7",
    fontSize: 11,
    fontWeight: "500",
  },
});
