import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { VoiceNoteRecorder } from "./voice-note-recorder";

export interface ChatMessage {
  id: string;
  sender: string;
  text?: string;
  audioUri?: string;
  duration?: number;
  timestamp: number;
  seatNumber: number;
}

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendVoiceNote?: (audioUri: string, duration: number) => void;
  playerName: string;
  isVisible: boolean;
  onClose: () => void;
}

const PREFILLED_MESSAGES = [
  "Badh badh ke aaiye",
  "Naadri banenge ab",
  "Humpe naa hai lalli",
];

export function GameChat({
  messages,
  onSendMessage,
  onSendVoiceNote,
  playerName,
  isVisible,
  onClose,
}: GameChatProps) {
  const colors = useColors();
  const [customText, setCustomText] = useState("");
  const [showPrefilled, setShowPrefilled] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendPrefilled = (text: string) => {
    onSendMessage(text);
    setShowPrefilled(false);
  };

  const handleSendCustom = () => {
    if (customText.trim()) {
      onSendMessage(customText);
      setCustomText("");
    }
  };

  const handleVoiceNoteComplete = (audioUri: string, duration: number) => {
    if (onSendVoiceNote) {
      onSendVoiceNote(audioUri, duration);
    }
  };

  return (
    <Modal transparent visible={isVisible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Game Chat
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={styles.messageRow}>
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.senderName, { color: colors.primary }]}>
                  {msg.sender}
                </Text>
                {msg.text && (
                  <Text style={[styles.messageText, { color: colors.foreground }]}>
                    {msg.text}
                  </Text>
                )}
                {msg.audioUri && (
                  <View style={styles.voiceNoteContainer}>
                    <MaterialIcons name="mic" size={16} color={colors.primary} />
                    <Text style={[styles.voiceNoteText, { color: colors.muted }]}>
                      🎤 Voice note ({msg.duration}s)
                    </Text>
                  </View>
                )}
                <Text style={[styles.timestamp, { color: colors.muted }]}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputArea, { borderTopColor: colors.border }]}>
          {/* Prefilled Messages */}
          {showPrefilled && (
            <View style={styles.prefilledContainer}>
              {PREFILLED_MESSAGES.map((msg) => (
                <TouchableOpacity
                  key={msg}
                  style={[
                    styles.prefilledButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleSendPrefilled(msg)}
                >
                  <Text style={[styles.prefilledText, { color: colors.background }]}>
                    {msg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Input Field */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type message..."
              placeholderTextColor={colors.muted}
              value={customText}
              onChangeText={setCustomText}
              multiline
              maxLength={100}
            />
            <TouchableOpacity
              style={[
                styles.quickButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => setShowPrefilled(!showPrefilled)}
            >
              <MaterialIcons name="emoji-emotions" size={20} color={colors.background} />
            </TouchableOpacity>
            {Platform.OS !== "web" && (
              <VoiceNoteRecorder
                onRecordingComplete={handleVoiceNoteComplete}
                maxDuration={30}
              />
            )}
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: customText.trim() ? colors.primary : colors.muted,
                },
              ]}
              onPress={handleSendCustom}
              disabled={!customText.trim()}
            >
              <MaterialIcons name="send" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageRow: {
    marginVertical: 6,
  },
  messageBubble: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  inputArea: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  prefilledContainer: {
    marginBottom: 12,
    gap: 8,
  },
  prefilledButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  prefilledText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  quickButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 4,
  },
  voiceNoteText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
