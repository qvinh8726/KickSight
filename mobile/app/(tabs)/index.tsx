import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MatchCard from "@/components/MatchCard";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useNotifications } from "@/lib/notifications-context";
import type { DashboardData } from "@/lib/types";

function AnimatedCounter({ value, suffix = "", color }: { value: number; suffix?: string; color?: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState("0");

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value: v }) => {
      setDisplay(Math.round(v).toString());
    });
    return () => animVal.removeListener(id);
  }, [value]);

  return <Text style={[styles.statValue, color ? { color } : undefined]}>{display}{suffix}</Text>;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const cardsSlide = useRef(new Animated.Value(50)).current;

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest<DashboardData>("/api/dashboard"),
  });

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(statsSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(cardsSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { borderBottomColor: colors.border, opacity: fadeAnim, transform: [{ translateY: headerSlide }] }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoIcon, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Ionicons name="football" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>{greeting()}, {user?.name?.split(" ")[0] || "User"}</Text>
            <Text style={[styles.logoSub, { color: colors.textMuted }]}>WC2026 Betting AI</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/notifications")}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={[styles.notifDot, { backgroundColor: colors.accent }]}>
              {unreadCount < 10 && <Text style={styles.notifCount}>{unreadCount}</Text>}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading predictions...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <View style={[styles.errorIconCircle, { backgroundColor: colors.dangerBg }]}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Connection Error</Text>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>Could not reach the server</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: statsSlide }] }]}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.blueBg }]}>
                  <Ionicons name="football-outline" size={18} color={colors.blue} />
                </View>
                <AnimatedCounter value={data.stats.upcoming_matches} color={colors.text} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Matches</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.cardAccent, borderColor: colors.borderAccent }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="flash" size={18} color={colors.accent} />
                </View>
                <AnimatedCounter value={data.stats.value_bets} color={colors.text} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Value Bets</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.purpleBg }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.purple} />
                </View>
                <AnimatedCounter value={Math.round(data.stats.avg_confidence * 100)} suffix="%" color={colors.text} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Confidence</Text>
              </View>
            </Animated.View>

            <View style={[styles.modelBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="hardware-chip-outline" size={14} color={colors.accent} />
              <Text style={[styles.modelText, { color: colors.text }]}>{data.stats.model}</Text>
              <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.liveText, { color: colors.accent }]}>Live</Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WC2026 PREDICTIONS</Text>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: cardsSlide }] }}>
              {data.matches.map((m, i) => (
                <MatchCard key={m.match.id} data={m} index={i} />
              ))}
            </Animated.View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  greeting: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  logoSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notifCount: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#0B0F1A" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorBox: { alignItems: "center", marginTop: 60, gap: 8 },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    borderWidth: 1,
  },
  modelText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  liveText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 12,
  },
});
