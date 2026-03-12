import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout } = useAuth();
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
    <View style={[styles.root, { paddingTop: topPad }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#00E676" />
            <Text style={styles.memberText}>Pro Member</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>

          <MenuItem icon="notifications-outline" label="Notifications" />
          <MenuItem icon="moon-outline" label="Dark Mode" value="On" />
          <MenuItem icon="globe-outline" label="Language" value="English" />
          <MenuItem icon="analytics-outline" label="Model Version" value="Poisson AI v2" />

          <Text style={styles.sectionTitle}>ABOUT</Text>

          <MenuItem icon="information-circle-outline" label="App Version" value="2.0.0" />
          <MenuItem icon="document-text-outline" label="Terms of Service" />
          <MenuItem icon="shield-outline" label="Privacy Policy" />

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#FF5252" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
      <Ionicons name={icon} size={20} color="#8892A4" />
      <Text style={styles.menuLabel}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color="#2D3748" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#131B2E",
    borderRadius: 20,
    padding: 28,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#00E67625",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#00E67640",
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#00E676" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 4 },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00E67615",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  memberText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#00E676" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#4A5568",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131B2E",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#4A5568" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF525215",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FF525230",
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FF5252" },
});
