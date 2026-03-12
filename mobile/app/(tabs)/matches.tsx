import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import type { DashboardData } from "@/lib/types";

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const FILTERS = ["All", "Group Stage", "Knockout"];

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [filter, setFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest<DashboardData>("/api/dashboard"),
  });

  const matches = (data?.matches ?? []).filter((m) => {
    if (filter === "All") return true;
    if (filter === "Group Stage") return !m.match.is_knockout;
    if (filter === "Knockout") return m.match.is_knockout;
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <Ionicons name="football" size={24} color="#00E676" />
          <Text style={styles.title}>Matches</Text>
        </View>
        <Text style={styles.subtitle}>{matches.length} upcoming WC2026</Text>
      </Animated.View>

      <Animated.View style={[styles.filterRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.loading}>Loading matches...</Text>
          </View>
        )}
        {isError && (
          <View style={styles.loadingBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF5252" />
            <Text style={styles.loading}>Could not load matches</Text>
          </View>
        )}
        {matches.map((m, idx) => {
          const hasValue = m.value_bets.length > 0;
          return (
            <Animated.View
              key={m.match.id}
              style={[
                styles.card,
                hasValue && styles.cardGlow,
                { opacity: fadeAnim },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.metaLeft}>
                  <View style={styles.stagePill}>
                    <Text style={styles.stage}>{m.match.competition_stage?.replace("_", " ")}</Text>
                  </View>
                  <Text style={styles.date}>{fmtDate(m.match.match_date)}</Text>
                </View>
                <View style={styles.pills}>
                  {m.match.is_knockout && (
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>KO</Text>
                    </View>
                  )}
                  {m.match.is_neutral_venue && (
                    <View style={[styles.pill, styles.pillBlue]}>
                      <Text style={[styles.pillText, { color: "#3B82F6" }]}>N</Text>
                    </View>
                  )}
                  {hasValue && (
                    <View style={[styles.pill, styles.pillGreen]}>
                      <Ionicons name="flash" size={9} color="#00E676" />
                      <Text style={[styles.pillText, { color: "#00E676" }]}>{m.value_bets.length}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.teams}>
                <Text style={styles.team} numberOfLines={1}>{m.match.home_team}</Text>
                <View style={styles.scoreBox}>
                  <View style={styles.vsCircle}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                  <Text style={styles.projScore}>{m.prediction.projected_scoreline}</Text>
                </View>
                <Text style={[styles.team, styles.teamRight]} numberOfLines={1}>{m.match.away_team}</Text>
              </View>

              <View style={styles.probRow}>
                <View style={[styles.probSegment, { flex: m.prediction.prob_home, backgroundColor: "#00E676" }]} />
                <View style={[styles.probSegment, { flex: m.prediction.prob_draw, backgroundColor: "#2D3748", marginHorizontal: 2 }]} />
                <View style={[styles.probSegment, { flex: m.prediction.prob_away, backgroundColor: "#FF5252" }]} />
              </View>

              <View style={styles.probLabels}>
                <Text style={[styles.probPct, { color: "#00E676" }]}>{Math.round(m.prediction.prob_home * 100)}%</Text>
                <Text style={[styles.probPct, { color: "#8892A4" }]}>{Math.round(m.prediction.prob_draw * 100)}%</Text>
                <Text style={[styles.probPct, { color: "#FF5252" }]}>{Math.round(m.prediction.prob_away * 100)}%</Text>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.confRow}>
                  <View style={styles.confBarBg}>
                    <View style={[styles.confBarFill, { width: `${Math.round(m.prediction.confidence * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.conf}>{Math.round(m.prediction.confidence * 100)}% conf</Text>
                </View>
                {m.odds[0] && <Text style={styles.bookmaker}>{m.odds[0].bookmaker}</Text>}
              </View>
            </Animated.View>
          );
        })}
        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#131B2E",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  filterBtnActive: { backgroundColor: "#00E67620", borderColor: "#00E676" },
  filterText: { fontSize: 12, color: "#4A5568", fontFamily: "Inter_600SemiBold" },
  filterTextActive: { color: "#00E676" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loading: { color: "#4A5568", textAlign: "center", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#131B2E",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  cardGlow: { borderColor: "#00E67630", backgroundColor: "#0D1A14" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  metaLeft: {},
  stagePill: {
    backgroundColor: "#1C254080",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  stage: { fontSize: 9, color: "#8892A4", fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  date: { fontSize: 12, color: "#8892A4", fontFamily: "Inter_500Medium", marginTop: 2 },
  pills: { flexDirection: "row", gap: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF525218",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  pillBlue: { backgroundColor: "#3B82F618" },
  pillGreen: { backgroundColor: "#00E67618" },
  pillText: { fontSize: 9, color: "#FF5252", fontFamily: "Inter_700Bold" },
  teams: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  team: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  teamRight: { textAlign: "right" },
  scoreBox: { width: 52, alignItems: "center" },
  vsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1C2540",
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_700Bold" },
  projScore: { fontSize: 12, color: "#8892A4", fontFamily: "Inter_600SemiBold", marginTop: 2 },
  probRow: { flexDirection: "row", height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  probSegment: { height: 5 },
  probLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  probPct: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  confBarBg: {
    width: 80,
    height: 3,
    backgroundColor: "#1C2540",
    borderRadius: 2,
    overflow: "hidden",
  },
  confBarFill: { height: 3, backgroundColor: "#00E676", borderRadius: 2 },
  conf: { fontSize: 11, color: "#4A5568", fontFamily: "Inter_400Regular" },
  bookmaker: { fontSize: 11, color: "#4A5568", fontFamily: "Inter_400Regular" },
});
