import React, { useState, useRef, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from "react-native";
import { setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { uploadAudioToS3, generateAudioFileName } from "@/lib/audio-upload";

const MAX_RECORDING_TIME = 10000; // 10 seconds in milliseconds

interface AudioRecorderProps {
  onRecordingComplete?: (uri: string, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onUploadStart?: () => void;
  onUploadComplete?: (audioUrl: string) => void;
  onUploadError?: (error: Error) => void;
}

export function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize audio on mount
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

    if (Platform.OS !== "web") {
      initAudio();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRecording, pulseAnim]);

  const startRecording = async () => {
    try {
      if (Platform.OS === "web") {
        console.log("Audio recording not supported on web");
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Create recording directory
      const recordingDir = `${(FileSystem as any).cacheDirectory}voice-notes/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingDir, { intermediates: true });
      }

      // Create recording object
      const audioModule = await import("expo-audio");
      const recording = new (audioModule as any).Recording();
      
      // Prepare recording
      await recording.prepareToRecordAsync({
        extension: ".m4a",
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        isMeteringEnabled: true,
      });

      // Start recording
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStart?.();

      // Auto-stop after 10 seconds
      timerRef.current = setTimeout(async () => {
        await stopRecording();
      }, MAX_RECORDING_TIME) as any;

      // Update recording time display
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 100;
          if (newTime >= MAX_RECORDING_TIME) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return MAX_RECORDING_TIME;
          }
          return newTime;
        });
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      onRecordingStop?.();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const duration = recordingTime;

      if (uri) {
        // Upload to S3
        try {
          onUploadStart?.();
          const fileName = generateAudioFileName();
          const audioUrl = await uploadAudioToS3(uri, fileName);
          onRecordingComplete?.(uri, duration);
          onUploadComplete?.(audioUrl);
        } catch (uploadError) {
          console.error("Failed to upload audio:", uploadError);
          onUploadError?.(uploadError instanceof Error ? uploadError : new Error("Upload failed"));
        }
      }

      recordingRef.current = null;
      setRecordingTime(0);
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 100);
    return `${seconds}.${milliseconds}s`;
  };

  const recordingPercentage = (recordingTime / MAX_RECORDING_TIME) * 100;

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[
              styles.recordingDot,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
        </View>
      )}

      {isRecording && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${recordingPercentage}%` },
            ]}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={isRecording ? "stop-circle" : "mic"}
          size={24}
          color={isRecording ? "#E74C3C" : "#FFD700"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  recordButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1A1F2E",
    borderWidth: 2,
    borderColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonActive: {
    borderColor: "#E74C3C",
    backgroundColor: "#2A1F2E",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2A1F2E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E74C3C",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E74C3C",
  },
  recordingTime: {
    color: "#E74C3C",
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    width: 120,
    height: 3,
    backgroundColor: "#334155",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E74C3C",
  },
});
