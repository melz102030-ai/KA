import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useNeedsOnboarding } from "@/data/hooks";
import { color } from "@/theme";

function Spinner() {
  return (
    <View
      style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" }}
    >
      <ActivityIndicator color={color.primary} size="large" />
    </View>
  );
}

export default function Index() {
  const { initializing, authed } = useAuth();
  const { needs, ready } = useNeedsOnboarding();

  if (initializing) return <Spinner />;
  if (!authed) return <Redirect href="/(auth)/sign-in" />;
  if (!ready) return <Spinner />;
  return <Redirect href={needs ? "/onboarding" : "/(tabs)"} />;
}
