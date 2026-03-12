import React from "react";
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
import { useI18n } from "@/lib/i18n";

function TeamBadge({ uri, size = 20 }: { uri: string | null; size?: number }) {
  if (!uri) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254060" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 3 }} resizeMode="contain" />;
}

interface Pick {
  market: string;
  pick: string;
  fairOdds: number;
  probability: number;
  status: string;
}

interface PickCard {
  matchId: string;
  espnId: string;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string | null;
  awayBadge: string | null;
  date: string;
  time: string;
  league: string;
  leagueKey: string;
  probHome: number;
  probDraw: number;
  probAway: number;
  confidence: number;
  picks: Pick[];
}

function VerdictBadge({ prob }: { prob: number }) {
  const v = prob > 0.55 ? "strong" : prob > 0.45 ? "moderate" : "risky";
  const color = v === "strong" ? "#00E676" : v === "moderate" ? "#FFD93D" : "#FF5252";
  const bg = v === "strong" ? "#00E67615" : v === "moderate" ? "#FFD93D15" : "#FF525215";
  return (
    <View style={[s.verdictBadge, { backgroundColor: bg, borderColor: color + "30" }]}>
      <Text style={[s.verdictText, { color }]}>{v.toUpperCase()}</Text>
    </View>
  );
}

function PickItem({ pick, colors }: { pick: Pick; colors: any }) {
  const prob = Math.round(pick.probability * 100);
  return (
    <View style={[s.pickItem, { borderColor: colors.border }]}>
      <View style={s.pickTop}>
        <Text style={[s.pickMarket, { color: colors.textMuted }]}>{pick.market}</Text>
        <VerdictBadge prob={pick.probability} />
      </View>
      <Text style={[s.pickSelection, { color: colors.text }]}>{pick.pick}</Text>
      <View style={s.pickStats}>
        <Text style={[s.pickOdds, { color: colors.accent }]}>@{pick.fairOdds}</Text>
        <View style={s.probBar}>
          <View style={[s.probFill, { width: `${prob}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={[s.probText, { color: colors.textSecondary }]}>{prob}%</Text>
      </View>
    </View>
  );
}

export default function BettingPicksScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 48 : insets.top;
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/football/betting-picks"],
    queryFn: () => apiRequest("/api/football/betting-picks"),
  });

  const picks: PickCard[] = data?.picks || [];
  const stats = data?.stats || { totalPicks: 0, winRate: 0, profit: 0, roi: 0 };

  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>{t.bettingPicks}</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>AI-powered match picks</Text>
      </View>

      <FlatList
        data={picks}
        keyExtractor={(item) => item.matchId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={[s.statsRow, { borderColor: colors.border }]}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.accent }]}>{stats.totalPicks}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Picks</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.text }]}>{Math.round(stats.winRate * 100)}%</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Win Rate</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: stats.profit >= 0 ? colors.accent : colors.danger }]}>
                {stats.profit >= 0 ? "+" : ""}{stats.profit}u
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Profit</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.blue }]}>{stats.roi}%</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>ROI</Text>
            </View>
          </View>
        }
        ListEmptyComponent={isLoading ? (
          <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
        ) : isError ? (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>Failed to load picks</Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.accent }}>
              <Text style={{ color: "#0B0F1A", fontFamily: "Inter_600SemiBold" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.center}><Text style={{ color: colors.textMuted }}>No picks available</Text></View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.7} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({
              pathname: "/match-detail",
              params: {
                leagueKey: item.leagueKey, espnId: item.espnId,
                homeTeam: item.homeTeam, awayTeam: item.awayTeam,
                homeBadge: item.homeBadge || "", awayBadge: item.awayBadge || "",
                homeScore: "", awayScore: "",
                date: item.date, time: item.time, venue: "",
                status: "scheduled", league: item.league,
                homeForm: "", awayForm: "", homeRecord: "", awayRecord: "",
              },
            })}>
            <View style={s.cardHeader}>
              <View style={s.cardTeams}>
                <View style={s.cardTeamRow}>
                  <TeamBadge uri={item.homeBadge} size={24} />
                  <Text style={[s.cardTeam, { color: colors.text }]} numberOfLines={1}>{item.homeTeam}</Text>
                </View>
                <Text style={[s.vs, { color: colors.textMuted }]}>vs</Text>
                <View style={s.cardTeamRow}>
                  <TeamBadge uri={item.awayBadge} size={24} />
                  <Text style={[s.cardTeam, { color: colors.text }]} numberOfLines={1}>{item.awayTeam}</Text>
                </View>
              </View>
              <View style={s.cardMeta}>
                <Text style={[s.cardLeague, { color: colors.textMuted }]}>{item.league}</Text>
                <Text style={[s.cardDate, { color: colors.accent }]}>{item.date}</Text>
              </View>
            </View>

            <View style={s.probRow}>
              <View style={[s.probSeg, { flex: item.probHome, backgroundColor: colors.accent }]} />
              <View style={[s.probSeg, { flex: item.probDraw, backgroundColor: colors.textMuted + "40", marginHorizontal: 2 }]} />
              <View style={[s.probSeg, { flex: item.probAway, backgroundColor: colors.danger }]} />
            </View>
            <View style={s.probLabels}>
              <Text style={[s.probLabel, { color: colors.accent }]}>{Math.round(item.probHome * 100)}%</Text>
              <Text style={[s.probLabel, { color: colors.textMuted }]}>{Math.round(item.probDraw * 100)}%</Text>
              <Text style={[s.probLabel, { color: colors.danger }]}>{Math.round(item.probAway * 100)}%</Text>
            </View>

            {item.picks.map((p, i) => <PickItem key={i} pick={p} colors={colors} />)}

            <View style={s.confRow}>
              <MaterialCommunityIcons name="shield-check" size={14} color={colors.accent} />
              <Text style={[s.confText, { color: colors.textSecondary }]}>Confidence: {Math.round(item.confidence * 100)}%</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, justifyContent: "space-around" },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  card: { marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  cardHeader: { marginBottom: 10 },
  cardTeams: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  cardTeamRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardTeam: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  vs: { fontSize: 12 },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  cardLeague: { fontSize: 11 },
  cardDate: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  probRow: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  probSeg: { height: 4 },
  probLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  probLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pickItem: { borderTopWidth: 1, paddingTop: 8, marginTop: 6 },
  pickTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickMarket: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pickSelection: { fontSize: 14, fontFamily: "Inter_700Bold", marginVertical: 4 },
  pickStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickOdds: { fontSize: 13, fontFamily: "Inter_700Bold", width: 42 },
  probBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#1C254040", overflow: "hidden" },
  probFill: { height: 4, borderRadius: 2 },
  probText: { fontSize: 11, fontFamily: "Inter_600SemiBold", width: 36, textAlign: "right" },
  verdictBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  verdictText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 8 },
  confText: { fontSize: 12 },
});
