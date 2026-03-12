import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Platform, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const C = {
  bg: "#0B0F1A",
  tabBar: "#0F1521",
  tabBorder: "#1C2540",
  active: "#00E676",
  inactive: "#4A5568",
};

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

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
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBorder,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 84 : 80,
          paddingBottom: Platform.OS === "web" ? 34 : 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"grid-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"football-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="value-bets"
        options={{
          title: "Value Bets",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="backtest"
        options={{
          title: "Backtest",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"bar-chart-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"person-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
