import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MatchCard from "@/components/MatchCard";
import { apiRequest } from "@/lib/query-client";
import type { DashboardData } from "@/lib/types";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest<DashboardData>("/api/dashboard"),
  });

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoLetter}>W</Text>
          </View>
          <View>
            <Text style={styles.logoTitle}>WC2026 Betting AI</Text>
            <Text style={styles.logoSub}>Probability-based analysis</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>World Cup 2026 match predictions</Text>

        {isLoading && (
          <ActivityIndicator color="#00E676" size="large" style={{ marginTop: 40 }} />
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Ionicons name="wifi-outline" size={28} color="#FF5252" />
            <Text style={styles.errorText}>Backend offline — showing demo mode</Text>
          </View>
        )}

        {data && (
          <>
            <View style={styles.statsRow}>
              <StatCard icon="football-outline" label="Matches" value={String(data.stats.upcoming_matches)} />
              <StatCard icon="flash-outline" label="Value Bets" value={String(data.stats.value_bets)} accent />
              <StatCard
                icon="shield-checkmark-outline"
                label="Confidence"
                value={`${Math.round(data.stats.avg_confidence * 100)}%`}
              />
            </View>

            <Text style={styles.sectionLabel}>Upcoming Matches</Text>

            {data.matches.map((m) => (
              <MatchCard key={m.match.id} data={m} />
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Ionicons name={icon} size={16} color={accent ? "#00E676" : "#8892A4"} />
      <Text style={[styles.statValue, accent && { color: "#00E676" }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1C2540",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#00E67620",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#00E676" },
  logoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  logoSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#4A5568" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 2, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#131B2E",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  statCardAccent: { borderColor: "#00E67640" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 6 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 2 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8892A4",
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  errorBox: {
    alignItems: "center",
    marginTop: 32,
    gap: 10,
  },
  errorText: { fontSize: 13, color: "#8892A4", fontFamily: "Inter_400Regular" },
});
