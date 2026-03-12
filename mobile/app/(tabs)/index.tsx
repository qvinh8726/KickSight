import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MatchCard from "@/components/MatchCard";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useNotifications } from "@/lib/notifications-context";
import { useI18n } from "@/lib/i18n";
import type { DashboardData, AllMatchesData, LiveMatch } from "@/lib/types";

function AnimatedCounter({ value, suffix = "", color }: { value: number; suffix?: string; color?: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState("0");

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value: v }) => {
      setDisplay(Math.round(v).toString());
    });
    return () => animVal.removeListener(id);
  }, [value]);

  return <Text style={[styles.statValue, color ? { color } : undefined]}>{display}{suffix}</Text>;
}

function fmtTime(t: string) {
  if (!t || t === "TBD") return "TBD";
  const parts = t.split(":");
  if (parts.length < 2) return t;
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function TeamBadge({ uri, size = 20 }: { uri: string | null; size?: number }) {
  if (!uri) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#1C254040" }} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 3 }} resizeMode="contain" />;
}

function LiveMatchMini({ match, colors, onPress }: { match: LiveMatch; colors: any; onPress?: () => void }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const hasScore = isFinished || isLive;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.liveCard, { backgroundColor: colors.card, borderColor: isLive ? "#FF5252" : colors.border }]}>
      <View style={styles.liveLeagueRow}>
        <Text style={[styles.liveLeague, { color: colors.textMuted }]} numberOfLines={1}>{match.league}</Text>
        {isLive ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FF525220", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#FF5252" }} />
            <Text style={{ fontSize: 8, fontFamily: "Inter_700Bold", color: "#FF5252" }}>LIVE</Text>
          </View>
        ) : isFinished ? (
          <View style={[styles.ftBadge, { backgroundColor: colors.textMuted + "20" }]}>
            <Text style={[styles.ftText, { color: colors.textMuted }]}>FT</Text>
          </View>
        ) : (
          <Text style={[styles.liveTime, { color: colors.accent }]}>{fmtTime(match.time)}</Text>
        )}
      </View>
      <View style={styles.liveTeamRow}>
        <TeamBadge uri={match.home_badge} size={18} />
        <Text style={[styles.liveTeamName, { color: colors.text }]} numberOfLines={1}>{match.home_team}</Text>
        {hasScore && <Text style={[styles.liveScore, { color: colors.text }]}>{match.home_score}</Text>}
      </View>
      <View style={styles.liveTeamRow}>
        <TeamBadge uri={match.away_badge} size={18} />
        <Text style={[styles.liveTeamName, { color: colors.text }]} numberOfLines={1}>{match.away_team}</Text>
        {hasScore && <Text style={[styles.liveScore, { color: colors.text }]}>{match.away_score}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const cardsSlide = useRef(new Animated.Value(50)).current;

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest<DashboardData>("/api/dashboard"),
  });

  const { data: liveData } = useQuery<AllMatchesData>({
    queryKey: ["/api/football/all-matches"],
    queryFn: () => apiRequest<AllMatchesData>("/api/football/all-matches"),
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(statsSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.spring(cardsSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["/api/football/all-matches"] }),
    ]);
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t.goodMorning;
    if (h < 18) return t.goodAfternoon;
    return t.goodEvening;
  };

  const navigateToMatch = (m: LiveMatch) => {
    const espnId = m.id.includes("_") ? m.id.split("_").slice(1).join("_") : m.id;
    router.push({
      pathname: "/match-detail",
      params: {
        leagueKey: m.league_key,
        espnId,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        homeBadge: m.home_badge || "",
        awayBadge: m.away_badge || "",
        homeScore: m.home_score?.toString() || "",
        awayScore: m.away_score?.toString() || "",
        date: m.date,
        time: m.time,
        venue: m.venue || "",
        status: m.status,
        league: m.league,
        homeForm: m.home_form || "",
        awayForm: m.away_form || "",
        homeRecord: m.home_record || "",
        awayRecord: m.away_record || "",
      },
    });
  };

  const recentResults = (liveData?.results ?? []).slice(0, 4);
  const upcomingLive = (liveData?.upcoming ?? []).slice(0, 4);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <Animated.View style={[styles.header, { borderBottomColor: colors.border, opacity: fadeAnim, transform: [{ translateY: headerSlide }] }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoIcon, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
            <Ionicons name="football" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>{greeting()}, {user?.name?.split(" ")[0] || "User"}</Text>
            <Text style={[styles.logoSub, { color: colors.textMuted }]}>{t.appName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/notifications")}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
          {unreadCount > 0 && (
            <View style={[styles.notifDot, { backgroundColor: colors.accent }]}>
              {unreadCount < 10 && <Text style={styles.notifCount}>{unreadCount}</Text>}
            </View>
          )}
        </TouchableOpacity>
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
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t.loadingMatches}</Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <View style={[styles.errorIconCircle, { backgroundColor: colors.dangerBg }]}>
              <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>{t.connectionError}</Text>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>{t.couldNotReach}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.accent }]}>{t.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: statsSlide }] }]}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.blueBg }]}>
                  <Ionicons name="football-outline" size={18} color={colors.blue} />
                </View>
                <AnimatedCounter value={data.stats.upcoming_matches} color={colors.text} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.matchesCount}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.cardAccent, borderColor: colors.borderAccent }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.accentBg }]}>
                  <Ionicons name="flash" size={18} color={colors.accent} />
                </View>
                <AnimatedCounter value={data.stats.value_bets} color={colors.text} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.valueBets}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.purpleBg }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.purple} />
                </View>
                <AnimatedCounter value={Math.round(data.stats.avg_confidence * 100)} suffix="%" color={colors.text} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.confidence}</Text>
              </View>
            </Animated.View>

            <View style={[styles.modelBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="hardware-chip-outline" size={14} color={colors.accent} />
              <Text style={[styles.modelText, { color: colors.text }]}>{data.stats.model}</Text>
              <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.liveTextBadge, { color: colors.accent }]}>{t.live}</Text>
            </View>
          </>
        )}

        {recentResults.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: cardsSlide }] }}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionLeft}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t.recentResults}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tabs)/matches")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>{t.seeAll}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {recentResults.map((m) => (
                <LiveMatchMini key={m.id} match={m} colors={colors} onPress={() => navigateToMatch(m)} />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {upcomingLive.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: cardsSlide }], marginTop: 16 }}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionLeft}>
                <Ionicons name="time-outline" size={16} color={colors.accent} />
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t.upcomingMatches}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tabs)/matches")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>{t.seeAll}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {upcomingLive.map((m) => (
                <LiveMatchMini key={m.id} match={m} colors={colors} onPress={() => navigateToMatch(m)} />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {data && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: cardsSlide }], marginTop: 16 }}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionLeft}>
                <Ionicons name="analytics" size={16} color={colors.accent} />
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t.predictions.toUpperCase()}</Text>
              </View>
            </View>
            {data.matches.map((m, i) => (
              <MatchCard key={m.match.id} data={m} index={i} />
            ))}
          </Animated.View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  greeting: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  logoSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notifCount: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#0B0F1A" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorBox: { alignItems: "center", marginTop: 60, gap: 8 },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  retryBtn: {
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
    borderWidth: 1,
  },
  modelText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  liveTextBadge: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  seeAll: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  liveCard: { width: 200, borderRadius: 12, padding: 10, borderWidth: 1 },
  liveLeagueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  liveLeague: { fontSize: 9, fontFamily: "Inter_500Medium", flex: 1, marginRight: 4 },
  liveTime: { fontSize: 10, fontFamily: "Inter_700Bold" },
  ftBadge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  ftText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  liveTeamRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  liveTeamName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  liveScore: { fontSize: 14, fontFamily: "Inter_700Bold", width: 20, textAlign: "center" },
});
