import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const COLORS = {
  bg: "#0B0F1A",
  tabBar: "#0F1521",
  tabBorder: "#1C2540",
  active: "#00E676",
  inactive: "#4A5568",
};

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.tabBorder,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 84 : 80,
          paddingBottom: Platform.OS === "web" ? 34 : 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"grid-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"football-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="value-bets"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={"lightning-bolt" as MCIName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="backtest"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={"bar-chart-outline" as IoniconsName} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
