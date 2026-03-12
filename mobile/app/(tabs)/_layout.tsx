import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Platform, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated) return null;

  const TAB_H = Platform.OS === "web" ? 64 : Platform.OS === "ios" ? 82 : 68;
  const PAD_B = Platform.OS === "web" ? 8 : Platform.OS === "ios" ? 24 : 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
          borderTopWidth: 1,
          height: TAB_H,
          paddingBottom: PAD_B,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginTop: 1,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "football" : "football-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="value-bets"
        options={{
          title: "Picks",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "lightning-bolt" : "lightning-bolt-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="backtest"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
