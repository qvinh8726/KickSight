import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import type { ValueBet } from "@/lib/types";

const RISK_COLOR: Record<string, string> = {
  low: "#00E676",
  medium: "#FFB74D",
  high: "#FF5252",
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ValueBetsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, isError } = useQuery<ValueBet[]>({
    queryKey: ["/api/value-bets"],
    queryFn: () => apiRequest<ValueBet[]>("/api/value-bets"),
  });

  const totalEV = (data ?? []).reduce((s, b) => s + b.ev, 0);
  const avgEdge = (data ?? []).length > 0
    ? (data ?? []).reduce((s, b) => s + b.edge, 0) / (data ?? []).length
    : 0;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={24} color="#00E676" />
          <Text style={styles.title}>Value Bets</Text>
        </View>
        <Text style={styles.subtitle}>Sorted by Expected Value</Text>
      </View>

      {data && data.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{data.length}</Text>
            <Text style={styles.summaryLabel}>Bets Found</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#00E676" }]}>{pct(avgEdge)}</Text>
            <Text style={styles.summaryLabel}>Avg Edge</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#00E676" }]}>{pct(totalEV)}</Text>
            <Text style={styles.summaryLabel}>Total EV</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <Text style={styles.loading}>Loading value bets...</Text>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Ionicons name="wifi-outline" size={28} color="#FF5252" />
            <Text style={styles.errorText}>Could not connect to server</Text>
          </View>
        )}

        {data?.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="lightning-bolt-outline" size={40} color="#1C2540" />
            <Text style={styles.emptyText}>No value bets detected</Text>
          </View>
        )}

        {data?.map((bet, idx) => {
          const riskColor = RISK_COLOR[bet.risk_rating] ?? "#8892A4";
          return (
            <View key={idx} style={styles.betCard}>
              <View style={styles.betTop}>
                <View style={styles.betMatch}>
                  <Text style={styles.betTeams} numberOfLines={1}>
                    {bet.home_team} vs {bet.away_team}
                  </Text>
                  <Text style={styles.betDate}>{fmtDate(bet.match_date ?? "")}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskColor + "20" }]}>
                  <Text style={[styles.riskText, { color: riskColor }]}>
                    {bet.risk_rating.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.betMarket}>
                <View style={styles.marketTag}>
                  <Text style={styles.marketText}>{bet.market}</Text>
                </View>
                <Text style={styles.selectionText}>{bet.selection}</Text>
              </View>

              <View style={styles.betGrid}>
                <BetStat label="Model Prob" value={pct(bet.model_prob)} />
                <BetStat label="Fair Odds" value={bet.fair_odds.toFixed(2)} />
                <BetStat label="Book Odds" value={bet.bookmaker_odds.toFixed(2)} />
                <BetStat label="Edge" value={pct(bet.edge)} accent />
                <BetStat label="EV %" value={pct(bet.ev)} accent />
                <BetStat label="Kelly" value={pct(bet.kelly_fraction)} />
              </View>

              <View style={styles.stakeRow}>
                <View style={styles.stakeLeft}>
                  <Text style={styles.stakeLabel}>Suggested Stake</Text>
                  <Text style={styles.stakeValue}>${bet.suggested_stake}</Text>
                </View>
                <View style={styles.confBar}>
                  <View
                    style={[
                      styles.confFill,
                      {
                        width: `${Math.round(bet.confidence * 100)}%` as any,
                        backgroundColor: riskColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confLabel}>{Math.round(bet.confidence * 100)}%</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

function BetStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.betStat}>
      <Text style={styles.betStatLabel}>{label}</Text>
      <Text style={[styles.betStatValue, accent && { color: "#00E676" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#131B2E",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  summaryLabel: { fontSize: 10, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loading: { color: "#4A5568", textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular" },
  errorBox: { alignItems: "center", marginTop: 40, gap: 10 },
  errorText: { fontSize: 13, color: "#8892A4", fontFamily: "Inter_400Regular" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: "#4A5568", fontFamily: "Inter_400Regular" },
  betCard: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  betTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  betMatch: { flex: 1, marginRight: 10 },
  betTeams: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  betDate: { fontSize: 11, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  riskBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  riskText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  betMarket: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  marketTag: {
    backgroundColor: "#1C2540",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  marketText: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_600SemiBold" },
  selectionText: { fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  betGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  betStat: {
    width: "30%",
    backgroundColor: "#0B0F1A",
    borderRadius: 8,
    padding: 8,
  },
  betStatLabel: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular", marginBottom: 3 },
  betStatValue: { fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  stakeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1C2540",
    gap: 10,
  },
  stakeLeft: { minWidth: 80 },
  stakeLabel: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular" },
  stakeValue: { fontSize: 16, color: "#00E676", fontFamily: "Inter_700Bold" },
  confBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#1C2540",
    borderRadius: 2,
    overflow: "hidden",
  },
  confFill: { height: 4, borderRadius: 2 },
  confLabel: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_500Medium" },
});
