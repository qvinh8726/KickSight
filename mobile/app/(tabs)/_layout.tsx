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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 84 : 80,
          paddingBottom: Platform.OS === "web" ? 34 : 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.dashboard,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"grid-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t.matches,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"football-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="value-bets"
        options={{
          title: t.valueBets,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t.history,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"time-outline" as IoniconsName} size={size} color={color} />
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
          title: t.profile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"person-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
