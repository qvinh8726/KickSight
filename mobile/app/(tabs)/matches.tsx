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
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import type { AllMatchesData, LiveMatch, StandingsData, StandingEntry } from "@/lib/types";

const LEAGUE_TABS = [
  { key: "all", label: "All" },
  { key: "epl", label: "EPL" },
  { key: "laliga", label: "La Liga" },
  { key: "bundesliga", label: "BL" },
  { key: "seriea", label: "Serie A" },
  { key: "ligue1", label: "L1" },
  { key: "ucl", label: "UCL" },
];

const VIEW_MODES = ["Upcoming", "Results", "Standings"] as const;

function fmtDate(d: string) {
  const dt = new Date(d);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dt.toDateString() === today.toDateString()) return "Today";
  if (dt.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(t: string) {
  if (!t || t === "TBD") return "TBD";
  const parts = t.split(":");
  if (parts.length < 2) return t;
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function groupByDate(matches: LiveMatch[]) {
  const groups: { date: string; label: string; matches: LiveMatch[] }[] = [];
  const map = new Map<string, LiveMatch[]>();
  for (const m of matches) {
    const d = m.date;
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(m);
  }
  for (const [date, ms] of map) {
    groups.push({ date, label: fmtDate(date), matches: ms });
  }
  return groups;
}

function TeamBadge({ uri, size = 28 }: { uri: string | null; size?: number }) {
  if (!uri) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254040" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 4 }} resizeMode="contain" />;
}

function FormBadges({ form, colors }: { form: string; colors: any }) {
  if (!form) return null;
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {form.split("").slice(-5).map((c, i) => {
        let bg = colors.textMuted;
        if (c === "W") bg = "#00C853";
        else if (c === "L") bg = "#FF5252";
        else if (c === "D") bg = "#FFA726";
        return (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 8, fontFamily: "Inter_700Bold", color: "#FFF" }}>{c}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [viewMode, setViewMode] = useState<typeof VIEW_MODES[number]>("Upcoming");
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<AllMatchesData>({
    queryKey: ["/api/football/all-matches"],
    queryFn: () => apiRequest<AllMatchesData>("/api/football/all-matches"),
    refetchInterval: 60 * 1000,
  });

  const standingsLeague = selectedLeague === "all" ? "epl" : selectedLeague;
  const { data: standingsData, isLoading: standingsLoading } = useQuery<StandingsData>({
    queryKey: ["/api/football/standings", standingsLeague],
    queryFn: () => apiRequest<StandingsData>(`/api/football/standings?league=${standingsLeague}`),
    enabled: viewMode === "Standings",
    refetchInterval: viewMode === "Standings" ? 2 * 60 * 1000 : false,
  });

  const filterByLeague = (matches: LiveMatch[]) => {
    if (selectedLeague === "all") return matches;
    return matches.filter((m) => m.league_key === selectedLeague);
  };

  const upcoming = filterByLeague(data?.upcoming ?? []);
  const results = filterByLeague(data?.results ?? []);
  const upcomingGroups = groupByDate(upcoming);
  const resultsGroups = groupByDate(results);

  const onRefresh = async () => {
    setRefreshing(true);
    const promises: Promise<any>[] = [refetch()];
    if (viewMode === "Standings") {
      promises.push(queryClient.invalidateQueries({ queryKey: ["/api/football/standings", standingsLeague] }));
    }
    await Promise.all(promises);
    setRefreshing(false);
  };

  const totalMatches = viewMode === "Upcoming" ? upcoming.length : viewMode === "Results" ? results.length : (standingsData?.standings?.length ?? 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <Ionicons name="football" size={24} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>Matches</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {totalMatches} {viewMode === "Standings" ? "teams" : "matches"}
        </Text>
      </Animated.View>

      <View style={[styles.viewModeRow, { borderBottomColor: colors.border }]}>
        {VIEW_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewModeBtn, viewMode === mode && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
            onPress={() => setViewMode(mode)}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewModeText, { color: viewMode === mode ? colors.accent : colors.textMuted }]}>{mode}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.leagueScroll}
        contentContainerStyle={styles.leagueScrollContent}
      >
        {LEAGUE_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.leagueChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedLeague === tab.key && { backgroundColor: colors.accent + "20", borderColor: colors.accent },
            ]}
            onPress={() => setSelectedLeague(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.leagueChipText,
              { color: selectedLeague === tab.key ? colors.accent : colors.textMuted },
            ]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading matches...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.loadingBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF5252" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Could not load matches</Text>
          </View>
        )}

        {viewMode === "Upcoming" && upcomingGroups.map((group) => (
          <View key={group.date}>
            <View style={[styles.dateHeader, { backgroundColor: colors.card + "80" }]}>
              <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{group.label}</Text>
              <Text style={[styles.dateHeaderCount, { color: colors.textMuted }]}>{group.matches.length} matches</Text>
            </View>
            {group.matches.map((m) => (
              <MatchRow key={m.id} match={m} colors={colors} />
            ))}
          </View>
        ))}

        {viewMode === "Results" && resultsGroups.map((group) => (
          <View key={group.date}>
            <View style={[styles.dateHeader, { backgroundColor: colors.card + "80" }]}>
              <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{group.label}</Text>
            </View>
            {group.matches.map((m) => (
              <MatchRow key={m.id} match={m} colors={colors} />
            ))}
          </View>
        ))}

        {viewMode === "Standings" && (
          standingsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : (
            <StandingsTable standings={standingsData?.standings ?? []} colors={colors} />
          )
        )}

        {!isLoading && !isError && viewMode !== "Standings" && (
          (viewMode === "Upcoming" ? upcoming : results).length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No {viewMode.toLowerCase()} matches found</Text>
            </View>
          )
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

function MatchRow({ match, colors }: { match: LiveMatch; colors: any }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const hasScore = isFinished || isLive;

  return (
    <View style={[styles.matchRow, { backgroundColor: colors.card, borderColor: isLive ? "#FF5252" : colors.border }]}>
      <View style={styles.matchLeagueTag}>
        <Text style={[styles.matchLeagueText, { color: colors.textMuted }]}>{match.league}</Text>
        {match.round && <Text style={[styles.matchRound, { color: colors.textMuted }]}>R{match.round}</Text>}
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.matchTeamRow}>
          <TeamBadge uri={match.home_badge} size={24} />
          <Text style={[styles.matchTeamName, { color: colors.text }]} numberOfLines={1}>{match.home_team}</Text>
          {hasScore && (
            <Text style={[styles.matchScore, {
              color: match.home_score! > match.away_score! ? colors.accent : match.home_score! < match.away_score! ? colors.textMuted : colors.text,
              fontFamily: "Inter_700Bold",
            }]}>{match.home_score}</Text>
          )}
        </View>
        <View style={styles.matchTeamRow}>
          <TeamBadge uri={match.away_badge} size={24} />
          <Text style={[styles.matchTeamName, { color: colors.text }]} numberOfLines={1}>{match.away_team}</Text>
          {hasScore && (
            <Text style={[styles.matchScore, {
              color: match.away_score! > match.home_score! ? colors.accent : match.away_score! < match.home_score! ? colors.textMuted : colors.text,
              fontFamily: "Inter_700Bold",
            }]}>{match.away_score}</Text>
          )}
        </View>
      </View>

      {!hasScore && (
        <View style={styles.matchTimeBox}>
          <Text style={[styles.matchTime, { color: colors.accent }]}>{fmtTime(match.time)}</Text>
          {match.venue && <Text style={[styles.matchVenue, { color: colors.textMuted }]} numberOfLines={1}>{match.venue}</Text>}
        </View>
      )}

      {isFinished && (
        <View style={styles.matchStatusBox}>
          <View style={[styles.ftBadge, { backgroundColor: colors.textMuted + "20" }]}>
            <Text style={[styles.ftText, { color: colors.textMuted }]}>FT</Text>
          </View>
        </View>
      )}

      {isLive && match.status_detail && (
        <View style={styles.matchStatusBox}>
          <View style={[styles.ftBadge, { backgroundColor: "#FF525220" }]}>
            <Text style={[styles.ftText, { color: "#FF5252" }]}>{match.status_detail}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function StandingsTable({ standings, colors }: { standings: StandingEntry[]; colors: any }) {
  if (standings.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="podium-outline" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No standings available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.standingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.standingsHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sthRank, { color: colors.textMuted }]}>#</Text>
        <Text style={[styles.sthTeam, { color: colors.textMuted }]}>Team</Text>
        <Text style={[styles.sthStat, { color: colors.textMuted }]}>P</Text>
        <Text style={[styles.sthStat, { color: colors.textMuted }]}>W</Text>
        <Text style={[styles.sthStat, { color: colors.textMuted }]}>D</Text>
        <Text style={[styles.sthStat, { color: colors.textMuted }]}>L</Text>
        <Text style={[styles.sthStat, { color: colors.textMuted }]}>GD</Text>
        <Text style={[styles.sthPts, { color: colors.textMuted }]}>Pts</Text>
        <Text style={[styles.sthForm, { color: colors.textMuted }]}>Form</Text>
      </View>

      {standings.map((row, idx) => {
        const isTop4 = row.rank <= 4;
        const isBottom3 = row.rank >= standings.length - 2;
        let borderLeftColor = "transparent";
        if (isTop4) borderLeftColor = "#00C853";
        else if (isBottom3) borderLeftColor = "#FF5252";

        return (
          <View key={row.team} style={[styles.standingsRow, {
            borderBottomColor: colors.border,
            borderBottomWidth: idx < standings.length - 1 ? 1 : 0,
          }]}>
            <View style={[styles.rankIndicator, { backgroundColor: borderLeftColor }]} />
            <Text style={[styles.stRank, { color: isTop4 ? "#00C853" : isBottom3 ? "#FF5252" : colors.text }]}>{row.rank}</Text>
            <View style={styles.stTeamRow}>
              <TeamBadge uri={row.badge} size={20} />
              <Text style={[styles.stTeamName, { color: colors.text }]} numberOfLines={1}>{row.team}</Text>
            </View>
            <Text style={[styles.stStat, { color: colors.textSecondary }]}>{row.played}</Text>
            <Text style={[styles.stStat, { color: colors.textSecondary }]}>{row.win}</Text>
            <Text style={[styles.stStat, { color: colors.textSecondary }]}>{row.draw}</Text>
            <Text style={[styles.stStat, { color: colors.textSecondary }]}>{row.loss}</Text>
            <Text style={[styles.stStat, { color: row.goal_diff > 0 ? "#00C853" : row.goal_diff < 0 ? "#FF5252" : colors.textSecondary }]}>
              {row.goal_diff > 0 ? "+" : ""}{row.goal_diff}
            </Text>
            <Text style={[styles.stPts, { color: colors.text }]}>{row.points}</Text>
            <FormBadges form={row.form} colors={colors} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  viewModeRow: { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1 },
  viewModeBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  viewModeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  leagueScroll: { maxHeight: 44 },
  leagueScrollContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, alignItems: "center" },
  leagueChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  leagueChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10, marginBottom: 4 },
  dateHeaderText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dateHeaderCount: { fontSize: 11, fontFamily: "Inter_400Regular" },

  matchRow: { borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1 },
  matchLeagueTag: { flexDirection: "row", gap: 6, marginBottom: 8 },
  matchLeagueText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  matchRound: { fontSize: 10, fontFamily: "Inter_400Regular" },
  matchTeams: { gap: 6 },
  matchTeamRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  matchTeamName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  matchScore: { fontSize: 18, width: 28, textAlign: "center" },
  matchTimeBox: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  matchTime: { fontSize: 12, fontFamily: "Inter_700Bold" },
  matchVenue: { fontSize: 10, fontFamily: "Inter_400Regular", flex: 1 },
  matchStatusBox: { marginTop: 8, flexDirection: "row" },
  ftBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  ftText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FF525220", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF5252" },
  liveText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FF5252" },

  standingsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginTop: 8 },
  standingsHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1 },
  sthRank: { width: 24, fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  sthTeam: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", marginLeft: 4 },
  sthStat: { width: 24, fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  sthPts: { width: 28, fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" },
  sthForm: { width: 76, fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  standingsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  rankIndicator: { width: 3, height: 20, borderRadius: 2, marginRight: 4 },
  stRank: { width: 20, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  stTeamRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 4 },
  stTeamName: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  stStat: { width: 24, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  stPts: { width: 28, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
});
