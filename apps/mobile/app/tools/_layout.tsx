import { Stack } from "expo-router";
import { color, font } from "@/theme";

export default function ToolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerTintColor: color.text,
        headerTitleStyle: { fontFamily: font.family.sansBold },
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="schedule" options={{ title: "جدول الحصص" }} />
      <Stack.Screen name="health" options={{ title: "الصحة والحيويات" }} />
      <Stack.Screen name="wallet" options={{ title: "المحفظة المدرسية" }} />
      <Stack.Screen name="akbid" options={{ title: "معرّف أكبادنا" }} />
    </Stack>
  );
}
