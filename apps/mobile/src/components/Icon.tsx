import { Ionicons } from "@expo/vector-icons";
import { color as tokens } from "@/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({
  name,
  size = 20,
  color = tokens.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
