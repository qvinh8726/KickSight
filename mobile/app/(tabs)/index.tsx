/**
 * index.tsx  Dashboard screen, Sofascore-style
 * - Header: greeting + notification bell
 * - Live matches chip strip (horizontal)
 * - Upcoming matches grouped by league (compact)
 * - Recent results
 */
import React, { useRef, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Platform,
  Animated, RefreshControl, TouchableOpacity, Image, ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useNotifications } from "@/lib/notifications-context";
import type { AllMatchesData, LiveMatch } from "@/lib/types";

function TeamBadge({ uri, size = 22 }: { uri: string | null; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) return <View style={{ width: size, height: size, borderRadius: 3, backgroundColor: "#ffffff10" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 3 }} resizeMode="contain" onError={() => setFailed(true)} />;
}

function fmtTime(t: string) {
  if (!t || t === "TBD") return "TBD";
  const [h, m] = t.split(":");
  if (!m) return t;
  return `${parseInt(h).toString().padStart(2, "0")}:${m}`;
}

// LIVE match horizontal chip
function LiveChip({ m, colors, onPress }: { m: LiveMatch; colors: any; onPress: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      style={[s.liveChip, { backgroundColor: colors.card, borderColor: "#E6394630" }]}>
      <View style={s.liveChipHeader}>
        <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#E63946", opacity: pulse }} />
        <Text style={s.liveLabel}>LIVE</Text>
        {m.status_detail && <Text style={s.liveMin}>{m.status_detail}</Text>}
      </View>
      <View style={s.liveTeams}>
        <View style={s.liveTeamRow}>
          <TeamBadge uri={m.home_badge} size={20} />
          <Text style={[s.liveTeamName, { color: colors.text }]} numberOfLines={1}>{m.home_team}</Text>
          <Text style={[s.liveScore, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{m.home_score ?? 0}</Text>
        </View>
        <View style={s.liveTeamRow}>
          <TeamBadge uri={m.away_badge} size={20} />
          <Text style={[s.liveTeamName, { color: colors.textSecondary }]} numberOfLines={1}>{m.away_team}</Text>
          <Text style={[s.liveScore, { color: colors.textSecondary, fontFamily: "Inter_700Bold" }]}>{m.away_score ?? 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Compact match row for upcoming/results
function MatchRow({ m, colors, onPress }: { m: LiveMatch; colors: any; onPress: () => void }) {
  const isFinished = m.status === "finished";
  const hasScore   = isFinished || m.status === "live";
  const hmWin      = hasScore && (m.home_score ?? 0) > (m.away_score ?? 0);
  const awWin      = hasScore && (m.away_score ?? 0) > (m.home_score ?? 0);

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}
      style={[s.matchRow, { borderBottomColor: colors.borderLight }]}>
      {/* Status */}
      <View style={s.matchStatus}>
        {isFinished
          ? <Text style={[s.statusTxt, { color: colors.textMuted }]}>FT</Text>
          : <Text style={[s.statusTxt, { color: colors.accent }]}>{fmtTime(m.time)}</Text>
        }
      </View>
      {/* Teams */}
      <View style={s.matchTeams}>
        <View style={s.teamRow}>
          <TeamBadge uri={m.home_badge} size={16} />
          <Text style={[s.teamName, { color: isFinished && !hmWin ? colors.textSecondary : colors.text }]} numberOfLines={1}>{m.home_team}</Text>
        </View>
        <View style={[s.teamRow, { marginTop: 6 }]}>
          <TeamBadge uri={m.away_badge} size={16} />
          <Text style={[s.teamName, { color: isFinished && !awWin ? colors.textSecondary : colors.text }]} numberOfLines={1}>{m.away_team}</Text>
        </View>
      </View>
      {/* Score */}
      <View style={s.matchScore}>
        {hasScore ? (
          <>
            <Text style={[s.scoreNum, { color: hmWin ? colors.text : colors.textSecondary, fontFamily: "Inter_700Bold" }]}>{m.home_score}</Text>
            <Text style={[s.scoreNum, { color: awWin ? colors.text : colors.textSecondary, fontFamily: "Inter_700Bold", marginTop: 6 }]}>{m.away_score}</Text>
          </>
        ) : (
          <>
            <Text style={[s.scoreBlank, { color: colors.borderLight }]}></Text>
            <Text style={[s.scoreBlank, { color: colors.borderLight, marginTop: 6 }]}></Text>
          </>
        )}
      </View>
      <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// Section header (league name)
function SectionHead({ title, count, accentColor, colors, onSeeAll }: { title: string; count: number; accentColor?: string; colors: any; onSeeAll?: () => void }) {
  return (
    <View style={[s.sectionHead, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
      <View style={[s.sectionBar, { backgroundColor: accentColor ?? colors.accent }]} />
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={s.seeAllBtn}>
          <Text style={[s.seeAllTxt, { color: colors.accent }]}>See all</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCard({ label, value, sub, color, colors }: { label: string; value: string; sub?: string; color: string; colors: any }) {
  return (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
      {sub && <Text style={[s.statSub, { color: colors.textMuted }]}>{sub}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 48 : insets.top;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data, isLoading, refetch } = useQuery<AllMatchesData>({
    queryKey: ["/api/football/all-matches"],
    queryFn: () => apiRequest<AllMatchesData>("/api/football/all-matches"),
    refetchInterval: 60_000,
  });

  const { data: picksData } = useQuery<any>({
    queryKey: ["/api/football/betting-picks"],
    queryFn: () => apiRequest("/api/football/betting-picks"),
    refetchInterval: 5 * 60_000,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/football/all-matches"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/football/betting-picks"] }),
    ]);
    setRefreshing(false);
  };

  const navigateTo = (m: LiveMatch) => {
    const espnId = m.id.includes("_") ? m.id.split("_").slice(1).join("_") : m.id;
    router.push({
      pathname: "/match-detail",
      params: {
        leagueKey: m.league_key, espnId,
        homeTeam: m.home_team, awayTeam: m.away_team,
        homeBadge: m.home_badge || "", awayBadge: m.away_badge || "",
        homeScore: m.home_score?.toString() || "", awayScore: m.away_score?.toString() || "",
        date: m.date, time: m.time, venue: m.venue || "", status: m.status,
        league: m.league, homeForm: m.home_form || "", awayForm: m.away_form || "",
        homeRecord: m.home_record || "", awayRecord: m.away_record || "",
      },
    });
  };

  const liveMatches  = (data?.upcoming ?? []).filter(m => m.status === "live");
  const upcoming     = (data?.upcoming ?? []).filter(m => m.status === "scheduled").slice(0, 15);
  const results      = (data?.results  ?? []).slice(0, 8);
  const topPicks     = (picksData?.picks ?? []).slice(0, 3);
  const stats        = picksData?.stats ?? { winRate: 0, roi: 0, totalPicks: 0 };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };

  return (
    <Animated.View style={[s.root, { backgroundColor: colors.bg, paddingTop: topPad, opacity: fadeAnim }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/*  Header  */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[s.greeting, { color: colors.textSecondary }]}>{greeting()}, {user?.username ?? "User"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.accent} />
              <Text style={[s.appName, { color: colors.text }]}>KickSight</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/notifications")} activeOpacity={0.7}
            style={[s.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            {unreadCount > 0 && <View style={[s.bellDot, { backgroundColor: "#E63946" }]} />}
          </TouchableOpacity>
        </View>

        {/*  Stats strip  */}
        {(stats.totalPicks > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
            <StatCard label="Win Rate" value={`${Math.round((stats.winRate ?? 0) * 100)}%`} color={colors.win} colors={colors} />
            <StatCard label="ROI"      value={`${stats.roi >= 0 ? "+" : ""}${(stats.roi ?? 0).toFixed(1)}%`} color={stats.roi >= 0 ? colors.win : colors.danger} colors={colors} />
            <StatCard label="AI Picks" value={String(stats.totalPicks)} color={colors.accent} colors={colors} />
          </ScrollView>
        )}

        {/*  Live matches  */}
        {liveMatches.length > 0 && (
          <>
            <SectionHead title="LIVE NOW" count={liveMatches.length} accentColor="#E63946" colors={colors} onSeeAll={() => router.push("/(tabs)/matches")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
              {liveMatches.map(m => (
                <LiveChip key={m.id} m={m} colors={colors} onPress={() => navigateTo(m)} />
              ))}
            </ScrollView>
          </>
        )}

        {/*  Upcoming  */}
        {upcoming.length > 0 && (
          <>
            <SectionHead title="UPCOMING" count={upcoming.length} accentColor={colors.accent} colors={colors} onSeeAll={() => router.push("/(tabs)/matches")} />
            {isLoading
              ? <View style={s.loading}><ActivityIndicator color={colors.accent} /></View>
              : upcoming.map(m => <MatchRow key={m.id} m={m} colors={colors} onPress={() => navigateTo(m)} />)
            }
          </>
        )}

        {/*  Top AI Picks  */}
        {topPicks.length > 0 && (
          <>
            <SectionHead title="AI PICKS" count={topPicks.length} accentColor="#9C6FFF" colors={colors} onSeeAll={() => router.push("/(tabs)/value-bets")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
              {topPicks.map((pick: any) => (
                <View key={pick.matchId} style={[s.pickChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.pickLeague, { color: colors.textMuted }]}>{pick.league}</Text>
                  <Text style={[s.pickMatch, { color: colors.text }]} numberOfLines={1}>{pick.homeTeam} vs {pick.awayTeam}</Text>
                  {pick.picks?.[0] && (
                    <View style={[s.pickBadge, { backgroundColor: colors.accentBg }]}>
                      <Text style={[s.pickBadgeTxt, { color: colors.accent }]}>{pick.picks[0].pick}</Text>
                      <Text style={[s.pickProb, { color: colors.accent }]}>{Math.round(pick.picks[0].probability * 100)}%</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/*  Recent results  */}
        {results.length > 0 && (
          <>
            <SectionHead title="RECENT RESULTS" count={results.length} accentColor={colors.textMuted} colors={colors} onSeeAll={() => router.push("/(tabs)/matches")} />
            {results.map(m => <MatchRow key={m.id} m={m} colors={colors} onPress={() => navigateTo(m)} />)}
          </>
        )}

        {!isLoading && liveMatches.length === 0 && upcoming.length === 0 && results.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="football-outline" size={40} color={colors.textMuted} />
            <Text style={[s.emptyTxt, { color: colors.textMuted }]}>No matches available</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  greeting:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  appName:     { fontSize: 22, fontFamily: "Inter_700Bold" },
  bellBtn:     { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  bellDot:     { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4 },
  loading:     { alignItems: "center", paddingVertical: 20 },
  empty:       { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTxt:    { fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  sectionBar:  { width: 3, height: 16, borderRadius: 2 },
  sectionTitle:{ flex: 1, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  seeAllBtn:   { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllTxt:   { fontSize: 12, fontFamily: "Inter_500Medium" },
  statCard:    { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", minWidth: 90 },
  statValue:   { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statSub:     { fontSize: 10, fontFamily: "Inter_400Regular" },
  liveChip:    { width: 220, padding: 12, borderRadius: 12, borderWidth: 1 },
  liveChipHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  liveLabel:   { fontSize: 10, fontFamily: "Inter_700Bold", color: "#E63946", letterSpacing: 0.5 },
  liveMin:     { fontSize: 10, fontFamily: "Inter_400Regular", color: "#E63946" },
  liveTeams:   { gap: 0 },
  liveTeamRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  liveTeamName:{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  liveScore:   { fontSize: 18, width: 24, textAlign: "center" },
  matchRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  matchStatus: { width: 38, alignItems: "center" },
  statusTxt:   { fontSize: 11, fontFamily: "Inter_700Bold" },
  matchTeams:  { flex: 1, paddingHorizontal: 10 },
  teamRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  teamName:    { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  matchScore:  { width: 20, alignItems: "center" },
  scoreNum:    { fontSize: 14, textAlign: "center" },
  scoreBlank:  { fontSize: 12, textAlign: "center" },
  pickChip:    { width: 190, padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  pickLeague:  { fontSize: 10, fontFamily: "Inter_500Medium" },
  pickMatch:   { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pickBadge:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  pickBadgeTxt:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
  pickProb:    { fontSize: 12, fontFamily: "Inter_700Bold" },
});
