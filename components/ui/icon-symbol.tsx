import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

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
} as IconMapping;

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
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
