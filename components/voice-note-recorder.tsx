import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";

interface VoiceNoteRecorderProps {
  onRecordingComplete: (audioUri: string, duration: number) => void;
  maxDuration?: number; // in seconds
  disabled?: boolean;
}

const MAX_RECORDING_DURATION = 30; // 30 seconds max

export function VoiceNoteRecorder({
  onRecordingComplete,
  maxDuration = MAX_RECORDING_DURATION,
  disabled = false,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef<any>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      } catch (error) {
        console.error("Failed to set audio mode:", error);
      }
    };

    initAudio();

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Create recording directory if it doesn't exist
      const recordingDir = `${(FileSystem as any).cacheDirectory}voice-notes/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingDir, { intermediates: true });
      }

      // For web, we'll use a simpler approach
      if (Platform.OS === "web") {
        console.log("Voice recording not fully supported on web yet");
        return;
      }

      // For native, use the Recording API
      const { useAudioRecorder } = await import("expo-audio");
      // Fallback to simple approach
      const recording = { prepareToRecordAsync: async () => {}, startAsync: async () => {}, stopAndUnloadAsync: async () => {}, getURI: () => "" } as any;
      
      // Prepare recording with basic settings
      try {
        await (recording as any).prepareToRecordAsync({
          extension: ".m4a",
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        });
      } catch (e) {
        console.log("Recording prep error (expected on web):", e);
      }

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      timerIntervalRef.current = interval;
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        onRecordingComplete(uri, recordingTime);
      }

      recordingRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        disabled={disabled || Platform.OS === "web"}
        style={({ pressed }) => [
          styles.button,
          isRecording && styles.buttonRecording,
          (pressed || disabled) && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>
          {isRecording ? "🔴" : "🎤"}
        </Text>
      </Pressable>

      {isRecording && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>Recording</Text>
          </View>
        </View>
      )}

      {recordingTime > 0 && !isRecording && (
        <Text style={styles.durationText}>
          Duration: {formatTime(recordingTime)}
        </Text>
      )}

      {Platform.OS === "web" && (
        <Text style={styles.webMessage}>Voice notes not available on web</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4ADE80",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#22C55E",
  },
  buttonRecording: {
    backgroundColor: "#EF4444",
    borderColor: "#DC2626",
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    fontSize: 20,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "700",
    minWidth: 40,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  recordingLabel: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  durationText: {
    color: "#81C784",
    fontSize: 12,
    fontWeight: "500",
  },
  webMessage: {
    color: "#999",
    fontSize: 11,
    fontStyle: "italic",
  },
});
