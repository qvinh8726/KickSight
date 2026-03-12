import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout } = useAuth();
  const { colors, isDark, toggle } = useTheme();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || "User"}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || ""}</Text>
          <View style={[styles.memberBadge, { backgroundColor: colors.accentBg }]}>
            <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
            <Text style={[styles.memberText, { color: colors.accent }]}>Pro Member</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SETTINGS</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.6}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: colors.border, true: colors.accent + "60" }}
              thumbColor={isDark ? colors.accent : "#FFFFFF"}
            />
          </View>

          <MenuItem icon="globe-outline" label="Language" value="English" colors={colors} />
          <MenuItem icon="analytics-outline" label="Model Version" value="Poisson AI v2" colors={colors} />

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ABOUT</Text>

          <MenuItem icon="information-circle-outline" label="App Version" value="2.0.0" colors={colors} />
          <MenuItem icon="document-text-outline" label="Terms of Service" colors={colors} />
          <MenuItem icon="shield-outline" label="Privacy Policy" colors={colors} />

          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, value, colors }: { icon: any; label: string; value?: string; colors: any }) {
  return (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.6}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.menuValue, { color: colors.textMuted }]}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  profileCard: {
    alignItems: "center",
    borderRadius: 20,
    padding: 28,
    marginBottom: 28,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14, borderWidth: 2,
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  memberBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12,
  },
  memberText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 12, padding: 14, gap: 8, marginTop: 20, borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
