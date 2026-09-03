import { Text } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";
import { color, font } from "@/theme";

const icon =
  (emoji: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );

export default function TabsLayout() {
  const { initializing, user, profile } = useAuth();
  if (initializing) return null;
  if (!user || !profile) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: {
          backgroundColor: "#0A0A16",
          borderTopColor: color.border,
          height: 64,
          paddingTop: 6,
        },
        tabBarActiveTintColor: color.teal,
        tabBarInactiveTintColor: color.textMuted,
        tabBarLabelStyle: { fontFamily: font.family.sansBold, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="attendance" options={{ title: "الحضور", tabBarIcon: icon("📋") }} />
      <Tabs.Screen name="carpool" options={{ title: "كاربول", tabBarIcon: icon("🚗") }} />
      <Tabs.Screen name="messages" options={{ title: "رسائل", tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: icon("⋯") }} />
    </Tabs>
  );
}
