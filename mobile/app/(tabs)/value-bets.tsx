/**
 * value-bets.tsx  AI Picks screen, Sofascore-style
 * Clean card layout: match info + confidence bar + pick selections
 */
import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Platform,
  TouchableOpacity, Image, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";

function TeamBadge({ uri, size = 28 }: { uri: string | null; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) return <View style={{ width: size, height: size, borderRadius: 4, backgroundColor: "#ffffff10" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 4 }} resizeMode="contain" onError={() => setFailed(true)} />;
}

interface Pick { market: string; pick: string; fairOdds: number; probability: number; status: string; }
interface PickCard {
  matchId: string; espnId: string;
  homeTeam: string; awayTeam: string; homeBadge: string | null; awayBadge: string | null;
  date: string; time: string; league: string; leagueKey: string;
  probHome: number; probDraw: number; probAway: number;
  confidence: number; picks: Pick[];
}

function ConfidenceBar({ value, colors }: { value: number; colors: any }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? colors.win : pct >= 50 ? colors.yellow : colors.danger;
  return (
    <View style={vb.confRow}>
      <View style={[vb.confTrack, { backgroundColor: colors.borderLight }]}>
        <View style={[vb.confFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[vb.confPct, { color }]}>{pct}%</Text>
    </View>
  );
}

function PickBubble({ pick, colors }: { pick: Pick; colors: any }) {
  const prob = Math.round(pick.probability * 100);
  const isStrong = prob >= 65;
  const accent = isStrong ? colors.win : colors.accent;
  return (
    <View style={[vb.bubble, { backgroundColor: accent + "18", borderColor: accent + "35" }]}>
      <Text style={[vb.bubbleMarket, { color: colors.textMuted }]}>{pick.market}</Text>
      <Text style={[vb.bubblePick, { color: colors.text }]}>{pick.pick}</Text>
      <View style={vb.bubbleFooter}>
        <Text style={[vb.bubbleOdds, { color: accent }]}>@{pick.fairOdds.toFixed(2)}</Text>
        <View style={[vb.bubbleProb, { backgroundColor: accent + "22" }]}>
          <Text style={[vb.bubbleProbTxt, { color: accent }]}>{prob}%</Text>
        </View>
      </View>
    </View>
  );
}

function PickCard({ card, colors, onPress }: { card: PickCard; colors: any; onPress: () => void }) {
  const fmtTime = (t: string) => {
    if (!t || t === "TBD") return "TBD";
    const [h, m] = t.split(":");
    return m ? `${parseInt(h).toString().padStart(2, "0")}:${m}` : t;
  };
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    const today = new Date();
    if (dt.toDateString() === today.toDateString()) return "Today";
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const topPick = card.picks[0];

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[vb.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* League + date */}
      <View style={vb.cardHeader}>
        <Text style={[vb.cardLeague, { color: colors.textMuted }]}>{card.league}</Text>
        <Text style={[vb.cardDate, { color: colors.textMuted }]}>{fmtDate(card.date)}  {fmtTime(card.time)}</Text>
      </View>

      {/* Teams */}
      <View style={vb.matchRow}>
        <View style={vb.teamSide}>
          <TeamBadge uri={card.homeBadge} size={32} />
          <Text style={[vb.teamName, { color: colors.text }]} numberOfLines={2}>{card.homeTeam}</Text>
        </View>
        <View style={vb.vsBox}>
          <Text style={[vb.vsTxt, { color: colors.textMuted }]}>VS</Text>
        </View>
        <View style={[vb.teamSide, { alignItems: "flex-end" }]}>
          <TeamBadge uri={card.awayBadge} size={32} />
          <Text style={[vb.teamName, { color: colors.text, textAlign: "right" }]} numberOfLines={2}>{card.awayTeam}</Text>
        </View>
      </View>

      {/* Probability bar */}
      <View style={[vb.probRow, { backgroundColor: colors.bg, borderRadius: 6, overflow: "hidden", marginVertical: 10 }]}>
        <View style={[vb.probHome, { flex: card.probHome, backgroundColor: colors.accent + "BB" }]} />
        <View style={[vb.probDraw, { flex: card.probDraw, backgroundColor: colors.textMuted + "66" }]} />
        <View style={[vb.probAway, { flex: card.probAway, backgroundColor: colors.danger + "BB" }]} />
      </View>
      <View style={vb.probLabels}>
        <Text style={[vb.probLbl, { color: colors.accent }]}>{Math.round(card.probHome * 100)}%</Text>
        <Text style={[vb.probLbl, { color: colors.textMuted }]}>Draw {Math.round(card.probDraw * 100)}%</Text>
        <Text style={[vb.probLbl, { color: colors.danger }]}>{Math.round(card.probAway * 100)}%</Text>
      </View>

      {/* Confidence */}
      <View style={[vb.divider, { backgroundColor: colors.borderLight }]} />
      <View style={vb.confHeader}>
        <Text style={[vb.confLabel, { color: colors.textMuted }]}>AI Confidence</Text>
      </View>
      <ConfidenceBar value={card.confidence} colors={colors} />

      {/* Top picks */}
      {card.picks.length > 0 && (
        <View style={vb.picksRow}>
          {card.picks.slice(0, 3).map((p, i) => (
            <PickBubble key={i} pick={p} colors={colors} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function StatsBar({ stats, colors }: { stats: any; colors: any }) {
  const winPct = Math.round((stats.winRate ?? 0) * 100);
  const roi = (stats.roi ?? 0).toFixed(1);
  return (
    <View style={[vb.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={vb.statItem}>
        <Text style={[vb.statVal, { color: colors.win }]}>{winPct}%</Text>
        <Text style={[vb.statKey, { color: colors.textMuted }]}>Win Rate</Text>
      </View>
      <View style={[vb.statDivider, { backgroundColor: colors.border }]} />
      <View style={vb.statItem}>
        <Text style={[vb.statVal, { color: stats.roi >= 0 ? colors.win : colors.danger }]}>{stats.roi >= 0 ? "+" : ""}{roi}%</Text>
        <Text style={[vb.statKey, { color: colors.textMuted }]}>ROI</Text>
      </View>
      <View style={[vb.statDivider, { backgroundColor: colors.border }]} />
      <View style={vb.statItem}>
        <Text style={[vb.statVal, { color: colors.accent }]}>{stats.totalPicks ?? 0}</Text>
        <Text style={[vb.statKey, { color: colors.textMuted }]}>Total Picks</Text>
      </View>
    </View>
  );
}

export default function BettingPicksScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 48 : insets.top;
  const { colors } = useTheme();
  const router  = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/football/betting-picks"],
    queryFn:  () => apiRequest("/api/football/betting-picks"),
  });

  const picks: PickCard[] = data?.picks ?? [];
  const stats = data?.stats ?? { totalPicks: 0, winRate: 0, roi: 0 };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openPick = (card: PickCard) => {
    router.push({
      pathname: "/match-detail",
      params: {
        leagueKey: card.leagueKey, espnId: card.espnId,
        homeTeam: card.homeTeam, awayTeam: card.awayTeam,
        homeBadge: card.homeBadge || "", awayBadge: card.awayBadge || "",
        homeScore: "", awayScore: "",
        date: card.date, time: card.time,
        venue: "", status: "scheduled",
        league: card.league, homeForm: "", awayForm: "",
        homeRecord: "", awayRecord: "",
      },
    });
  };

  return (
    <View style={[vb.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[vb.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.accent} />
          <Text style={[vb.title, { color: colors.text }]}>AI Picks</Text>
        </View>
        <Text style={[vb.subtitle, { color: colors.textMuted }]}>Powered by machine learning</Text>
      </View>

      {/* Stats strip */}
      <StatsBar stats={stats} colors={colors} />

      {/* List */}
      {isLoading ? (
        <View style={vb.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : isError ? (
        <View style={vb.center}>
          <MaterialCommunityIcons name="lightning-bolt-off" size={36} color={colors.textMuted} />
          <Text style={[vb.emptyTxt, { color: colors.textMuted }]}>Could not load picks</Text>
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.7}
            style={[vb.retryBtn, { borderColor: colors.accent }]}>
            <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : picks.length === 0 ? (
        <View style={vb.center}>
          <MaterialCommunityIcons name="robot-outline" size={40} color={colors.textMuted} />
          <Text style={[vb.emptyTxt, { color: colors.textMuted }]}>No picks available yet</Text>
          <Text style={[vb.emptySub, { color: colors.textMuted }]}>Check back when matches are scheduled</Text>
        </View>
      ) : (
        <FlatList
          data={picks}
          keyExtractor={item => item.matchId}
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => <PickCard card={item} colors={colors} onPress={() => openPick(item)} />}
        />
      )}
    </View>
  );
}

const vb = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header:  { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  title:   { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle:{ fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsBar:{ flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1 },
  statItem:{ flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statKey: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginVertical: 4 },
  emptyTxt:{ fontSize: 15, fontFamily: "Inter_500Medium" },
  emptySub:{ fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginHorizontal: 32 },
  retryBtn:{ marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  card:    { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader:{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardLeague:{ fontSize: 11, fontFamily: "Inter_500Medium" },
  cardDate:{ fontSize: 11, fontFamily: "Inter_400Regular" },
  matchRow:{ flexDirection: "row", alignItems: "center", marginBottom: 4 },
  teamSide:{ flex: 1, alignItems: "flex-start", gap: 8 },
  teamName:{ fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  vsBox:   { width: 40, alignItems: "center" },
  vsTxt:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  probRow: { height: 6, flexDirection: "row" },
  probHome:{ height: 6 }, probDraw:{ height: 6 }, probAway:{ height: 6 },
  probLabels:{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  probLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 10 },
  confHeader:{ marginBottom: 4 },
  confLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confTrack:{ flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  confFill: { height: 6, borderRadius: 3 },
  confPct: { fontSize: 12, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  picksRow:{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  bubble:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 3, minWidth: 90 },
  bubbleMarket:{ fontSize: 10, fontFamily: "Inter_400Regular" },
  bubblePick:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bubbleFooter:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 2 },
  bubbleOdds:  { fontSize: 11, fontFamily: "Inter_500Medium" },
  bubbleProb:  { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  bubbleProbTxt:{ fontSize: 11, fontFamily: "Inter_700Bold" },
});
