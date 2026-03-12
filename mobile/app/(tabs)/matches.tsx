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
import { useTheme } from "@/lib/theme-context";
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
  const { colors } = useTheme();

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
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <Ionicons name="football" size={24} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>Matches</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{matches.length} upcoming WC2026</Text>
      </Animated.View>

      <Animated.View style={[styles.filterRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              filter === f && { backgroundColor: colors.accentBg, borderColor: colors.accent },
            ]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: colors.textMuted }, filter === f && { color: colors.accent }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loading, { color: colors.textMuted }]}>Loading matches...</Text>
          </View>
        )}
        {isError && (
          <View style={styles.loadingBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
            <Text style={[styles.loading, { color: colors.textMuted }]}>Could not load matches</Text>
          </View>
        )}
        {matches.map((m, idx) => {
          const hasValue = m.value_bets.length > 0;
          return (
            <Animated.View
              key={m.match.id}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                hasValue && { borderColor: colors.borderAccent, backgroundColor: colors.cardAccent },
                { opacity: fadeAnim },
              ]}
            >
              <View style={styles.cardTop}>
                <View>
                  <View style={[styles.stagePill, { backgroundColor: colors.border + "80" }]}>
                    <Text style={[styles.stage, { color: colors.textSecondary }]}>{m.match.competition_stage?.replace("_", " ")}</Text>
                  </View>
                  <Text style={[styles.date, { color: colors.textSecondary }]}>{fmtDate(m.match.match_date)}</Text>
                </View>
                <View style={styles.pills}>
                  {m.match.is_knockout && (
                    <View style={[styles.pill, { backgroundColor: colors.dangerBg }]}>
                      <Text style={[styles.pillText, { color: colors.danger }]}>KO</Text>
                    </View>
                  )}
                  {m.match.is_neutral_venue && (
                    <View style={[styles.pill, { backgroundColor: colors.blueBg }]}>
                      <Text style={[styles.pillText, { color: colors.blue }]}>N</Text>
                    </View>
                  )}
                  {hasValue && (
                    <View style={[styles.pill, { backgroundColor: colors.accentBg }]}>
                      <Ionicons name="flash" size={9} color={colors.accent} />
                      <Text style={[styles.pillText, { color: colors.accent }]}>{m.value_bets.length}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.teams}>
                <Text style={[styles.team, { color: colors.text }]} numberOfLines={1}>{m.match.home_team}</Text>
                <View style={styles.scoreBox}>
                  <View style={[styles.vsCircle, { backgroundColor: colors.border }]}>
                    <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
                  </View>
                  <Text style={[styles.projScore, { color: colors.textSecondary }]}>{m.prediction.projected_scoreline}</Text>
                </View>
                <Text style={[styles.team, { color: colors.text, textAlign: "right" }]} numberOfLines={1}>{m.match.away_team}</Text>
              </View>

              <View style={styles.probRow}>
                <View style={[styles.probSegment, { flex: m.prediction.prob_home, backgroundColor: colors.accent }]} />
                <View style={[styles.probSegment, { flex: m.prediction.prob_draw, backgroundColor: colors.probDraw, marginHorizontal: 2 }]} />
                <View style={[styles.probSegment, { flex: m.prediction.prob_away, backgroundColor: colors.danger }]} />
              </View>

              <View style={styles.probLabels}>
                <Text style={[styles.probPct, { color: colors.accent }]}>{Math.round(m.prediction.prob_home * 100)}%</Text>
                <Text style={[styles.probPct, { color: colors.textSecondary }]}>{Math.round(m.prediction.prob_draw * 100)}%</Text>
                <Text style={[styles.probPct, { color: colors.danger }]}>{Math.round(m.prediction.prob_away * 100)}%</Text>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.confRow}>
                  <View style={[styles.confBarBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.confBarFill, { width: `${Math.round(m.prediction.confidence * 100)}%` as any, backgroundColor: colors.accent }]} />
                  </View>
                  <Text style={[styles.conf, { color: colors.textMuted }]}>{Math.round(m.prediction.confidence * 100)}% conf</Text>
                </View>
                {m.odds[0] && <Text style={[styles.bookmaker, { color: colors.textMuted }]}>{m.odds[0].bookmaker}</Text>}
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
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loading: { textAlign: "center", fontFamily: "Inter_400Regular" },
  card: { borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  stagePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 4 },
  stage: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  date: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  pills: { flexDirection: "row", gap: 4 },
  pill: { flexDirection: "row", alignItems: "center", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, gap: 2 },
  pillText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  teams: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  team: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreBox: { width: 52, alignItems: "center" },
  vsCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  vsText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  projScore: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  probRow: { flexDirection: "row", height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  probSegment: { height: 5 },
  probLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  probPct: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  confBarBg: { width: 80, height: 3, borderRadius: 2, overflow: "hidden" },
  confBarFill: { height: 3, borderRadius: 2 },
  conf: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bookmaker: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
