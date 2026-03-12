import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNotifications, AppNotification } from "@/lib/notifications-context";
import { useTheme } from "@/lib/theme-context";

const typeConfig: Record<string, { icon: string; color: string }> = {
  match: { icon: "football", color: "#3B82F6" },
  result: { icon: "trophy", color: "#FFD93D" },
  value_bet: { icon: "flash", color: "#00E676" },
  system: { icon: "settings", color: "#A78BFA" },
};

const timeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const renderNotification = (n: AppNotification, idx: number) => {
    const conf = typeConfig[n.type] || typeConfig.system;
    return (
      <TouchableOpacity
        key={n.id}
        style={[
          styles.notifCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          !n.read && { borderLeftWidth: 3, borderLeftColor: conf.color },
        ]}
        onPress={() => markAsRead(n.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIcon, { backgroundColor: conf.color + "18" }]}>
          <Ionicons name={conf.icon as any} size={18} color={conf.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>{n.title}</Text>
            <Text style={[styles.notifTime, { color: colors.textMuted }]}>{timeAgo(n.timestamp)}</Text>
          </View>
          <Text style={[styles.notifMsg, { color: colors.textSecondary }]} numberOfLines={2}>{n.message}</Text>
        </View>
        {!n.read && <View style={[styles.unreadDot, { backgroundColor: conf.color }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { borderBottomColor: colors.border, opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn}>
              <Ionicons name="checkmark-done" size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {unreadCount > 0 && (
            <View style={[styles.unreadBanner, { backgroundColor: colors.accentBg }]}>
              <Ionicons name="notifications" size={16} color={colors.accent} />
              <Text style={[styles.unreadText, { color: colors.accent }]}>{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</Text>
            </View>
          )}

          {notifications.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No notifications at the moment
              </Text>
            </View>
          )}

          {notifications.map(renderNotification)}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 6 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  unreadText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifMsg: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
