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

const outcomeColor = (outcome: string | null) => {
  if (!outcome) return "#4A5568";
  switch (outcome.toLowerCase()) {
    case "home": return "#00E676";
    case "away": return "#FF6B6B";
    case "draw": return "#FFD93D";
    default: return "#4A5568";
  }
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

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>My Predictions</Text>
          <Text style={styles.subtitle}>Your saved match analyses</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={20} color="#00E676" />
              <Text style={styles.statNumber}>{stats?.totalPredictions ?? 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={20} color="#448AFF" />
              <Text style={styles.statNumber}>{stats?.recentPredictions ?? 0}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>

          {isLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#00E676" />
            </View>
          )}

          {isError && (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color="#FF5252" />
              <Text style={styles.emptyText}>Failed to load predictions</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isError && predictions?.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color="#2D3748" />
              <Text style={styles.emptyTitle}>No predictions yet</Text>
              <Text style={styles.emptyText}>
                Go to Dashboard and analyze a match to save your first prediction!
              </Text>
            </View>
          )}

          {predictions?.map((p) => (
            <View key={p.id} style={styles.predictionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.teamsRow}>
                  <Text style={styles.teamName}>{p.home_team}</Text>
                  <Text style={styles.vsText}>vs</Text>
                  <Text style={styles.teamName}>{p.away_team}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(p.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color="#4A5568" />
                </TouchableOpacity>
              </View>

              {p.competition && (
                <Text style={styles.competition}>{p.competition}</Text>
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
                  <View style={styles.confidenceBadge}>
                    <Ionicons name="analytics" size={12} color="#448AFF" />
                    <Text style={styles.confidenceText}>{p.confidence}%</Text>
                  </View>
                )}
              </View>

              {(p.home_win_prob || p.draw_prob || p.away_win_prob) && (
                <View style={styles.probRow}>
                  <View style={styles.probItem}>
                    <Text style={styles.probLabel}>H</Text>
                    <Text style={styles.probValue}>{p.home_win_prob ?? 0}%</Text>
                  </View>
                  <View style={styles.probItem}>
                    <Text style={styles.probLabel}>D</Text>
                    <Text style={styles.probValue}>{p.draw_prob ?? 0}%</Text>
                  </View>
                  <View style={styles.probItem}>
                    <Text style={styles.probLabel}>A</Text>
                    <Text style={styles.probValue}>{p.away_win_prob ?? 0}%</Text>
                  </View>
                </View>
              )}

              {p.notes && <Text style={styles.notes}>{p.notes}</Text>}

              <Text style={styles.dateText}>{fmtDate(p.created_at)}</Text>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F1A" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  statNumber: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#4A5568" },
  center: { paddingVertical: 60, alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#4A5568", textAlign: "center", lineHeight: 20 },
  retryBtn: {
    backgroundColor: "#00E67620",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#00E676" },
  predictionCard: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  teamName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  vsText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#4A5568" },
  competition: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#4A5568", marginTop: 4 },
  predictionInfo: { flexDirection: "row", gap: 8, marginTop: 12 },
  outcomeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  outcomeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#448AFF20",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#448AFF" },
  probRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    backgroundColor: "#0B0F1A",
    borderRadius: 10,
    padding: 10,
  },
  probItem: { flex: 1, alignItems: "center" },
  probLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#4A5568" },
  probValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 2 },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8892A4", marginTop: 10, lineHeight: 18 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#2D3748", marginTop: 10 },
});
