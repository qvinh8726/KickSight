import { useEffect, useState } from "react";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, API_URL, setAuthToken } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { I18nProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

function processGoogleOAuthSync(): boolean {
  if (Platform.OS !== "web") return false;
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return false;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const returnedState = params.get("state");
    const savedState = sessionStorage.getItem("google_oauth_state");
    sessionStorage.removeItem("google_oauth_state");

    if (!accessToken || !returnedState || returnedState !== savedState) {
      window.history.replaceState(null, "", "/");
      return false;
    }

    window.history.replaceState(null, "", "/");
    sessionStorage.setItem("google_pending_token", accessToken);
    return true;
  } catch {
    return false;
  }
}

const hasPendingGoogleAuth = processGoogleOAuthSync();

function GoogleOAuthProcessor({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    if (Platform.OS !== "web") { onDone(); return; }

    const pendingToken = sessionStorage.getItem("google_pending_token");
    if (!pendingToken) { onDone(); return; }
    sessionStorage.removeItem("google_pending_token");

    (async () => {
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${pendingToken}` },
        });
        if (!userInfoRes.ok) { onDone(); return; }
        const userInfo = await userInfoRes.json();

        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: pendingToken, userInfo }),
        });
        const data = await res.json();
        if (res.ok && data.token) {
          setAuthToken(data.token);
          localStorage.setItem("kicksight_auth_token", data.token);
          localStorage.setItem("kicksight_auth_user", JSON.stringify(data.user));
          window.location.href = "/";
          return;
        }
      } catch {}
      onDone();
    })();
  }, []);

  return (
    <View style={gStyles.loadingContainer}>
      <ActivityIndicator size="large" color="#00E676" />
    </View>
  );
}

const gStyles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: "#0B0F1A", alignItems: "center", justifyContent: "center" },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [processingGoogle, setProcessingGoogle] = useState(hasPendingGoogleAuth);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (processingGoogle) {
    return <GoogleOAuthProcessor onDone={() => setProcessingGoogle(false)} />;
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <NotificationsProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <ThemedStatusBar />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="notifications" options={{ headerShown: false, presentation: "modal" }} />                <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: "modal" }} />                </Stack>
              </QueryClientProvider>
            </AuthProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}
