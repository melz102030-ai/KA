import { useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_900Black,
} from "@expo-google-fonts/tajawal";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import { AuthProvider } from "@/lib/auth";
import { color } from "@/theme";

// Arabic-first: lay everything out right-to-left.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.setAttribute("dir", "rtl");
  document.documentElement.setAttribute("lang", "ar");
}

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_900Black,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Slot />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
