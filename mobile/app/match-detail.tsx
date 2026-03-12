import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";

function TeamBadge({ uri, size = 48 }: { uri: string | null; size?: number }) {
  if (!uri) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254040" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />;
}

function FormBadges({ form }: { form: string | null }) {
  if (!form) return null;
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {form.split("").slice(-5).map((c, i) => {
        let bg = "#666";
        if (c === "W") bg = "#00C853";
        else if (c === "L") bg = "#FF5252";
        else if (c === "D") bg = "#FFA726";
        return (
          <View key={i} style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{c}</Text>
          </View>
        );
      })}
    </View>
  );
}

function StatBar({ label, homeVal, awayVal, colors }: { label: string; homeVal: string; awayVal: string; colors: any }) {
  const hNum = parseFloat(homeVal) || 0;
  const aNum = parseFloat(awayVal) || 0;
  const total = hNum + aNum || 1;
  const hPct = (hNum / total) * 100;
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statVal, { color: colors.text, textAlign: "left" }]}>{homeVal}</Text>
      <View style={styles.statBarOuter}>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
        <View style={styles.statBarTrack}>
          <View style={[styles.statBarHome, { width: `${hPct}%`, backgroundColor: hNum >= aNum ? colors.accent : colors.textMuted + "60" }]} />
          <View style={[styles.statBarAway, { width: `${100 - hPct}%`, backgroundColor: aNum > hNum ? "#FF5252" : colors.textMuted + "60" }]} />
        </View>
      </View>
      <Text style={[styles.statVal, { color: colors.text, textAlign: "right" }]}>{awayVal}</Text>
    </View>
  );
}

function ProbabilityBar({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  const pct = Math.round(value * 100);
  return (
    <View style={styles.probRow}>
      <Text style={[styles.probLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.probBarTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.probBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.probValue, { color }]}>{pct}%</Text>
    </View>
  );
}

export default function MatchDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [showAI, setShowAI] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  const params = useLocalSearchParams<{
    leagueKey: string;
    espnId: string;
    homeTeam: string;
    awayTeam: string;
    homeBadge: string;
    awayBadge: string;
    homeScore: string;
    awayScore: string;
    date: string;
    time: string;
    venue: string;
    status: string;
    league: string;
    homeForm: string;
    awayForm: string;
    homeRecord: string;
    awayRecord: string;
  }>();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/football/match-detail", params.leagueKey, params.espnId],
    queryFn: () => apiRequest(`/api/football/match-detail/${params.leagueKey}/${params.espnId}`),
    enabled: !!params.leagueKey && !!params.espnId,
  });

  const { data: aiData, isLoading: aiLoading, refetch: fetchAI } = useQuery({
    queryKey: ["/api/football/ai-analysis", params.leagueKey, params.espnId],
    queryFn: () => apiRequest(`/api/football/ai-analysis/${params.leagueKey}/${params.espnId}`),
    enabled: false,
  });

  const handleAIAnalysis = () => {
    if (!aiLoaded) {
      fetchAI();
      setAiLoaded(true);
    }
    setShowAI(true);
  };

  const isFinished = params.status === "finished";
  const isLive = params.status === "live";
  const hasScore = isFinished || isLive;

  const fmtDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const fmtTime = (t: string) => {
    if (!t || t === "TBD") return "TBD";
    const parts = t.split(":");
    if (parts.length < 2) return t;
    const h = parseInt(parts[0]);
    const m = parts[1];
    return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  };

  const statsOrder = [
    "Possession", "SHOTS", "ON GOAL", "Fouls", "Corner Kicks",
    "Offsides", "Yellow Cards", "Red Cards", "Saves",
  ];

  const homeStats: Record<string, string> = (data as any)?.home_stats || {};
  const awayStats: Record<string, string> = (data as any)?.away_stats || {};
  const keyEvents: any[] = (data as any)?.key_events || [];
  const h2h: any[] = (data as any)?.head_to_head || [];
  const ai = aiData as any;

  const RISK_COLORS: Record<string, string> = { low: "#00C853", medium: "#FFA726", high: "#FF5252" };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.textMuted }]}>{params.league || t.matchDetail}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isLive && (
            <View style={styles.liveBanner}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBannerText}>LIVE</Text>
            </View>
          )}

          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <TeamBadge uri={params.homeBadge || null} size={52} />
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>{params.homeTeam}</Text>
              {(params.homeRecord || (data as any)?.home_record) && <Text style={[styles.teamRecord, { color: colors.textMuted }]}>{params.homeRecord || (data as any)?.home_record}</Text>}
            </View>

            <View style={styles.scoreCol}>
              {hasScore ? (
                <View style={styles.scoreBox}>
                  <Text style={[styles.scoreBig, { color: colors.text }]}>{params.homeScore}</Text>
                  <Text style={[styles.scoreDash, { color: colors.textMuted }]}>-</Text>
                  <Text style={[styles.scoreBig, { color: colors.text }]}>{params.awayScore}</Text>
                </View>
              ) : (
                <Text style={[styles.vsText, { color: colors.accent }]}>VS</Text>
              )}
              {isFinished && (
                <View style={[styles.ftChip, { backgroundColor: colors.textMuted + "20" }]}>
                  <Text style={[styles.ftChipText, { color: colors.textMuted }]}>{t.fullTime}</Text>
                </View>
              )}
              {!hasScore && (
                <Text style={[styles.kickoffTime, { color: colors.accent }]}>{fmtTime(params.time)}</Text>
              )}
            </View>

            <View style={styles.teamCol}>
              <TeamBadge uri={params.awayBadge || null} size={52} />
              <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>{params.awayTeam}</Text>
              {(params.awayRecord || (data as any)?.away_record) && <Text style={[styles.teamRecord, { color: colors.textMuted }]}>{params.awayRecord || (data as any)?.away_record}</Text>}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>{t.form}</Text>
              <FormBadges form={params.homeForm || (data as any)?.home_form || null} />
            </View>
            <View style={styles.formCol}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>{t.form}</Text>
              <FormBadges form={params.awayForm || (data as any)?.away_form || null} />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.accent }]}
          onPress={handleAIAnalysis}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="robot" size={20} color="#0B0F1A" />
          <Text style={styles.aiButtonText}>{t.aiAnalysis}</Text>
          <Ionicons name="chevron-forward" size={18} color="#0B0F1A" />
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.text }]}>{fmtDate(params.date)}</Text>
          </View>
          {(params.venue || (data as any)?.venue) && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {(data as any)?.venue || params.venue}
                {(data as any)?.venue_city ? `, ${(data as any).venue_city}` : ""}
              </Text>
            </View>
          )}
          {(data as any)?.attendance && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>{Number((data as any).attendance).toLocaleString()}</Text>
            </View>
          )}
          {(data as any)?.referee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>{t.referee}: {(data as any).referee}</Text>
            </View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.loadingDetails}</Text>
          </View>
        )}

        {keyEvents.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.keyEvents}</Text>
            {keyEvents.map((ev, i) => {
              let icon: any = "football-outline";
              let iconColor = colors.accent;
              if (ev.type.includes("Yellow")) { icon = "square"; iconColor = "#FFA726"; }
              else if (ev.type.includes("Red")) { icon = "square"; iconColor = "#FF5252"; }
              else if (ev.type.includes("Goal")) { icon = "football"; iconColor = colors.accent; }
              else if (ev.type.includes("Substitution")) { icon = "swap-horizontal"; iconColor = colors.textMuted; }
              return (
                <View key={i} style={[styles.eventRow, { borderBottomColor: i < keyEvents.length - 1 ? colors.border : "transparent" }]}>
                  <Text style={[styles.eventClock, { color: colors.accent }]}>{ev.clock}</Text>
                  <Ionicons name={icon} size={14} color={iconColor} />
                  <Text style={[styles.eventText, { color: colors.text }]} numberOfLines={2}>{ev.text}</Text>
                </View>
              );
            })}
          </View>
        )}

        {Object.keys(homeStats).length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.matchStatistics}</Text>
            <View style={styles.statTeamHeader}>
              <Text style={[styles.statTeamName, { color: colors.text }]}>{params.homeTeam?.split(" ").pop()}</Text>
              <Text style={[styles.statTeamName, { color: colors.text }]}>{params.awayTeam?.split(" ").pop()}</Text>
            </View>
            {statsOrder.map((label) => {
              const hv = homeStats[label];
              const av = awayStats[label];
              if (!hv && !av) return null;
              return <StatBar key={label} label={label} homeVal={hv || "0"} awayVal={av || "0"} colors={colors} />;
            })}
          </View>
        )}

        {h2h.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.headToHead}</Text>
            {h2h.map((g: any, i: number) => (
              <View key={i} style={[styles.h2hRow, { borderBottomColor: i < h2h.length - 1 ? colors.border : "transparent" }]}>
                <Text style={[styles.h2hDate, { color: colors.textMuted }]}>{g.date}</Text>
                <Text style={[styles.h2hTeam, { color: colors.text }]} numberOfLines={1}>{g.home}</Text>
                <View style={[styles.h2hScore, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.h2hScoreText, { color: colors.text }]}>{g.home_score} - {g.away_score}</Text>
                </View>
                <Text style={[styles.h2hTeam, { color: colors.text, textAlign: "right" }]} numberOfLines={1}>{g.away}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAI} transparent animationType="slide" onRequestClose={() => setShowAI(false)}>
        <View style={[styles.aiModalOverlay, { backgroundColor: colors.bg + "F5" }]}>
          <View style={[styles.aiModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.aiModalHeader}>
              <View style={styles.aiModalHeaderLeft}>
                <MaterialCommunityIcons name="robot" size={22} color={colors.accent} />
                <Text style={[styles.aiModalTitle, { color: colors.text }]}>{t.aiAnalysis}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAI(false)} style={styles.aiCloseBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.aiScroll}>
              {aiLoading && (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator color={colors.accent} size="large" />
                  <Text style={[styles.aiLoadingText, { color: colors.textMuted }]}>{t.analyzing}</Text>
                </View>
              )}

              {ai && !aiLoading && (
                <>
                  <View style={[styles.aiSection, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.aiSectionTitle, { color: colors.textMuted }]}>{t.winProbability}</Text>
                    <ProbabilityBar label={params.homeTeam?.split(" ").pop() || t.home} value={ai.probHome} color={colors.accent} colors={colors} />
                    <ProbabilityBar label={t.draw} value={ai.probDraw} color="#FFA726" colors={colors} />
                    <ProbabilityBar label={params.awayTeam?.split(" ").pop() || t.away} value={ai.probAway} color="#FF5252" colors={colors} />
                  </View>

                  <View style={[styles.aiStatsRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.aiStatBox}>
                      <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>{t.projectedScore}</Text>
                      <Text style={[styles.aiStatValue, { color: colors.text }]}>{ai.projectedScore}</Text>
                    </View>
                    <View style={[styles.aiStatDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.aiStatBox}>
                      <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>{t.expectedGoals}</Text>
                      <Text style={[styles.aiStatValue, { color: colors.text }]}>{ai.homeExpGoals} - {ai.awayExpGoals}</Text>
                    </View>
                    <View style={[styles.aiStatDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.aiStatBox}>
                      <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>{t.confidence}</Text>
                      <Text style={[styles.aiStatValue, { color: colors.accent }]}>{Math.round(ai.confidence * 100)}%</Text>
                    </View>
                  </View>

                  <View style={[styles.aiSection, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.aiSectionTitle, { color: colors.textMuted }]}>{t.recommendedBet}</Text>
                    <View style={[styles.recommendationCard, { backgroundColor: RISK_COLORS[ai.riskLevel] + "15", borderColor: RISK_COLORS[ai.riskLevel] + "40" }]}>
                      <View style={styles.recommendRow}>
                        <Ionicons name={ai.riskLevel === "low" ? "shield-checkmark" : ai.riskLevel === "medium" ? "warning" : "alert-circle"} size={18} color={RISK_COLORS[ai.riskLevel]} />
                        <Text style={[styles.recommendText, { color: colors.text }]}>{ai.recommendation}</Text>
                      </View>
                      <Text style={[styles.riskTag, { color: RISK_COLORS[ai.riskLevel] }]}>
                        {ai.riskLevel === "low" ? t.riskLow : ai.riskLevel === "medium" ? t.riskMedium : t.riskHigh}
                      </Text>
                    </View>
                  </View>

                  {ai.picks && ai.picks.length > 0 && (
                    <View style={[styles.aiSection, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.aiSectionTitle, { color: colors.textMuted }]}>{t.bettingPicks}</Text>
                      {ai.picks.map((pick: any, i: number) => (
                        <View key={i} style={[styles.pickCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                          <View style={styles.pickHeader}>
                            <Text style={[styles.pickMarket, { color: colors.textMuted }]}>{pick.market}</Text>
                            <Text style={[styles.pickOdds, { color: colors.accent }]}>@{pick.odds?.toFixed(2)}</Text>
                          </View>
                          <Text style={[styles.pickSelection, { color: colors.text }]}>{pick.pick}</Text>
                          <View style={[styles.pickProbBar, { backgroundColor: colors.border }]}>
                            <View style={[styles.pickProbFill, { width: `${Math.round(pick.probability * 100)}%`, backgroundColor: colors.accent + "80" }]} />
                          </View>
                          <Text style={[styles.pickProbText, { color: colors.textMuted }]}>{t.probability}: {Math.round(pick.probability * 100)}%</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {ai.keyFactors && ai.keyFactors.length > 0 && (
                    <View style={styles.aiSection}>
                      <Text style={[styles.aiSectionTitle, { color: colors.textMuted }]}>{t.keyFactorsTitle}</Text>
                      {ai.keyFactors.map((f: string, i: number) => (
                        <View key={i} style={styles.factorRow}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                          <Text style={[styles.factorText, { color: colors.textSecondary }]}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  loadingBox: { alignItems: "center", marginTop: 30, gap: 10 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  liveBanner: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", backgroundColor: "#FF525220", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5252" },
  liveBannerText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FF5252" },
  teamsRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  teamCol: { flex: 1, alignItems: "center", gap: 8 },
  teamName: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  teamRecord: { fontSize: 10, fontFamily: "Inter_400Regular" },
  scoreCol: { alignItems: "center", justifyContent: "center", paddingHorizontal: 8, gap: 6, minWidth: 100 },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreBig: { fontSize: 36, fontFamily: "Inter_700Bold" },
  scoreDash: { fontSize: 24 },
  vsText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  kickoffTime: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ftChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  ftChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  formRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
  formCol: { alignItems: "center", gap: 4 },
  formLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },

  aiButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, paddingVertical: 14, marginVertical: 4,
  },
  aiButtonText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0B0F1A" },

  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },

  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  eventClock: { fontSize: 12, fontFamily: "Inter_700Bold", width: 32 },
  eventText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  statTeamHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  statTeamName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statVal: { fontSize: 13, fontFamily: "Inter_700Bold", width: 40 },
  statBarOuter: { flex: 1, gap: 3 },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statBarTrack: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" },
  statBarHome: { height: 6, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  statBarAway: { height: 6, borderTopRightRadius: 3, borderBottomRightRadius: 3 },

  h2hRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 6 },
  h2hDate: { fontSize: 10, fontFamily: "Inter_400Regular", width: 72 },
  h2hTeam: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  h2hScore: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  h2hScoreText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  aiModalOverlay: { flex: 1, justifyContent: "flex-end" },
  aiModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, maxHeight: "85%", paddingBottom: Platform.OS === "web" ? 30 : 20 },
  aiModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 },
  aiModalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  aiCloseBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  aiScroll: { paddingHorizontal: 20 },
  aiLoadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  aiLoadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  aiSection: { paddingVertical: 16, borderBottomWidth: 1, gap: 10 },
  aiSectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },

  probRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  probLabel: { width: 60, fontSize: 12, fontFamily: "Inter_500Medium" },
  probBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  probBarFill: { height: 8, borderRadius: 4 },
  probValue: { width: 40, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },

  aiStatsRow: { flexDirection: "row", paddingVertical: 16, borderBottomWidth: 1 },
  aiStatBox: { flex: 1, alignItems: "center", gap: 4 },
  aiStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  aiStatValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  aiStatDivider: { width: 1, height: 36, alignSelf: "center" },

  recommendationCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  recommendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  recommendText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  riskTag: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  pickCard: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  pickHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  pickMarket: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pickOdds: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pickSelection: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 8 },
  pickProbBar: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  pickProbFill: { height: 4, borderRadius: 2 },
  pickProbText: { fontSize: 10, fontFamily: "Inter_400Regular" },

  factorRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  factorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
