import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";

interface Prediction {
  id: number;
  home_team: string;
  away_team: string;
  competition: string | null;
  predicted_outcome: string | null;
  confidence: number | null;
  home_win_prob: number | null;
  draw_prob: number | null;
  away_win_prob: number | null;
  notes: string | null;
  created_at: string;
}

interface PredictionStats {
  totalPredictions: number;
  recentPredictions: number;
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const outcomeLabel = (outcome: string | null) => {
  if (!outcome) return "—";
  switch (outcome.toLowerCase()) {
    case "home": return "Home Win";
    case "away": return "Away Win";
    case "draw": return "Draw";
    default: return outcome;
  }
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { t } = useI18n();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data: predictions, isLoading, isError, refetch } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions"],
    queryFn: () => apiRequest<Prediction[]>("/api/predictions"),
  });

  const { data: stats } = useQuery<PredictionStats>({
    queryKey: ["/api/predictions/stats"],
    queryFn: () => apiRequest<PredictionStats>("/api/predictions/stats"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/predictions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/predictions"] });
      qc.invalidateQueries({ queryKey: ["/api/predictions/stats"] });
    },
    onError: () => {
      if (Platform.OS === "web") {
        alert("Failed to delete prediction. Please try again.");
      } else {
        Alert.alert("Error", "Failed to delete prediction. Please try again.");
      }
    },
  });

  const handleDelete = (id: number) => {
    if (Platform.OS === "web") {
      if (confirm("Delete this prediction?")) {
        deleteMutation.mutate(id);
      }
    } else {
      Alert.alert("Delete", "Delete this prediction?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const outcomeColor = (outcome: string | null) => {
    if (!outcome) return colors.textMuted;
    switch (outcome.toLowerCase()) {
      case "home": return colors.accent;
      case "away": return colors.danger;
      case "draw": return colors.yellow;
      default: return colors.textMuted;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.savedPredictions}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t.predictions}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-text" size={20} color={colors.accent} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats?.totalPredictions ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.allTime}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="time" size={20} color={colors.blue} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats?.recentPredictions ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.thisWeek}</Text>
            </View>
          </View>

          {isLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}

          {isError && (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Failed to load predictions</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accentBg }]} onPress={() => refetch()}>
                <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isError && predictions?.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No predictions yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Go to Dashboard and analyze a match to save your first prediction!
              </Text>
            </View>
          )}

          {predictions?.map((p) => (
            <View key={p.id} style={[styles.predictionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.teamsRow}>
                  <Text style={[styles.teamName, { color: colors.text }]}>{p.home_team}</Text>
                  <Text style={[styles.vsText, { color: colors.textMuted }]}>vs</Text>
                  <Text style={[styles.teamName, { color: colors.text }]}>{p.away_team}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(p.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {p.competition && (
                <Text style={[styles.competition, { color: colors.textMuted }]}>{p.competition}</Text>
              )}

              <View style={styles.predictionInfo}>
                {p.predicted_outcome && (
                  <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor(p.predicted_outcome) + "20" }]}>
                    <Text style={[styles.outcomeText, { color: outcomeColor(p.predicted_outcome) }]}>
                      {outcomeLabel(p.predicted_outcome)}
                    </Text>
                  </View>
                )}
                {p.confidence && (
                  <View style={[styles.confidenceBadge, { backgroundColor: colors.blueBg }]}>
                    <Ionicons name="analytics" size={12} color={colors.blue} />
                    <Text style={[styles.confidenceText, { color: colors.blue }]}>{p.confidence}%</Text>
                  </View>
                )}
              </View>

              {(p.home_win_prob || p.draw_prob || p.away_win_prob) && (
                <View style={[styles.probRow, { backgroundColor: colors.bg }]}>
                  <View style={styles.probItem}>
                    <Text style={[styles.probLabel, { color: colors.textMuted }]}>H</Text>
                    <Text style={[styles.probValue, { color: colors.text }]}>{p.home_win_prob ?? 0}%</Text>
                  </View>
                  <View style={styles.probItem}>
                    <Text style={[styles.probLabel, { color: colors.textMuted }]}>D</Text>
                    <Text style={[styles.probValue, { color: colors.text }]}>{p.draw_prob ?? 0}%</Text>
                  </View>
                  <View style={styles.probItem}>
                    <Text style={[styles.probLabel, { color: colors.textMuted }]}>A</Text>
                    <Text style={[styles.probValue, { color: colors.text }]}>{p.away_win_prob ?? 0}%</Text>
                  </View>
                </View>
              )}

              {p.notes && <Text style={[styles.notes, { color: colors.textSecondary }]}>{p.notes}</Text>}
              <Text style={[styles.dateText, { color: colors.probDraw }]}>{fmtDate(p.created_at)}</Text>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center", gap: 6, borderWidth: 1 },
  statNumber: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  center: { paddingVertical: 60, alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  retryBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8, marginTop: 8 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  predictionCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  teamName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  vsText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  competition: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  predictionInfo: { flexDirection: "row", gap: 8, marginTop: 12 },
  outcomeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  outcomeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  confidenceBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  probRow: { flexDirection: "row", gap: 12, marginTop: 12, borderRadius: 10, padding: 10 },
  probItem: { flex: 1, alignItems: "center" },
  probLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  probValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 18 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 10 },
});
