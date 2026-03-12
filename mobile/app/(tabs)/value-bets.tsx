import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

function TeamBadge({ uri, size = 22 }: { uri: string | null; size?: number }) {
  if (!uri) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254040" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 3 }} resizeMode="contain" />;
}

function fmtDate(d: string, t?: any) {
  const dt = new Date(d);
  const todayDt = new Date();
  const tomorrowDt = new Date(todayDt);
  tomorrowDt.setDate(tomorrowDt.getDate() + 1);
  if (dt.toDateString() === todayDt.toDateString()) return t?.today || "Today";
  if (dt.toDateString() === tomorrowDt.toDateString()) return t?.tomorrow || "Tomorrow";
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(t: string) {
  if (!t || t === "TBD") return "TBD";
  const parts = t.split(":");
  if (parts.length < 2) return t;
  const h = parseInt(parts[0]);
  const m = parts[1];
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

export default function BettingPicksScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/football/betting-picks"],
    queryFn: () => apiRequest("/api/football/betting-picks"),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const picks = data?.picks || [];
  const stats = data?.stats || { totalPicks: 0, winRate: 0, profit: 0, roi: 0, streak: 0 };

  const navigateToMatch = (pick: any) => {
    router.push({
      pathname: "/match-detail",
      params: {
        leagueKey: pick.leagueKey,
        espnId: pick.espnId,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        homeBadge: pick.homeBadge || "",
        awayBadge: pick.awayBadge || "",
        homeScore: "",
        awayScore: "",
        date: pick.date,
        time: pick.time,
        venue: pick.venue || "",
        status: "scheduled",
        league: pick.league,
        homeForm: pick.homeForm || "",
        awayForm: pick.awayForm || "",
        homeRecord: "",
        awayRecord: "",
      },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <View style={[styles.titleIconBg, { backgroundColor: colors.accentBg }]}>
            <MaterialCommunityIcons name="target" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t.bettingPicks}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t.bettingPicksDesc}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.statCard, { backgroundColor: colors.cardAccent, borderColor: colors.borderAccent }]}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{pct(stats.winRate)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.winRate}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: stats.profit >= 0 ? "#00C853" : "#FF5252" }]}>
            {stats.profit >= 0 ? "+" : ""}{stats.profit}u
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.profitLabel}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.roi}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.roi}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{stats.streak}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.streakLabel}</Text>
        </View>
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
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.analyzing}</Text>
          </View>
        )}

        {isError && (
          <View style={styles.loadingBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t.connectionError}</Text>
          </View>
        )}

        {!isLoading && picks.length === 0 && !isError && (
          <View style={styles.emptyBox}>
            <View style={[styles.emptyCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="target" size={32} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noPicks}</Text>
          </View>
        )}

        {picks.map((pick: any, idx: number) => (
          <Animated.View key={idx} style={{ opacity: fadeAnim }}>
            <TouchableOpacity
              style={[styles.pickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => navigateToMatch(pick)}
            >
              <View style={styles.pickMatchHeader}>
                <View style={styles.pickTeams}>
                  <View style={styles.pickTeamRow}>
                    <TeamBadge uri={pick.homeBadge} size={20} />
                    <Text style={[styles.pickTeamName, { color: colors.text }]} numberOfLines={1}>{pick.homeTeam}</Text>
                  </View>
                  <View style={styles.pickTeamRow}>
                    <TeamBadge uri={pick.awayBadge} size={20} />
                    <Text style={[styles.pickTeamName, { color: colors.text }]} numberOfLines={1}>{pick.awayTeam}</Text>
                  </View>
                </View>
                <View style={styles.pickMeta}>
                  <Text style={[styles.pickDate, { color: colors.textMuted }]}>{fmtDate(pick.date, t)}</Text>
                  <Text style={[styles.pickTime, { color: colors.accent }]}>{fmtTime(pick.time)}</Text>
                  <Text style={[styles.pickLeague, { color: colors.textMuted }]} numberOfLines={1}>{pick.league}</Text>
                </View>
              </View>

              <View style={[styles.probBarContainer, { borderTopColor: colors.border }]}>
                <View style={styles.probBarLabels}>
                  <Text style={[styles.probBarTeam, { color: colors.accent }]}>{pct(pick.probHome)}</Text>
                  <Text style={[styles.probBarTeam, { color: "#FFA726" }]}>{pct(pick.probDraw)}</Text>
                  <Text style={[styles.probBarTeam, { color: "#FF5252" }]}>{pct(pick.probAway)}</Text>
                </View>
                <View style={styles.triColorBar}>
                  <View style={{ flex: pick.probHome, backgroundColor: colors.accent, height: 4, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 }} />
                  <View style={{ flex: pick.probDraw, backgroundColor: "#FFA726", height: 4 }} />
                  <View style={{ flex: pick.probAway, backgroundColor: "#FF5252", height: 4, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
                </View>
                <View style={styles.probBarLabels}>
                  <Text style={[styles.probBarLabel, { color: colors.textMuted }]}>{t.home}</Text>
                  <Text style={[styles.probBarLabel, { color: colors.textMuted }]}>{t.draw}</Text>
                  <Text style={[styles.probBarLabel, { color: colors.textMuted }]}>{t.away}</Text>
                </View>
              </View>

              <View style={styles.picksContainer}>
                {pick.picks.map((p: any, i: number) => (
                  <View key={i} style={[styles.pickItemCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={styles.pickItemHeader}>
                      <View style={[styles.marketBadge, { backgroundColor: colors.accentBg }]}>
                        <Text style={[styles.marketBadgeText, { color: colors.accent }]}>{p.market}</Text>
                      </View>
                      <Text style={[styles.pickFairOdds, { color: colors.textMuted }]}>@{p.fairOdds.toFixed(2)}</Text>
                    </View>
                    <Text style={[styles.pickItemSelection, { color: colors.text }]}>{p.pick}</Text>
                    <View style={styles.pickItemBottom}>
                      <View style={[styles.pickProbBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.pickProbFill, { width: `${Math.round(p.probability * 100)}%`, backgroundColor: colors.accent }]} />
                      </View>
                      <Text style={[styles.pickProbPct, { color: colors.textMuted }]}>{pct(p.probability)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.pickFooter}>
                <View style={styles.confRow}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
                  <Text style={[styles.confText, { color: colors.textMuted }]}>{t.confidence}: {pct(pick.confidence)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },

  pickCard: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  pickMatchHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  pickTeams: { flex: 1, gap: 6 },
  pickTeamRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickTeamName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  pickMeta: { alignItems: "flex-end", gap: 2 },
  pickDate: { fontSize: 11, fontFamily: "Inter_500Medium" },
  pickTime: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pickLeague: { fontSize: 9, fontFamily: "Inter_400Regular", maxWidth: 100 },

  probBarContainer: { borderTopWidth: 1, paddingTop: 10, marginBottom: 10, gap: 4 },
  probBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  probBarTeam: { fontSize: 12, fontFamily: "Inter_700Bold" },
  probBarLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  triColorBar: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden" },

  picksContainer: { flexDirection: "row", gap: 8, marginBottom: 10 },
  pickItemCard: { flex: 1, borderRadius: 10, padding: 10, borderWidth: 1 },
  pickItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  marketBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  marketBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  pickFairOdds: { fontSize: 12, fontFamily: "Inter_700Bold" },
  pickItemSelection: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 6 },
  pickItemBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickProbBar: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  pickProbFill: { height: 3, borderRadius: 2 },
  pickProbPct: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  pickFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  confText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
