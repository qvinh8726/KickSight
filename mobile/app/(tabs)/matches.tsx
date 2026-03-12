import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
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

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest<DashboardData>("/api/dashboard"),
  });

  const matches = (data?.matches ?? []).filter((m) => {
    if (filter === "All") return true;
    if (filter === "Group Stage") return !m.match.is_knockout;
    if (filter === "Knockout") return m.match.is_knockout;
    return true;
  });

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.subtitle}>{matches.length} upcoming</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <Text style={styles.loading}>Loading...</Text>
        )}
        {matches.map((m) => {
          const hasValue = m.value_bets.length > 0;
          return (
            <View key={m.match.id} style={[styles.card, hasValue && styles.cardGlow]}>
              <View style={styles.cardTop}>
                <View style={styles.metaLeft}>
                  <Text style={styles.stage}>{m.match.competition_stage?.replace("_", " ")}</Text>
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
                      <Text style={styles.pillText}>N</Text>
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
                  <Text style={styles.vsText}>VS</Text>
                  <Text style={styles.projScore}>{m.prediction.projected_scoreline}</Text>
                </View>
                <Text style={[styles.team, styles.teamRight]} numberOfLines={1}>{m.match.away_team}</Text>
              </View>

              <View style={styles.probRow}>
                <View style={[styles.probSegment, { flex: m.prediction.prob_home, backgroundColor: "#00E676" }]} />
                <View style={[styles.probSegment, { flex: m.prediction.prob_draw, backgroundColor: "#2D3748", marginHorizontal: 2 }]} />
                <View style={[styles.probSegment, { flex: m.prediction.prob_away, backgroundColor: "#FF5252" }]} />
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.conf}>
                  <Ionicons name="shield-checkmark-outline" size={10} color="#4A5568" />{" "}
                  {Math.round(m.prediction.confidence * 100)}% confident
                </Text>
                {m.odds[0] && (
                  <Text style={styles.bookmaker}>{m.odds[0].bookmaker}</Text>
                )}
              </View>
            </View>
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
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#131B2E",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  filterBtnActive: { backgroundColor: "#00E67620", borderColor: "#00E676" },
  filterText: { fontSize: 12, color: "#4A5568", fontFamily: "Inter_500Medium" },
  filterTextActive: { color: "#00E676" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loading: { color: "#4A5568", textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  cardGlow: { borderColor: "#00E67630" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  metaLeft: {},
  stage: { fontSize: 10, color: "#4A5568", fontFamily: "Inter_500Medium", letterSpacing: 0.4 },
  date: { fontSize: 12, color: "#8892A4", fontFamily: "Inter_500Medium", marginTop: 1 },
  pills: { flexDirection: "row", gap: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF525218",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
  },
  pillBlue: { backgroundColor: "#3B82F618" },
  pillGreen: { backgroundColor: "#00E67618" },
  pillText: { fontSize: 9, color: "#FF5252", fontFamily: "Inter_600SemiBold" },
  teams: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  team: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  teamRight: { textAlign: "right" },
  scoreBox: { width: 52, alignItems: "center" },
  vsText: { fontSize: 10, color: "#4A5568", fontFamily: "Inter_600SemiBold" },
  projScore: { fontSize: 13, color: "#8892A4", fontFamily: "Inter_600SemiBold" },
  probRow: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 10 },
  probSegment: { height: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  conf: { fontSize: 11, color: "#4A5568", fontFamily: "Inter_400Regular" },
  bookmaker: { fontSize: 11, color: "#4A5568", fontFamily: "Inter_400Regular" },
});
