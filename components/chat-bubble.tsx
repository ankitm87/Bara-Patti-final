import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const PRESET_MESSAGES = [
  "Badh badh ke aaiye",
  "Naadri banenge ab",
  "Humpe naa hai lalli",
  "Kya baat hai!",
  "Arre yaar!",
];

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

interface ChatBubbleProps {
  playerName: string;
  onSend?: (text: string) => void;
}

// Floating message that auto-disappears after 5 seconds
function FloatingMessage({ message, onDone }: { message: ChatMessage; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Fade in
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    // Fade out after 4.5s (total 5s with fade-in)
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 500, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.floatingMsg, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.floatingMsgSender}>{message.sender}</Text>
      <Text style={styles.floatingMsgText}>{message.text}</Text>
    </Animated.View>
  );
}

export function ChatBubble({ playerName, onSend }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const msgIdRef = useRef(0);

  const sendMessage = (text: string) => {
    msgIdRef.current++;
    const msg: ChatMessage = {
      id: String(msgIdRef.current),
      text,
      sender: playerName,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setIsOpen(false);
    setCustomText("");
    onSend?.(text);
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <>
      {/* Floating messages overlay */}
      <View style={styles.floatingContainer} pointerEvents="none">
        {messages.map((msg) => (
          <FloatingMessage key={msg.id} message={msg} onDone={() => removeMessage(msg.id)} />
        ))}
      </View>

      {/* Chat toggle button */}
      <TouchableOpacity
        style={styles.chatToggle}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="chat-bubble-outline" size={20} color="#FFD700" />
      </TouchableOpacity>

      {/* Chat panel */}
      {isOpen && (
        <View style={styles.chatPanel}>
          <Text style={styles.chatTitle}>Quick Chat</Text>

          {/* Preset messages */}
          {PRESET_MESSAGES.map((msg, i) => (
            <TouchableOpacity
              key={i}
              style={styles.presetBtn}
              onPress={() => sendMessage(msg)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetText}>{msg}</Text>
            </TouchableOpacity>
          ))}

          {/* Custom message input */}
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="Type message..."
              placeholderTextColor="#81C784"
              maxLength={50}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (customText.trim()) sendMessage(customText.trim());
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !customText.trim() && styles.sendBtnDisabled]}
              onPress={() => {
                if (customText.trim()) sendMessage(customText.trim());
              }}
              activeOpacity={0.7}
              disabled={!customText.trim()}
            >
              <MaterialIcons name="send" size={16} color={customText.trim() ? "#0D3B0F" : "#81C784"} />
            </TouchableOpacity>
          </View>

          {/* Close */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setIsOpen(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  floatingMsg: {
    backgroundColor: "#1B5E20EE",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    maxWidth: 260,
    borderWidth: 1,
    borderColor: "#4CAF5050",
  },
  floatingMsgSender: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  floatingMsgText: {
    color: "#E8F5E9",
    fontSize: 15,
    fontWeight: "600",
    fontStyle: "italic",
  },
  chatToggle: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B5E20CC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD70040",
    zIndex: 50,
  },
  chatPanel: {
    position: "absolute",
    bottom: 56,
    right: 8,
    width: 220,
    backgroundColor: "#0D3B0FEE",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2E7D3260",
    zIndex: 50,
  },
  chatTitle: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  presetBtn: {
    backgroundColor: "#1B5E2080",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  presetText: {
    color: "#C8E6C9",
    fontSize: 13,
    fontWeight: "600",
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: "#1B5E2060",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#E8F5E9",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#2E7D3240",
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#1B5E2060",
  },
  closeBtn: {
    marginTop: 8,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#81C784",
    fontSize: 11,
    fontWeight: "600",
  },
});
