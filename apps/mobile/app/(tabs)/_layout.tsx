import { View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { useNeedsOnboarding } from "@/data/hooks";
import { color, font, radius } from "@/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

const FRAME = 34;

/**
 * Every tab icon sits in the same square frame — the Ministry of Education
 * green — and every glyph is the outline cut, so nothing in the bar reads as a
 * solid block. The frame is what marks the current tab; the glyph stays hollow
 * whether focused or not.
 */
function Frame({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: FRAME,
        height: FRAME,
        borderRadius: radius.sm,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? color.moeGreen : color.borderStrong,
        backgroundColor: focused ? color.moeGreenSoft : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

const tab =
  (glyph: IoniconName) =>
  ({ focused }: { focused: boolean }) => (
    <Frame focused={focused}>
      <Ionicons name={glyph} size={19} color={focused ? color.moeGreen : color.textDim} />
    </Frame>
  );

/**
 * "More" is three rings rather than three dots: Ionicons only ships the filled
 * ellipsis, and a solid glyph would be the one thing in the bar that is not
 * hollow.
 */
const moreTab = ({ focused }: { focused: boolean }) => {
  const ring = focused ? color.moeGreen : color.textDim;
  return (
    <Frame focused={focused}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              borderWidth: 1,
              borderColor: ring,
              backgroundColor: "transparent",
            }}
          />
        ))}
      </View>
    </Frame>
  );
};

export default function TabsLayout() {
  const { initializing, authed, profile } = useAuth();
  const { needs, ready } = useNeedsOnboarding();
  if (initializing) return null;
  if (!authed) return <Redirect href="/(auth)/sign-in" />;
  if (ready && needs) return <Redirect href="/onboarding" />;

  // Each role gets only the tabs that belong to it. Taking the register is the
  // teacher's job; arranging the school run is the family's. Hidden tabs keep
  // their route, so a deep link still resolves.
  const role = profile?.activeRole ?? "parent";
  const showAttendance = role === "teacher";
  const showCarpool = role === "parent";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: color.moeGreen,
        tabBarInactiveTintColor: color.textDim,
        tabBarLabelStyle: { fontFamily: font.family.medium, fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: tab("home-outline") }} />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "الحضور",
          tabBarIcon: tab("checkbox-outline"),
          href: showAttendance ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="carpool"
        options={{
          title: "التوصيل",
          tabBarIcon: tab("car-outline"),
          href: showCarpool ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: "الرسائل", tabBarIcon: tab("chatbubbles-outline") }}
      />
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: moreTab }} />
    </Tabs>
  );
}
