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
import type { ValueBet } from "@/lib/types";

const RISK_COLOR: Record<string, string> = {
  low: "#00E676",
  medium: "#FFB74D",
  high: "#FF5252",
};

const RISK_ICON: Record<string, string> = {
  low: "shield-checkmark",
  medium: "warning",
  high: "alert-circle",
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
  const [refreshing, setRefreshing] = React.useState(false);

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

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleIconBg}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color="#00E676" />
          </View>
          <View>
            <Text style={styles.title}>Value Bets</Text>
            <Text style={styles.subtitle}>AI-detected opportunities</Text>
          </View>
        </View>
      </Animated.View>

      {data && data.length > 0 && (
        <Animated.View style={[styles.summaryRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#3B82F615" }]}>
              <Ionicons name="layers-outline" size={16} color="#3B82F6" />
            </View>
            <Text style={styles.summaryValue}>{data.length}</Text>
            <Text style={styles.summaryLabel}>Found</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardAccent]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#00E67615" }]}>
              <Ionicons name="trending-up" size={16} color="#00E676" />
            </View>
            <Text style={[styles.summaryValue, { color: "#00E676" }]}>{pct(avgEdge)}</Text>
            <Text style={styles.summaryLabel}>Avg Edge</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: "#A78BFA15" }]}>
              <Ionicons name="diamond-outline" size={16} color="#A78BFA" />
            </View>
            <Text style={[styles.summaryValue, { color: "#A78BFA" }]}>{pct(totalEV)}</Text>
            <Text style={styles.summaryLabel}>Total EV</Text>
          </View>
        </Animated.View>
      )}

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
            <Text style={styles.loading}>Scanning for value...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF5252" />
            <Text style={styles.errorText}>Could not connect to server</Text>
          </View>
        )}

        {data?.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyCircle}>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color="#1C2540" />
            </View>
            <Text style={styles.emptyTitle}>No Value Bets</Text>
            <Text style={styles.emptyText}>No opportunities detected right now</Text>
          </View>
        )}

        {data?.map((bet, idx) => {
          const riskColor = RISK_COLOR[bet.risk_rating] ?? "#8892A4";
          const riskIcon = RISK_ICON[bet.risk_rating] ?? "help-circle";
          return (
            <Animated.View key={idx} style={[styles.betCard, { opacity: fadeAnim }]}>
              <View style={styles.betTop}>
                <View style={styles.betMatch}>
                  <Text style={styles.betTeams} numberOfLines={1}>
                    {bet.home_team} vs {bet.away_team}
                  </Text>
                  <Text style={styles.betDate}>{fmtDate(bet.match_date ?? "")}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskColor + "18" }]}>
                  <Ionicons name={riskIcon as any} size={10} color={riskColor} />
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
            </Animated.View>
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#00E67615",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 12, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 1 },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#131B2E",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  summaryCardAccent: { borderColor: "#00E67630", backgroundColor: "#0D1A14" },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  summaryLabel: { fontSize: 10, color: "#4A5568", fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loading: { color: "#4A5568", textAlign: "center", fontFamily: "Inter_400Regular" },
  errorBox: { alignItems: "center", marginTop: 40, gap: 10 },
  errorText: { fontSize: 13, color: "#8892A4", fontFamily: "Inter_400Regular" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#131B2E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  emptyText: { fontSize: 13, color: "#4A5568", fontFamily: "Inter_400Regular" },
  betCard: {
    backgroundColor: "#131B2E",
    borderRadius: 18,
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  riskText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  betMarket: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  marketTag: {
    backgroundColor: "#1C2540",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    borderRadius: 10,
    padding: 10,
  },
  betStatLabel: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular", marginBottom: 3 },
  betStatValue: { fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  stakeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1C2540",
    gap: 10,
  },
  stakeLeft: { minWidth: 90 },
  stakeLabel: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular" },
  stakeValue: { fontSize: 18, color: "#00E676", fontFamily: "Inter_700Bold" },
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
