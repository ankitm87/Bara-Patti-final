import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  size?: number;
  showLabel?: boolean;
  label?: string;
  strokeWidth?: number;
}

export function CountdownTimer({
  seconds,
  onComplete,
  size = 48,
  showLabel = false,
  label = "",
  strokeWidth = 3,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setRemaining(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onCompleteRef.current?.();
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

  const activeColor = isCritical ? "#EF4444" : isWarning ? "#F59E0B" : "#4ADE80";
  const trackColor = `${activeColor}20`;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.timeText,
            {
              fontSize: size * 0.35,
              color: activeColor,
            },
            isWarning && styles.warningPulse,
          ]}
        >
          {remaining}
        </Text>
      </View>
      {showLabel && label ? (
        <Text style={[styles.label, { color: activeColor }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  timeText: {
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  warningPulse: {
    // Visual emphasis handled by color change
  },
  label: {
    position: "absolute",
    bottom: -16,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
});
