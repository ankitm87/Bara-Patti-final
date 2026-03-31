import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle, Text, Platform } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "person.fill": "person",
  "clock.fill": "history",
  "suit.spade.fill": "style",
  "gamecontroller.fill": "sports-esports",
  "gearshape.fill": "settings",
  "arrow.right.square.fill": "logout",
  "plus.circle.fill": "add-circle",
  "number.circle.fill": "dialpad",
  "xmark.circle.fill": "cancel",
  "checkmark.circle.fill": "check-circle",
  "square.and.arrow.up.fill": "share",
  "doc.on.clipboard.fill": "content-copy",
  "speaker.wave.2.fill": "volume-up",
  "speaker.slash.fill": "volume-off",
} as IconMapping;

// Emoji mapping for web fallback
const EMOJI_MAPPING: Record<string, string> = {
  "house.fill": "🏠",
  "paperplane.fill": "✈️",
  "chevron.left.forwardslash.chevron.right": "</>",
  "chevron.right": "›",
  "person.fill": "👤",
  "clock.fill": "🕐",
  "suit.spade.fill": "♠️",
  "gamecontroller.fill": "🎮",
  "gearshape.fill": "⚙️",
  "arrow.right.square.fill": "↗️",
  "plus.circle.fill": "➕",
  "number.circle.fill": "🔢",
  "xmark.circle.fill": "❌",
  "checkmark.circle.fill": "✅",
  "square.and.arrow.up.fill": "↗️",
  "doc.on.clipboard.fill": "📋",
  "speaker.wave.2.fill": "🔊",
  "speaker.slash.fill": "🔇",
  "arrow-back": "←",
  "arrow-forward": "→",
  "share": "📤",
  "mic": "🎤",
  "stop-circle": "⏹️",
  "volume-up": "🔊",
  "volume-off": "🔇",
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // On web, use emoji icons for better compatibility
  if (Platform.OS === "web") {
    const emoji = EMOJI_MAPPING[name] || "❓";
    return (
      <Text style={[style, { fontSize: size, color }]}>
        {emoji}
      </Text>
    );
  }
  
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
