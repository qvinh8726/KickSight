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
import MatchCard from "@/components/MatchCard";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import type { DashboardData } from "@/lib/types";

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState("0");

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value: v }) => {
      setDisplay(suffix === "%" ? Math.round(v).toString() : Math.round(v).toString());
    });
    return () => animVal.removeListener(id);
  }, [value]);

  return <Text style={styles.statValue}>{display}{suffix}</Text>;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
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
    <View style={[styles.root, { paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: headerSlide }] }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Ionicons name="football" size={20} color="#00E676" />
          </View>
          <View>
            <Text style={styles.greeting}>{greeting()}, {user?.name?.split(" ")[0] || "User"}</Text>
            <Text style={styles.logoSub}>WC2026 Betting AI</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={20} color="#8892A4" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />
        }
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#00E676" size="large" />
            <Text style={styles.loadingText}>Loading predictions...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline-outline" size={28} color="#FF5252" />
            </View>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>Could not reach the server</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: statsSlide }] }]}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F615" }]}>
                  <Ionicons name="football-outline" size={18} color="#3B82F6" />
                </View>
                <AnimatedCounter value={data.stats.upcoming_matches} />
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={[styles.statCard, styles.statCardAccent]}>
                <View style={[styles.statIconBg, { backgroundColor: "#00E67615" }]}>
                  <Ionicons name="flash" size={18} color="#00E676" />
                </View>
                <AnimatedCounter value={data.stats.value_bets} />
                <Text style={styles.statLabel}>Value Bets</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: "#A78BFA15" }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#A78BFA" />
                </View>
                <AnimatedCounter value={Math.round(data.stats.avg_confidence * 100)} suffix="%" />
                <Text style={styles.statLabel}>Confidence</Text>
              </View>
            </Animated.View>

            <View style={styles.modelBadge}>
              <Ionicons name="hardware-chip-outline" size={14} color="#00E676" />
              <Text style={styles.modelText}>{data.stats.model}</Text>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>

            <Text style={styles.sectionLabel}>WC2026 PREDICTIONS</Text>

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
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1C2540",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#00E67615",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#00E67625",
  },
  greeting: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  logoSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#4A5568" },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#131B2E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular" },
  errorBox: { alignItems: "center", marginTop: 60, gap: 8 },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF525215",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  errorText: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular" },
  retryBtn: {
    backgroundColor: "#131B2E",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#00E676" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  statCardAccent: { borderColor: "#00E67630", backgroundColor: "#0D1A14" },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 2 },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131B2E",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  modelText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00E676", marginLeft: 4 },
  liveText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#00E676" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#4A5568",
    letterSpacing: 1,
    marginBottom: 12,
  },
});
