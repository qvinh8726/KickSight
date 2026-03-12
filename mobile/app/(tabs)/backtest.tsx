import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
                <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 3 }} />
                <View style={{ width: barW, height: CHART_H / 2 - barH }} />
              </>
            ) : (
              <>
                <View style={{ width: barW, height: CHART_H / 2 }} />
                <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 3 }} />
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
  const [refreshing, setRefreshing] = React.useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<BacktestData>({
    queryKey: ["/api/backtest"],
    queryFn: () => apiRequest<BacktestData>("/api/backtest"),
  });

  const s = data?.summary;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleIconBg}>
            <Ionicons name="bar-chart" size={20} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.title}>Backtest</Text>
            <Text style={styles.subtitle}>Historical model performance</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />
        }
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#00E676" size="large" />
            <Text style={styles.loadingText}>Loading backtest data...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.loadingBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF5252" />
            <Text style={styles.loadingText}>Could not load backtest data</Text>
          </View>
        )}

        {s && (
          <>
            <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ scale: heroScale }] }]}>
              <View style={styles.heroIconBg}>
                <Ionicons name="trending-up" size={24} color={s.roi >= 0 ? "#00E676" : "#FF5252"} />
              </View>
              <Text style={styles.heroLabel}>TOTAL ROI</Text>
              <Text style={[styles.heroValue, { color: s.roi >= 0 ? "#00E676" : "#FF5252" }]}>
                {s.roi >= 0 ? "+" : ""}{(s.roi * 100).toFixed(1)}%
              </Text>
              <Text style={styles.heroSub}>
                ${s.total_profit.toLocaleString()} profit from {s.total_bets} bets
              </Text>
              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>Sharpe {s.sharpe_ratio.toFixed(2)}</Text>
                </View>
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>Win Rate {(s.win_rate * 100).toFixed(0)}%</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
                <MetricCard label="Win Rate" value={`${(s.win_rate * 100).toFixed(1)}%`} icon="checkmark-circle" iconColor="#00E676" />
                <MetricCard label="Total Bets" value={String(s.total_bets)} icon="layers" iconColor="#3B82F6" />
                <MetricCard label="Max Drawdown" value={`${(s.max_drawdown * 100).toFixed(1)}%`} negative icon="trending-down" iconColor="#FF5252" />
                <MetricCard label="Sharpe Ratio" value={s.sharpe_ratio.toFixed(2)} icon="analytics" iconColor="#A78BFA" />
                <MetricCard label="Avg EV" value={`${(s.avg_ev * 100).toFixed(1)}%`} accent icon="flash" iconColor="#00E676" />
                <MetricCard label="CLV" value={`${(s.clv * 100).toFixed(1)}%`} accent icon="arrow-up-circle" iconColor="#00E676" />
              </View>

              <Text style={styles.sectionTitle}>Monthly Breakdown</Text>

              {data?.monthly.map((m, i) => (
                <View key={m.month} style={[styles.monthRow, i === 0 && { borderTopWidth: 0 }]}>
                  <Text style={styles.monthName}>{m.month}</Text>
                  <View style={styles.monthBetsBadge}>
                    <Text style={styles.monthBets}>{m.bets}</Text>
                  </View>
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
            </Animated.View>
          </>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

function MetricCard({
  label, value, accent, negative, icon, iconColor,
}: {
  label: string; value: string; accent?: boolean; negative?: boolean; icon: string; iconColor: string;
}) {
  const color = negative ? "#FF5252" : accent ? "#00E676" : "#FFFFFF";
  return (
    <View style={metStyles.card}>
      <View style={[metStyles.iconBg, { backgroundColor: iconColor + "15" }]}>
        <Ionicons name={icon as any} size={14} color={iconColor} />
      </View>
      <Text style={metStyles.label}>{label}</Text>
      <Text style={[metStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const metStyles = StyleSheet.create({
  card: {
    width: "47%",
    backgroundColor: "#131B2E",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: { fontSize: 10, color: "#4A5568", fontFamily: "Inter_400Regular", marginBottom: 4 },
  value: { fontSize: 20, fontFamily: "Inter_700Bold" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#A78BFA15",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 12, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { color: "#4A5568", textAlign: "center", fontFamily: "Inter_400Regular" },
  heroCard: {
    backgroundColor: "#131B2E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#00E67625",
  },
  heroIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00E67610",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 11, color: "#4A5568", fontFamily: "Inter_600SemiBold",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
  },
  heroValue: { fontSize: 48, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 13, color: "#8892A4", fontFamily: "Inter_400Regular", marginTop: 4 },
  heroChips: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroChip: {
    backgroundColor: "#1C2540",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#4A5568",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },
  chartCard: {
    backgroundColor: "#131B2E",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
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
    marginBottom: 24,
    justifyContent: "space-between",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#1C2540",
  },
  monthName: { flex: 1, fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_500Medium" },
  monthBetsBadge: {
    backgroundColor: "#1C2540",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 16,
  },
  monthBets: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_500Medium" },
  monthRight: { alignItems: "flex-end" },
  monthProfit: { fontSize: 14, fontFamily: "Inter_700Bold" },
  monthRoi: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
