import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { color } from "@/theme";

export default function Index() {
  const { initializing, user, profile } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={color.teal} size="large" />
      </View>
    );
  }

  if (!user || !profile) return <Redirect href="/(auth)/sign-in" />;
  return <Redirect href="/(tabs)" />;
}
