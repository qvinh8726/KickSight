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
import { useTheme } from "@/lib/theme-context";
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
  const { colors } = useTheme();

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
    <View style={[styles.root, { paddingTop: topPad, backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <View style={[styles.titleIconBg, { backgroundColor: "#A78BFA15" }]}>
            <Ionicons name="bar-chart" size={20} color="#A78BFA" />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Backtest</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Historical model performance</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading backtest data...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.loadingBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF5252" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Could not load backtest data</Text>
          </View>
        )}

        {s && (
          <>
            <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ scale: heroScale }], backgroundColor: colors.card, borderColor: colors.accent + "25" }]}>
              <View style={[styles.heroIconBg, { backgroundColor: colors.accent + "10" }]}>
                <Ionicons name="trending-up" size={24} color={s.roi >= 0 ? colors.accent : "#FF5252"} />
              </View>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>TOTAL ROI</Text>
              <Text style={[styles.heroValue, { color: s.roi >= 0 ? colors.accent : "#FF5252" }]}>
                {s.roi >= 0 ? "+" : ""}{(s.roi * 100).toFixed(1)}%
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                ${s.total_profit.toLocaleString()} profit from {s.total_bets} bets
              </Text>
              <View style={styles.heroChips}>
                <View style={[styles.heroChip, { backgroundColor: colors.border }]}>
                  <Text style={[styles.heroChipText, { color: colors.textSecondary }]}>Sharpe {s.sharpe_ratio.toFixed(2)}</Text>
                </View>
                <View style={[styles.heroChip, { backgroundColor: colors.border }]}>
                  <Text style={[styles.heroChipText, { color: colors.textSecondary }]}>Win Rate {(s.win_rate * 100).toFixed(0)}%</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Monthly ROI</Text>

              <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.zeroLine, { backgroundColor: colors.border }]} />
                {data?.monthly && <BarChart data={data.monthly} />}
                <View style={styles.monthLabels}>
                  {data?.monthly.filter((_, i) => i % 3 === 0).map((d) => (
                    <Text key={d.month} style={[styles.monthLabelSmall, { color: colors.textMuted }]}>{d.month.split(" ")[0]}</Text>
                  ))}
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Performance Metrics</Text>

              <View style={styles.metricsGrid}>
                <MetricCard label="Win Rate" value={`${(s.win_rate * 100).toFixed(1)}%`} icon="checkmark-circle" iconColor="#00E676" colors={colors} />
                <MetricCard label="Total Bets" value={String(s.total_bets)} icon="layers" iconColor="#3B82F6" colors={colors} />
                <MetricCard label="Max Drawdown" value={`${(s.max_drawdown * 100).toFixed(1)}%`} negative icon="trending-down" iconColor="#FF5252" colors={colors} />
                <MetricCard label="Sharpe Ratio" value={s.sharpe_ratio.toFixed(2)} icon="analytics" iconColor="#A78BFA" colors={colors} />
                <MetricCard label="Avg EV" value={`${(s.avg_ev * 100).toFixed(1)}%`} accent icon="flash" iconColor="#00E676" colors={colors} />
                <MetricCard label="CLV" value={`${(s.clv * 100).toFixed(1)}%`} accent icon="arrow-up-circle" iconColor="#00E676" colors={colors} />
              </View>

              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Monthly Breakdown</Text>

              {data?.monthly.map((m, i) => (
                <View key={m.month} style={[styles.monthRow, { borderTopColor: colors.border }, i === 0 && { borderTopWidth: 0 }]}>
                  <Text style={[styles.monthName, { color: colors.text }]}>{m.month}</Text>
                  <View style={[styles.monthBetsBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.monthBets, { color: colors.textSecondary }]}>{m.bets}</Text>
                  </View>
                  <View style={styles.monthRight}>
                    <Text style={[styles.monthProfit, { color: m.profit >= 0 ? colors.accent : "#FF5252" }]}>
                      {m.profit >= 0 ? "+" : ""}${m.profit}
                    </Text>
                    <Text style={[styles.monthRoi, { color: m.roi >= 0 ? colors.accent : "#FF5252" }]}>
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
  label, value, accent, negative, icon, iconColor, colors,
}: {
  label: string; value: string; accent?: boolean; negative?: boolean; icon: string; iconColor: string; colors: any;
}) {
  const color = negative ? "#FF5252" : accent ? colors.accent : colors.text;
  return (
    <View style={[metStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[metStyles.iconBg, { backgroundColor: iconColor + "15" }]}>
        <Ionicons name={icon as any} size={14} color={iconColor} />
      </View>
      <Text style={[metStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[metStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const metStyles = StyleSheet.create({
  card: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 4 },
  value: { fontSize: 20, fontFamily: "Inter_700Bold" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { textAlign: "center", fontFamily: "Inter_400Regular" },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  heroIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
  },
  heroValue: { fontSize: 48, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  heroChips: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  zeroLine: {
    width: "100%",
    height: 1,
    marginBottom: 4,
  },
  monthLabels: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 6 },
  monthLabelSmall: { fontSize: 9, fontFamily: "Inter_400Regular" },
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
  },
  monthName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  monthBetsBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 16,
  },
  monthBets: { fontSize: 11, fontFamily: "Inter_500Medium" },
  monthRight: { alignItems: "flex-end" },
  monthProfit: { fontSize: 14, fontFamily: "Inter_700Bold" },
  monthRoi: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
