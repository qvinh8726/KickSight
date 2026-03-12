import React, { useRef, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Platform,
  Animated, RefreshControl, TouchableOpacity, Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useNotifications } from "@/lib/notifications-context";
import { useI18n } from "@/lib/i18n";
import type { AllMatchesData, LiveMatch } from "@/lib/types";

function TeamBadge({ uri, size = 22 }: { uri: string | null; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254060" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 3 }} resizeMode="contain" onError={() => setFailed(true)} />;
}

function fmtTime(t: string) {
  if (!t || t === "TBD") return "TBD";
  const parts = t.split(":");
  if (parts.length < 2) return t;
  const h = parseInt(parts[0]);
  const m = parts[1];
  return `${h}:${m}`;
}

function MatchRow({ match, colors, onPress }: { match: LiveMatch; colors: any; onPress: () => void }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore = isLive || isFinished;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}
      style={[s.matchRow, { backgroundColor: colors.card, borderColor: isLive ? "#FF525240" : colors.border }]}>
      <View style={s.matchTime}>
        {isLive ? (
          <View style={s.liveBadge}><View style={s.liveDot} /><Text style={s.liveText}>LIVE</Text></View>
        ) : isFinished ? (
          <Text style={[s.timeText, { color: colors.textMuted }]}>FT</Text>
        ) : (
          <Text style={[s.timeText, { color: colors.accent }]}>{fmtTime(match.time)}</Text>
        )}
      </View>
      <View style={s.matchTeams}>
        <View style={s.teamRow}>
          <TeamBadge uri={match.home_badge} size={20} />
          <Text style={[s.teamName, { color: colors.text }]} numberOfLines={1}>{match.home_team}</Text>
          {hasScore && <Text style={[s.score, { color: colors.text }]}>{match.home_score}</Text>}
        </View>
        <View style={s.teamRow}>
          <TeamBadge uri={match.away_badge} size={20} />
          <Text style={[s.teamName, { color: colors.text }]} numberOfLines={1}>{match.away_team}</Text>
          {hasScore && <Text style={[s.score, { color: colors.text }]}>{match.away_score}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 48 : insets.top;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data, isLoading, refetch } = useQuery<AllMatchesData>({
    queryKey: ["/api/football/all-matches"],
    queryFn: () => apiRequest<AllMatchesData>("/api/football/all-matches"),
    refetchInterval: 60000,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/football/all-matches"] });
    setRefreshing(false);
  };

  const navigateToMatch = (m: LiveMatch) => {
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

  const liveMatches = (data?.upcoming ?? []).filter(m => m.status === "live");
  const upcoming = (data?.upcoming ?? []).filter(m => m.status === "scheduled").slice(0, 20);
  const results = (data?.results ?? []).slice(0, 10);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? t.goodMorning : h < 18 ? t.goodAfternoon : t.goodEvening;
  };

  const sections = [
    { key: "header", data: null },
    ...(liveMatches.length > 0 ? [{ key: "live-header", data: null }, ...liveMatches.map(m => ({ key: `live-${m.id}`, data: m, type: "match" as const }))] : []),
    { key: "upcoming-header", data: null },
    ...upcoming.map(m => ({ key: `up-${m.id}`, data: m, type: "match" as const })),
    ...(results.length > 0 ? [{ key: "results-header", data: null }, ...results.map(m => ({ key: `res-${m.id}`, data: m, type: "match" as const }))] : []),
  ];

  return (
    <Animated.View style={[s.root, { backgroundColor: colors.bg, paddingTop: topPad, opacity: fadeAnim }]}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={isLoading ? (
          <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
        ) : null}
        renderItem={({ item }) => {
          if (item.key === "header") return (
            <View style={[s.header, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[s.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
                <Text style={[s.appTitle, { color: colors.text }]}>KickSight</Text>
              </View>
              <View style={s.headerRight}>
                <TouchableOpacity onPress={() => router.push("/notifications")}
                  style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                  {unreadCount > 0 && <View style={[s.badge, { backgroundColor: colors.accent }]} />}
                </TouchableOpacity>
              </View>
            </View>
          );
          if (item.key === "live-header") return (
            <View style={s.sectionHeader}>
              <View style={s.sectionLeft}><View style={[s.liveDot, { marginRight: 6 }]} /><Text style={[s.sectionTitle, { color: "#FF5252" }]}>LIVE</Text></View>
            </View>
          );
          if (item.key === "upcoming-header") return (
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.textMuted }]}>UPCOMING</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/matches")}>
                <Text style={[s.seeAll, { color: colors.accent }]}>{t.seeAll}</Text>
              </TouchableOpacity>
            </View>
          );
          if (item.key === "results-header") return (
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.textMuted }]}>RESULTS</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/matches")}>
                <Text style={[s.seeAll, { color: colors.accent }]}>{t.seeAll}</Text>
              </TouchableOpacity>
            </View>
          );
          if (item.data && item.type === "match") {
            return <MatchRow match={item.data as LiveMatch} colors={colors} onPress={() => navigateToMatch(item.data as LiveMatch)} />;
          }
          return null;
        }}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 100 },
  header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 },
  greeting: { fontSize: 13 },
  appTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  badge: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionLeft: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  seeAll: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  matchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 3, padding: 12, borderRadius: 12, borderWidth: 1 },
  matchTime: { width: 44, alignItems: "center" },
  timeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FF525220", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF5252" },
  liveText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FF5252" },
  matchTeams: { flex: 1, marginLeft: 8 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 1 },
  teamName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  score: { fontSize: 14, fontFamily: "Inter_700Bold", width: 22, textAlign: "center" },
});
