import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { color } from "@/theme";

export default function Index() {
  const { initializing, authed } = useAuth();

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

  return <Redirect href={authed ? "/(tabs)" : "/(auth)/sign-in"} />;
}
