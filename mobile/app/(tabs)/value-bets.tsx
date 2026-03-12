import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import type { ValueBet } from "@/lib/types";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ValueBetsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = React.useState(false);
  const { colors } = useTheme();
  const { t } = useI18n();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<ValueBet[]>({
    queryKey: ["/api/value-bets"],
    queryFn: () => apiRequest<ValueBet[]>("/api/value-bets"),
  });

  const totalEV = (data ?? []).reduce((s, b) => s + b.ev, 0);
  const avgEdge = (data ?? []).length > 0
    ? (data ?? []).reduce((s, b) => s + b.edge, 0) / (data ?? []).length
    : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const RISK_COLOR: Record<string, string> = {
    low: colors.accent,
    medium: colors.orange,
    high: colors.danger,
  };

  const RISK_ICON: Record<string, string> = {
    low: "shield-checkmark",
    medium: "warning",
    high: "alert-circle",
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <View style={[styles.titleIconBg, { backgroundColor: colors.accentBg }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t.valueBets}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t.aiDetected}</Text>
          </View>
        </View>
      </Animated.View>

      {data && data.length > 0 && (
        <Animated.View style={[styles.summaryRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.blueBg }]}>
              <Ionicons name="layers-outline" size={16} color={colors.blue} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{data.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Found</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.cardAccent, borderColor: colors.borderAccent }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.accentBg }]}>
              <Ionicons name="trending-up" size={16} color={colors.accent} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.accent }]}>{pct(avgEdge)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t.avgEdge}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.purpleBg }]}>
              <Ionicons name="diamond-outline" size={16} color={colors.purple} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.purple }]}>{pct(totalEV)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t.totalEV}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loading, { color: colors.textMuted }]}>Scanning for value...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>Could not connect to server</Text>
          </View>
        )}

        {data?.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={[styles.emptyCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Value Bets</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No opportunities detected right now</Text>
          </View>
        )}

        {data?.map((bet, idx) => {
          const riskColor = RISK_COLOR[bet.risk_rating] ?? colors.textSecondary;
          const riskIcon = RISK_ICON[bet.risk_rating] ?? "help-circle";
          return (
            <Animated.View key={idx} style={[styles.betCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
              <View style={styles.betTop}>
                <View style={styles.betMatch}>
                  <Text style={[styles.betTeams, { color: colors.text }]} numberOfLines={1}>
                    {bet.home_team} vs {bet.away_team}
                  </Text>
                  <Text style={[styles.betDate, { color: colors.textMuted }]}>{fmtDate(bet.match_date ?? "")}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskColor + "18" }]}>
                  <Ionicons name={riskIcon as any} size={10} color={riskColor} />
                  <Text style={[styles.riskText, { color: riskColor }]}>{bet.risk_rating.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.betMarket}>
                <View style={[styles.marketTag, { backgroundColor: colors.border }]}>
                  <Text style={[styles.marketText, { color: colors.textSecondary }]}>{bet.market}</Text>
                </View>
                <Text style={[styles.selectionText, { color: colors.text }]}>{bet.selection}</Text>
              </View>

              <View style={styles.betGrid}>
                <BetStat label="Model Prob" value={pct(bet.model_prob)} colors={colors} />
                <BetStat label="Fair Odds" value={bet.fair_odds.toFixed(2)} colors={colors} />
                <BetStat label="Book Odds" value={bet.bookmaker_odds.toFixed(2)} colors={colors} />
                <BetStat label="Edge" value={pct(bet.edge)} colors={colors} accent />
                <BetStat label="EV %" value={pct(bet.ev)} colors={colors} accent />
                <BetStat label="Kelly" value={pct(bet.kelly_fraction)} colors={colors} />
              </View>

              <View style={[styles.stakeRow, { borderTopColor: colors.border }]}>
                <View style={styles.stakeLeft}>
                  <Text style={[styles.stakeLabel, { color: colors.textMuted }]}>Suggested Stake</Text>
                  <Text style={[styles.stakeValue, { color: colors.accent }]}>${bet.suggested_stake}</Text>
                </View>
                <View style={[styles.confBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.confFill, { width: `${Math.round(bet.confidence * 100)}%` as any, backgroundColor: riskColor }]} />
                </View>
                <Text style={[styles.confLabel, { color: colors.textSecondary }]}>{Math.round(bet.confidence * 100)}%</Text>
              </View>
            </Animated.View>
          );
        })}

        <View style={{ height: Platform.OS === "web" ? 34 : 20 }} />
      </ScrollView>
    </View>
  );
}

function BetStat({ label, value, accent, colors }: { label: string; value: string; accent?: boolean; colors: any }) {
  return (
    <View style={[styles.betStat, { backgroundColor: colors.bg }]}>
      <Text style={[styles.betStatLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.betStatValue, { color: accent ? colors.accent : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1 },
  summaryIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loading: { textAlign: "center", fontFamily: "Inter_400Regular" },
  errorBox: { alignItems: "center", marginTop: 40, gap: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  betCard: { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1 },
  betTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  betMatch: { flex: 1, marginRight: 10 },
  betTeams: { fontSize: 15, fontFamily: "Inter_700Bold" },
  betDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  riskBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  riskText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  betMarket: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  marketTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  marketText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  selectionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  betGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  betStat: { width: "30%", borderRadius: 10, padding: 10 },
  betStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginBottom: 3 },
  betStatValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stakeRow: { flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: 1, gap: 10 },
  stakeLeft: { minWidth: 90 },
  stakeLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  stakeValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  confBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  confFill: { height: 4, borderRadius: 2 },
  confLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
