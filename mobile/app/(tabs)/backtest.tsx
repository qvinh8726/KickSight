import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/query-client";
import type { BacktestData, MonthlyResult } from "@/lib/types";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = Math.min(SCREEN_W - 64, 480);
const CHART_H = 120;

function BarChart({ data }: { data: MonthlyResult[] }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.roi)), 0.01);
  const barW = Math.floor((CHART_W - data.length * 2) / data.length);

  return (
    <View style={{ width: CHART_W, height: CHART_H, flexDirection: "row", alignItems: "center", gap: 2 }}>
      {data.map((d, i) => {
        const fraction = Math.abs(d.roi) / maxAbs;
        const barH = Math.max(4, Math.round(fraction * (CHART_H / 2 - 4)));
        const color = d.roi >= 0 ? "#00E676" : "#FF5252";
        return (
          <View key={i} style={{ width: barW, height: CHART_H, justifyContent: "center", alignItems: "center" }}>
            {d.roi >= 0 ? (
              <>
                <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 2, alignSelf: "center" }} />
                <View style={{ width: barW, height: CHART_H / 2 - barH }} />
              </>
            ) : (
              <>
                <View style={{ width: barW, height: CHART_H / 2 }} />
                <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 2, alignSelf: "center" }} />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function BacktestScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery<BacktestData>({
    queryKey: ["/api/backtest"],
    queryFn: () => apiRequest<BacktestData>("/api/backtest"),
  });

  const s = data?.summary;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Backtest</Text>
        <Text style={styles.subtitle}>Historical model performance</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <Text style={styles.loading}>Loading backtest data...</Text>
        )}

        {s && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>TOTAL ROI</Text>
              <Text style={[styles.heroValue, { color: s.roi >= 0 ? "#00E676" : "#FF5252" }]}>
                {s.roi >= 0 ? "+" : ""}{(s.roi * 100).toFixed(1)}%
              </Text>
              <Text style={styles.heroSub}>
                ${s.total_profit.toLocaleString()} profit · {s.total_bets} bets
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Monthly ROI</Text>

            <View style={styles.chartCard}>
              <View style={styles.zeroLine} />
              {data?.monthly && <BarChart data={data.monthly} />}
              <View style={styles.monthLabels}>
                {data?.monthly.filter((_, i) => i % 3 === 0).map((d) => (
                  <Text key={d.month} style={styles.monthLabelSmall}>{d.month.split(" ")[0]}</Text>
                ))}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Performance Metrics</Text>

            <View style={styles.metricsGrid}>
              <MetricCard label="Win Rate" value={`${(s.win_rate * 100).toFixed(1)}%`} />
              <MetricCard label="Total Bets" value={String(s.total_bets)} />
              <MetricCard label="Max Drawdown" value={`${(s.max_drawdown * 100).toFixed(1)}%`} negative />
              <MetricCard label="Sharpe Ratio" value={s.sharpe_ratio.toFixed(2)} />
              <MetricCard label="Avg EV" value={`${(s.avg_ev * 100).toFixed(1)}%`} accent />
              <MetricCard label="CLV" value={`${(s.clv * 100).toFixed(1)}%`} accent />
            </View>

            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>

            {data?.monthly.map((m) => (
              <View key={m.month} style={styles.monthRow}>
                <Text style={styles.monthName}>{m.month}</Text>
                <Text style={styles.monthBets}>{m.bets} bets</Text>
                <View style={styles.monthRight}>
                  <Text style={[styles.monthProfit, { color: m.profit >= 0 ? "#00E676" : "#FF5252" }]}>
                    {m.profit >= 0 ? "+" : ""}${m.profit}
                  </Text>
                  <Text style={[styles.monthRoi, { color: m.roi >= 0 ? "#00E676" : "#FF5252" }]}>
                    {m.roi >= 0 ? "+" : ""}{(m.roi * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

function MetricCard({
  label, value, accent, negative,
}: {
  label: string; value: string; accent?: boolean; negative?: boolean;
}) {
  const color = negative ? "#FF5252" : accent ? "#00E676" : "#FFFFFF";
  return (
    <View style={metStyles.card}>
      <Text style={metStyles.label}>{label}</Text>
      <Text style={[metStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const metStyles = StyleSheet.create({
  card: {
    width: "47%",
    backgroundColor: "#0B0F1A",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  label: { fontSize: 10, color: "#4A5568", fontFamily: "Inter_400Regular", marginBottom: 6 },
  value: { fontSize: 20, fontFamily: "Inter_700Bold" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loading: { color: "#4A5568", textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular" },
  heroCard: {
    backgroundColor: "#131B2E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#00E67630",
  },
  heroLabel: {
    fontSize: 11, color: "#4A5568", fontFamily: "Inter_500Medium",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 6,
  },
  heroValue: { fontSize: 48, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 12, color: "#8892A4", fontFamily: "Inter_400Regular", marginTop: 4 },
  sectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#4A5568",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },
  chartCard: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1C2540",
    alignItems: "center",
  },
  zeroLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#1C2540",
    marginBottom: 4,
  },
  monthLabels: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 6 },
  monthLabelSmall: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1C2540",
  },
  monthName: { flex: 1, fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_500Medium" },
  monthBets: { fontSize: 11, color: "#4A5568", fontFamily: "Inter_400Regular", marginRight: 16 },
  monthRight: { alignItems: "flex-end" },
  monthProfit: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  monthRoi: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
