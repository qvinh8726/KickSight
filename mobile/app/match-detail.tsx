import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";

function TeamBadge({ uri, size = 48 }: { uri: string | null; size?: number }) {
  if (!uri) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254040" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />;
}

function FormBadges({ form }: { form: string | null }) {
  if (!form) return null;
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {form.split("").slice(-5).map((c, i) => {
        let bg = "#666";
        if (c === "W") bg = "#00C853";
        else if (c === "L") bg = "#FF5252";
        else if (c === "D") bg = "#FFA726";
        return (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{c}</Text>
          </View>
        );
      })}
    </View>
  );
}

function StatBar({ label, homeVal, awayVal, colors }: { label: string; homeVal: string; awayVal: string; colors: any }) {
  const hNum = parseFloat(homeVal) || 0;
  const aNum = parseFloat(awayVal) || 0;
  const total = hNum + aNum || 1;
  const hPct = (hNum / total) * 100;

  return (
    <View style={styles.statRow}>
      <Text style={[styles.statVal, { color: colors.text, textAlign: "left" }]}>{homeVal}</Text>
      <View style={styles.statBarOuter}>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
        <View style={styles.statBarTrack}>
          <View style={[styles.statBarHome, { width: `${hPct}%`, backgroundColor: hNum >= aNum ? colors.accent : colors.textMuted + "60" }]} />
          <View style={[styles.statBarAway, { width: `${100 - hPct}%`, backgroundColor: aNum > hNum ? "#FF5252" : colors.textMuted + "60" }]} />
        </View>
      </View>
      <Text style={[styles.statVal, { color: colors.text, textAlign: "right" }]}>{awayVal}</Text>
    </View>
  );
}

export default function MatchDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    leagueKey: string;
    espnId: string;
    homeTeam: string;
    awayTeam: string;
    homeBadge: string;
    awayBadge: string;
    homeScore: string;
    awayScore: string;
    date: string;
    time: string;
    venue: string;
    status: string;
    league: string;
    homeForm: string;
    awayForm: string;
    homeRecord: string;
    awayRecord: string;
  }>();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/football/match-detail", params.leagueKey, params.espnId],
    queryFn: () => apiRequest(`/api/football/match-detail/${params.leagueKey}/${params.espnId}`),
    enabled: !!params.leagueKey && !!params.espnId,
  });

  const isFinished = params.status === "finished";
  const isLive = params.status === "live";
  const hasScore = isFinished || isLive;

  const fmtDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const fmtTime = (t: string) => {
    if (!t || t === "TBD") return "TBD";
    const parts = t.split(":");
    if (parts.length < 2) return t;
    const h = parseInt(parts[0]);
    const m = parts[1];
    return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  };

  const statsOrder = [
    "Possession", "SHOTS", "ON GOAL", "Fouls", "Corner Kicks",
    "Offsides", "Yellow Cards", "Red Cards", "Saves",
    "Accurate Passes", "Pass Completion %",
  ];

  const homeStats: Record<string, string> = (data as any)?.home_stats || {};
  const awayStats: Record<string, string> = (data as any)?.away_stats || {};
  const keyEvents: any[] = (data as any)?.key_events || [];
  const h2h: any[] = (data as any)?.head_to_head || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.textMuted }]}>{params.league || "Match Detail"}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isLive && (
            <View style={styles.liveBanner}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBannerText}>LIVE</Text>
            </View>
          )}

          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <TeamBadge uri={params.homeBadge || null} size={52} />
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>{params.homeTeam}</Text>
              {params.homeRecord && <Text style={[styles.teamRecord, { color: colors.textMuted }]}>{params.homeRecord}</Text>}
            </View>

            <View style={styles.scoreCol}>
              {hasScore ? (
                <View style={styles.scoreBox}>
                  <Text style={[styles.scoreBig, { color: colors.text }]}>{params.homeScore}</Text>
                  <Text style={[styles.scoreDash, { color: colors.textMuted }]}>-</Text>
                  <Text style={[styles.scoreBig, { color: colors.text }]}>{params.awayScore}</Text>
                </View>
              ) : (
                <Text style={[styles.vsText, { color: colors.accent }]}>VS</Text>
              )}
              {isFinished && (
                <View style={[styles.ftChip, { backgroundColor: colors.textMuted + "20" }]}>
                  <Text style={[styles.ftChipText, { color: colors.textMuted }]}>Full Time</Text>
                </View>
              )}
              {!hasScore && (
                <Text style={[styles.kickoffTime, { color: colors.accent }]}>{fmtTime(params.time)}</Text>
              )}
            </View>

            <View style={styles.teamCol}>
              <TeamBadge uri={params.awayBadge || null} size={52} />
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>{params.awayTeam}</Text>
              {params.awayRecord && <Text style={[styles.teamRecord, { color: colors.textMuted }]}>{params.awayRecord}</Text>}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>Form</Text>
              <FormBadges form={params.homeForm || (data as any)?.home_form || null} />
            </View>
            <View style={styles.formCol}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>Form</Text>
              <FormBadges form={params.awayForm || (data as any)?.away_form || null} />
            </View>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.text }]}>{fmtDate(params.date)}</Text>
          </View>
          {(params.venue || (data as any)?.venue) && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {(data as any)?.venue || params.venue}
                {(data as any)?.venue_city ? `, ${(data as any).venue_city}` : ""}
              </Text>
            </View>
          )}
          {(data as any)?.attendance && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>{Number((data as any).attendance).toLocaleString()} attendance</Text>
            </View>
          )}
          {(data as any)?.referee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>Referee: {(data as any).referee}</Text>
            </View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading match details...</Text>
          </View>
        )}

        {keyEvents.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Events</Text>
            {keyEvents.map((ev, i) => {
              let icon: any = "football-outline";
              let iconColor = colors.accent;
              if (ev.type.includes("Yellow")) { icon = "square"; iconColor = "#FFA726"; }
              else if (ev.type.includes("Red")) { icon = "square"; iconColor = "#FF5252"; }
              else if (ev.type.includes("Goal")) { icon = "football"; iconColor = colors.accent; }
              else if (ev.type.includes("Substitution")) { icon = "swap-horizontal"; iconColor = colors.textMuted; }

              return (
                <View key={i} style={[styles.eventRow, { borderBottomColor: i < keyEvents.length - 1 ? colors.border : "transparent" }]}>
                  <Text style={[styles.eventClock, { color: colors.accent }]}>{ev.clock}</Text>
                  <Ionicons name={icon} size={14} color={iconColor} />
                  <Text style={[styles.eventText, { color: colors.text }]} numberOfLines={2}>{ev.text}</Text>
                </View>
              );
            })}
          </View>
        )}

        {Object.keys(homeStats).length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Match Statistics</Text>
            <View style={styles.statTeamHeader}>
              <Text style={[styles.statTeamName, { color: colors.text }]}>{params.homeTeam?.split(" ").pop()}</Text>
              <Text style={[styles.statTeamName, { color: colors.text }]}>{params.awayTeam?.split(" ").pop()}</Text>
            </View>
            {statsOrder.map((label) => {
              const hv = homeStats[label];
              const av = awayStats[label];
              if (!hv && !av) return null;
              return <StatBar key={label} label={label} homeVal={hv || "0"} awayVal={av || "0"} colors={colors} />;
            })}
          </View>
        )}

        {h2h.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Head to Head</Text>
            {h2h.map((g: any, i: number) => (
              <View key={i} style={[styles.h2hRow, { borderBottomColor: i < h2h.length - 1 ? colors.border : "transparent" }]}>
                <Text style={[styles.h2hDate, { color: colors.textMuted }]}>{g.date}</Text>
                <Text style={[styles.h2hTeam, { color: colors.text }]} numberOfLines={1}>{g.home}</Text>
                <View style={[styles.h2hScore, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.h2hScoreText, { color: colors.text }]}>{g.home_score} - {g.away_score}</Text>
                </View>
                <Text style={[styles.h2hTeam, { color: colors.text, textAlign: "right" }]} numberOfLines={1}>{g.away}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  loadingBox: { alignItems: "center", marginTop: 30, gap: 10 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  liveBanner: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", backgroundColor: "#FF525220", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5252" },
  liveBannerText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FF5252" },
  teamsRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  teamCol: { flex: 1, alignItems: "center", gap: 8 },
  teamName: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  teamRecord: { fontSize: 10, fontFamily: "Inter_400Regular" },
  scoreCol: { alignItems: "center", justifyContent: "center", paddingHorizontal: 8, gap: 6, minWidth: 100 },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreBig: { fontSize: 36, fontFamily: "Inter_700Bold" },
  scoreDash: { fontSize: 24 },
  vsText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  kickoffTime: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ftChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  ftChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  formRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
  formCol: { alignItems: "center", gap: 4 },
  formLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },

  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },

  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  eventClock: { fontSize: 12, fontFamily: "Inter_700Bold", width: 32 },
  eventText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  statTeamHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  statTeamName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statVal: { fontSize: 13, fontFamily: "Inter_700Bold", width: 40 },
  statBarOuter: { flex: 1, gap: 3 },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statBarTrack: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" },
  statBarHome: { height: 6, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  statBarAway: { height: 6, borderTopRightRadius: 3, borderBottomRightRadius: 3 },

  h2hRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 6 },
  h2hDate: { fontSize: 10, fontFamily: "Inter_400Regular", width: 72 },
  h2hTeam: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  h2hScore: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  h2hScoreText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
