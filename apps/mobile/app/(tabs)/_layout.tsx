import type { ColorValue } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { color, font } from "@/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

const tab =
  (active: IoniconName, inactive: IoniconName) =>
  ({ focused, color: c }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? active : inactive} size={23} color={c} />
  );

export default function TabsLayout() {
  const { initializing, authed } = useAuth();
  if (initializing) return null;
  if (!authed) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.textDim,
        tabBarLabelStyle: { fontFamily: font.family.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "الرئيسية", tabBarIcon: tab("home", "home-outline") }}
      />
      <Tabs.Screen
        name="attendance"
        options={{ title: "الحضور", tabBarIcon: tab("checkbox", "checkbox-outline") }}
      />
      <Tabs.Screen
        name="carpool"
        options={{ title: "التوصيل", tabBarIcon: tab("car", "car-outline") }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: "الرسائل", tabBarIcon: tab("chatbubbles", "chatbubbles-outline") }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "المزيد", tabBarIcon: tab("ellipsis-horizontal", "ellipsis-horizontal") }}
      />
    </Tabs>
  );
}
