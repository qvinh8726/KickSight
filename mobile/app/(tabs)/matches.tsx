/**
 * matches.tsx  Sofascore/Uniscore-style match browser
 * Layout: Date carousel  Mode tabs  Matches grouped by league (sticky headers)
 */
import React, { useState, useRef, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
  ActivityIndicator, RefreshControl, Image, SectionList, Animated,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import type { AllMatchesData, LiveMatch, StandingsData, StandingEntry } from "@/lib/types";

// league accent colours
const LEAGUE_META: Record<string, { name: string; color: string }> = {
  epl:        { name: "Premier League",    color: "#3D195B" },
  laliga:     { name: "La Liga",           color: "#EE3340" },
  bundesliga: { name: "Bundesliga",        color: "#D20515" },
  seriea:     { name: "Serie A",           color: "#1A56A6" },
  ligue1:     { name: "Ligue 1",           color: "#091C3E" },
  ucl:        { name: "Champions League",  color: "#0B3D91" },
  uel:        { name: "Europa League",     color: "#F77F00" },
  uecl:       { name: "Conference League", color: "#00A859" },
  efl:        { name: "EFL Cup",           color: "#7B2D8B" },
};
const LEAGUE_ORDER = ["epl","laliga","bundesliga","seriea","ligue1","ucl","uel","uecl","efl"];

function buildDateRange() {
  const dates: { iso: string; dayLabel: string; numLabel: string; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = -2; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      iso: d.toISOString().split("T")[0],
      dayLabel: i === 0 ? "TODAY" : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      numLabel: String(d.getDate()),
      isToday: i === 0,
    });
  }
  return dates;
}
const DATES = buildDateRange();

function fmtTime(t: string) {
  if (!t || t === "TBD") return "TBD";
  const [h, m] = t.split(":");
  if (!m) return t;
  return `${parseInt(h).toString().padStart(2, "0")}:${m}`;
}

function TeamBadge({ uri, size = 20 }: { uri: string | null; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed)
    return <View style={{ width: size, height: size, borderRadius: 3, backgroundColor: "#FFFFFF10" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 3 }} resizeMode="contain" onError={() => setFailed(true)} />;
}

function FormBadges({ form, colors }: { form: string; colors: any }) {
  if (!form) return null;
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {form.split("").slice(-5).map((c, i) => {
        const color = c === "W" ? "#2DC653" : c === "L" ? "#E63946" : "#636B82";
        return (
          <View key={i} style={{ width: 15, height: 15, borderRadius: 3, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 8, fontFamily: "Inter_700Bold", color }}>{c}</Text>
          </View>
        );
      })}
    </View>
  );
}

function LeagueHeader({ leagueKey, count, colors }: { leagueKey: string; count: number; colors: any }) {
  const meta = LEAGUE_META[leagueKey];
  const name = meta?.name ?? leagueKey.toUpperCase();
  const accent = meta?.color ?? "#0B7FFF";
  return (
    <View style={[ss.leagueHeader, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
      <View style={[ss.leagueBar, { backgroundColor: accent }]} />
      <Text style={[ss.leagueName, { color: colors.text }]}>{name}</Text>
      <Text style={[ss.leagueCount, { color: colors.textMuted }]}>{count} matches</Text>
    </View>
  );
}

function MatchRow({ m, colors, onPress }: { m: LiveMatch; colors: any; onPress: () => void }) {
  const isLive     = m.status === "live";
  const isFinished = m.status === "finished";
  const hasScore   = isLive || isFinished;
  const hmWin      = hasScore && (m.home_score ?? 0) > (m.away_score ?? 0);
  const awWin      = hasScore && (m.away_score ?? 0) > (m.home_score ?? 0);

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}
      style={[ss.row, { borderBottomColor: colors.borderLight }]}>
      {/* Status / Time */}
      <View style={ss.statusCol}>
        {isLive ? (
          <>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#E63946" }} />
            <Text style={ss.liveMin}>{m.status_detail || "LIVE"}</Text>
          </>
        ) : isFinished ? (
          <Text style={[ss.statusTxt, { color: colors.textMuted }]}>FT</Text>
        ) : (
          <Text style={[ss.statusTxt, { color: colors.accent }]}>{fmtTime(m.time)}</Text>
        )}
      </View>
      {/* Teams */}
      <View style={ss.teamsCol}>
        <View style={ss.teamLine}>
          <TeamBadge uri={m.home_badge} size={18} />
          <Text style={[ss.teamName, { color: isFinished && !hmWin ? colors.textSecondary : colors.text }]} numberOfLines={1}>
            {m.home_team}
          </Text>
        </View>
        <View style={[ss.teamLine, { marginTop: 8 }]}>
          <TeamBadge uri={m.away_badge} size={18} />
          <Text style={[ss.teamName, { color: isFinished && !awWin ? colors.textSecondary : colors.text }]} numberOfLines={1}>
            {m.away_team}
          </Text>
        </View>
      </View>
      {/* Score */}
      <View style={ss.scoreCol}>
        {hasScore ? (
          <>
            <Text style={[ss.score, { color: hmWin ? colors.text : colors.textSecondary, fontFamily: "Inter_700Bold" }]}>{m.home_score}</Text>
            <Text style={[ss.score, { color: awWin ? colors.text : colors.textSecondary, fontFamily: "Inter_700Bold", marginTop: 8 }]}>{m.away_score}</Text>
          </>
        ) : (
          <>
            <Text style={[ss.scoreBlank, { color: colors.borderLight }]}></Text>
            <Text style={[ss.scoreBlank, { color: colors.borderLight, marginTop: 8 }]}></Text>
          </>
        )}
      </View>
      <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

function StandingsTable({ standings, colors }: { standings: StandingEntry[]; colors: any }) {
  if (!standings.length)
    return <View style={ss.center}><Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular" }}>No standings available</Text></View>;
  return (
    <View style={[ss.standTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[ss.standHead, { borderBottomColor: colors.border }]}>
        {["#","Club","P","W","D","L","GD","Pts","Form"].map((h,i) => (
          <Text key={h} style={[ss.sh, { width: i===1?undefined:i===8?84:28, flex: i===1?1:undefined, textAlign: i===1?"left":"center", color: colors.textMuted }]}>{h}</Text>
        ))}
      </View>
      {standings.map((row, idx) => {
        const ucl = row.rank <= 4, uel = row.rank === 5 || row.rank === 6;
        const rel = row.rank >= standings.length - 2;
        const dot = ucl ? "#0B7FFF" : uel ? "#F0BF26" : rel ? "#E63946" : "transparent";
        return (
          <View key={row.team} style={[ss.standRow, { borderBottomColor: colors.borderLight, borderBottomWidth: idx < standings.length-1 ? 1 : 0 }]}>
            <View style={[ss.standDot, { backgroundColor: dot }]} />
            <Text style={[ss.sdRank, { color: ucl ? "#0B7FFF" : rel ? "#E63946" : colors.textSecondary }]}>{row.rank}</Text>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TeamBadge uri={row.badge} size={18} />
              <Text style={[ss.sdTeam, { color: colors.text }]} numberOfLines={1}>{row.team}</Text>
            </View>
            {[row.played,row.win,row.draw,row.loss].map((v,i)=>(
              <Text key={i} style={[ss.sdStat, { color: colors.textSecondary }]}>{v}</Text>
            ))}
            <Text style={[ss.sdStat, { color: row.goal_diff>0?"#2DC653":row.goal_diff<0?"#E63946":colors.textSecondary }]}>
              {row.goal_diff>0?"+":""}{row.goal_diff}
            </Text>
            <Text style={[ss.sdPts, { color: colors.text }]}>{row.points}</Text>
            <View style={{ width: 84 }}><FormBadges form={row.form} colors={colors} /></View>
          </View>
        );
      })}
    </View>
  );
}

const STAND_LEAGUES = [
  { key: "epl", label: "PL" }, { key: "laliga", label: "LaLiga" },
  { key: "bundesliga", label: "Bund." }, { key: "seriea", label: "Serie A" },
  { key: "ligue1", label: "Ligue 1" }, { key: "ucl", label: "UCL" },
];

const VIEW_MODES = ["upcoming", "results", "standings"] as const;

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const { colors } = useTheme();
  const router = useRouter();

  const [viewMode,    setViewMode]    = useState<typeof VIEW_MODES[number]>("upcoming");
  const [selDate,     setSelDate]     = useState(DATES.find(d => d.isToday)!.iso);
  const [standLeague, setStandLeague] = useState("epl");
  const [refreshing,  setRefreshing]  = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<AllMatchesData>({
    queryKey: ["/api/football/all-matches"],
    queryFn: () => apiRequest<AllMatchesData>("/api/football/all-matches"),
    refetchInterval: 60_000,
  });

  const { data: standingsData, isLoading: standLoad } = useQuery<StandingsData>({
    queryKey: ["/api/football/standings", standLeague],
    queryFn: () => apiRequest<StandingsData>(`/api/football/standings?league=${standLeague}`),
    enabled: viewMode === "standings",
    refetchInterval: viewMode === "standings" ? 2 * 60_000 : false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(),
      viewMode === "standings"
        ? queryClient.invalidateQueries({ queryKey: ["/api/football/standings", standLeague] })
        : Promise.resolve()]);
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const pool = viewMode === "results" ? (data?.results ?? []) : (data?.upcoming ?? []);
    const forDate = pool.filter(m => m.date === selDate);
    const toShow  = forDate.length > 0 ? forDate : pool;
    const byLeague = new Map<string, LiveMatch[]>();
    for (const m of toShow) {
      const k = m.league_key ?? "other";
      if (!byLeague.has(k)) byLeague.set(k, []);
      byLeague.get(k)!.push(m);
    }
    const ordered: { leagueKey: string; matches: LiveMatch[] }[] = [];
    for (const k of LEAGUE_ORDER) if (byLeague.has(k)) ordered.push({ leagueKey: k, matches: byLeague.get(k)! });
    for (const [k, ms] of byLeague) if (!LEAGUE_ORDER.includes(k)) ordered.push({ leagueKey: k, matches: ms });
    return ordered;
  }, [data, selDate, viewMode]);

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

  return (
    <View style={[ss.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>

      {/* Mode tabs */}
      <View style={[ss.modeTabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {VIEW_MODES.map(mode => (
          <TouchableOpacity key={mode} activeOpacity={0.7}
            style={[ss.modeTab, viewMode === mode && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
            onPress={() => setViewMode(mode)}>
            <Text style={[ss.modeTabTxt, { color: viewMode === mode ? colors.accent : colors.textMuted }]}>
              {mode === "upcoming" ? "Upcoming" : mode === "results" ? "Results" : "Standings"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date carousel */}
      {viewMode !== "standings" && (
        <View style={[ss.datePicker, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
            {DATES.map(d => {
              const active = d.iso === selDate;
              return (
                <TouchableOpacity key={d.iso} activeOpacity={0.7}
                  style={[ss.dateItem, active && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
                  onPress={() => setSelDate(d.iso)}>
                  <Text style={[ss.dateDayLbl, { color: d.isToday ? colors.accent : colors.textSecondary, fontFamily: d.isToday ? "Inter_700Bold" : "Inter_500Medium" }]}>
                    {d.dayLabel}
                  </Text>
                  <Text style={[ss.dateNumLbl, { color: active ? colors.accent : colors.textMuted }]}>{d.numLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Standings league switcher */}
      {viewMode === "standings" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={[ss.standLgPicker, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: "center" }}>
          {STAND_LEAGUES.map(l => (
            <TouchableOpacity key={l.key} activeOpacity={0.7}
              style={[ss.slChip, { borderColor: standLeague === l.key ? colors.accent : colors.border },
                standLeague === l.key && { backgroundColor: colors.accentBg }]}
              onPress={() => setStandLeague(l.key)}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: standLeague === l.key ? colors.accent : colors.textSecondary }}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={ss.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : isError ? (
        <View style={ss.center}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 10, fontFamily: "Inter_400Regular" }}>Failed to load matches</Text>
        </View>
      ) : viewMode === "standings" ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
          {standLoad
            ? <View style={ss.center}><ActivityIndicator color={colors.accent} /></View>
            : <StandingsTable standings={standingsData?.standings ?? []} colors={colors} />}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections.map(s => ({ key: s.leagueKey, data: s.matches, leagueKey: s.leagueKey, count: s.matches.length }))}
          keyExtractor={(item, idx) => item.id + String(idx)}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={ss.center}>
              <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 10, fontFamily: "Inter_400Regular" }}>No matches</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <LeagueHeader leagueKey={(section as any).leagueKey} count={(section as any).count} colors={colors} />
          )}
          renderItem={({ item }) => <MatchRow m={item} colors={colors} onPress={() => navigateTo(item)} />}
        />
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  root:        { flex: 1 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  modeTabs:    { flexDirection: "row", borderBottomWidth: 1 },
  modeTab:     { flex: 1, alignItems: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  modeTabTxt:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  datePicker:  { borderBottomWidth: 1, paddingVertical: 4 },
  dateItem:    { alignItems: "center", paddingHorizontal: 13, paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: "transparent", minWidth: 52 },
  dateDayLbl:  { fontSize: 9, letterSpacing: 0.6 },
  dateNumLbl:  { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  standLgPicker: { maxHeight: 50, borderBottomWidth: 1, paddingVertical: 6 },
  slChip:      { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  leagueHeader:{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  leagueBar:   { width: 3, height: 16, borderRadius: 2 },
  leagueName:  { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold" },
  leagueCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  row:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  statusCol:   { width: 40, alignItems: "center", gap: 3 },
  statusTxt:   { fontSize: 11, fontFamily: "Inter_700Bold" },
  liveMin:     { fontSize: 10, fontFamily: "Inter_700Bold", color: "#E63946" },
  teamsCol:    { flex: 1, paddingHorizontal: 10 },
  teamLine:    { flexDirection: "row", alignItems: "center", gap: 9 },
  teamName:    { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  scoreCol:    { width: 20, alignItems: "center" },
  score:       { fontSize: 14, textAlign: "center" },
  scoreBlank:  { fontSize: 12, textAlign: "center", fontFamily: "Inter_400Regular" },
  standTable:  { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  standHead:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1 },
  sh:          { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  standRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  standDot:    { width: 3, height: 18, borderRadius: 2, marginRight: 6 },
  sdRank:      { width: 22, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  sdTeam:      { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  sdStat:      { width: 28, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  sdPts:       { width: 28, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
});
