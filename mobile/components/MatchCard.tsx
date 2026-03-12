import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProbabilityBar from "./ProbabilityBar";
import type { DashboardMatch } from "@/lib/types";

interface Props {
  data: DashboardMatch;
  index?: number;
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const fmtOdds = (n: number) => n.toFixed(2);

export default function MatchCard({ data, index = 0 }: Props) {
  const { match, prediction, value_bets, fair_odds_home, fair_odds_draw, fair_odds_away, odds } = data;
  const hasValue = value_bets.length > 0;
  const bookOdds = odds[0];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, hasValue && styles.cardHighlight, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {hasValue && (
        <View style={styles.valuePill}>
          <Ionicons name="flash" size={8} color="#0B0F1A" />
          <Text style={styles.valuePillText}>{value_bets.length} VALUE</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.stageBadge}>
          <Text style={styles.stageText}>{match.competition_stage?.replace("_", " ")}</Text>
        </View>
        <View style={styles.badges}>
          {match.is_knockout && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>KO</Text>
            </View>
          )}
          {match.is_neutral_venue && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text style={[styles.badgeText, { color: "#3B82F6" }]}>NEUTRAL</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamSide}>
          <Text style={styles.teamName} numberOfLines={1}>{match.home_team}</Text>
          <Text style={styles.teamDate}>{fmtDate(match.match_date)}</Text>
        </View>
        <View style={styles.vsBox}>
          <View style={styles.vsCircle}>
            <Text style={styles.vs}>VS</Text>
          </View>
        </View>
        <View style={[styles.teamSide, styles.teamRight]}>
          <Text style={[styles.teamName, { textAlign: "right" }]} numberOfLines={1}>{match.away_team}</Text>
          <Text style={[styles.teamDate, { textAlign: "right" }]}>
            <Ionicons name="trending-up-outline" size={10} color="#4A5568" /> {prediction.projected_scoreline}
          </Text>
        </View>
      </View>

      <ProbabilityBar
        probHome={prediction.prob_home}
        probDraw={prediction.prob_draw}
        probAway={prediction.prob_away}
        homeLabel={match.home_team.slice(0, 3).toUpperCase()}
        awayLabel={match.away_team.slice(0, 3).toUpperCase()}
      />

      <View style={styles.oddsRow}>
        <OddsCell label="Fair 1" value={fmtOdds(fair_odds_home)} color="#00E676" />
        <OddsCell label="Fair X" value={fmtOdds(fair_odds_draw)} color="#8892A4" />
        <OddsCell label="Fair 2" value={fmtOdds(fair_odds_away)} color="#FF5252" />
        {bookOdds && (
          <>
            <View style={styles.oddsDivider} />
            <OddsCell label="Book 1" value={fmtOdds(bookOdds.home)} />
            <OddsCell label="Book X" value={fmtOdds(bookOdds.draw)} />
            <OddsCell label="Book 2" value={fmtOdds(bookOdds.away)} />
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.confidenceRow}>
          <View style={styles.confBarBg}>
            <View
              style={[
                styles.confBarFill,
                { width: `${Math.round(prediction.confidence * 100)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.confidence}>{Math.round(prediction.confidence * 100)}%</Text>
        </View>
        {bookOdds && (
          <View style={styles.bookBadge}>
            <Text style={styles.bookName}>{bookOdds.bookmaker}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function OddsCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.oddsCell}>
      <Text style={styles.oddsLabel}>{label}</Text>
      <Text style={[styles.oddsVal, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#131B2E",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  cardHighlight: {
    borderColor: "#00E67640",
    backgroundColor: "#0D1A14",
  },
  valuePill: {
    position: "absolute",
    top: -1,
    right: 14,
    backgroundColor: "#00E676",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  valuePillText: {
    color: "#0B0F1A",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  stageBadge: {
    backgroundColor: "#1C254080",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageText: {
    fontSize: 9,
    color: "#8892A4",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  badges: { flexDirection: "row", gap: 4 },
  badge: {
    backgroundColor: "#FF525218",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeBlue: { backgroundColor: "#3B82F618" },
  badgeText: { fontSize: 8, color: "#FF5252", fontFamily: "Inter_700Bold" },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  teamSide: { flex: 1 },
  teamRight: { alignItems: "flex-end" },
  teamName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  teamDate: {
    fontSize: 11,
    color: "#4A5568",
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  vsBox: { width: 44, alignItems: "center" },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1C2540",
    alignItems: "center",
    justifyContent: "center",
  },
  vs: {
    fontSize: 10,
    color: "#4A5568",
    fontFamily: "Inter_700Bold",
  },
  oddsRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1C2540",
  },
  oddsCell: { flex: 1, alignItems: "center" },
  oddsLabel: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular", marginBottom: 3 },
  oddsVal: { fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  oddsDivider: { width: 1, backgroundColor: "#1C2540", marginHorizontal: 4 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  confBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#1C2540",
    borderRadius: 2,
    overflow: "hidden",
    maxWidth: 100,
  },
  confBarFill: { height: 4, backgroundColor: "#00E676", borderRadius: 2 },
  confidence: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_500Medium" },
  bookBadge: {
    backgroundColor: "#1C2540",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookName: { fontSize: 10, color: "#8892A4", fontFamily: "Inter_500Medium" },
});
