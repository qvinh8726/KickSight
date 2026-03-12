import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProbabilityBar from "./ProbabilityBar";
import type { DashboardMatch } from "@/lib/types";

interface Props {
  data: DashboardMatch;
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const fmtOdds = (n: number) => n.toFixed(2);

export default function MatchCard({ data }: Props) {
  const { match, prediction, value_bets, fair_odds_home, fair_odds_draw, fair_odds_away, odds } = data;
  const hasValue = value_bets.length > 0;
  const bookOdds = odds[0];

  return (
    <View style={[styles.card, hasValue && styles.cardHighlight]}>
      {hasValue && <View style={styles.valuePill}><Text style={styles.valuePillText}>{value_bets.length} VALUE</Text></View>}

      <View style={styles.header}>
        <Text style={styles.competition}>{match.competition_stage?.replace("_", " ")}</Text>
        <View style={styles.badges}>
          {match.is_knockout && <View style={styles.badge}><Text style={styles.badgeText}>KO</Text></View>}
          {match.is_neutral_venue && <View style={[styles.badge, styles.badgeBlue]}><Text style={styles.badgeText}>NEUTRAL</Text></View>}
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamSide}>
          <Text style={styles.teamName} numberOfLines={1}>{match.home_team}</Text>
          <Text style={styles.teamDate}>{fmtDate(match.match_date)}</Text>
        </View>
        <View style={styles.vsBox}>
          {match.status === "finished" ? (
            <Text style={styles.score}>{match.home_goals} - {match.away_goals}</Text>
          ) : (
            <Text style={styles.vs}>VS</Text>
          )}
        </View>
        <View style={[styles.teamSide, styles.teamRight]}>
          <Text style={[styles.teamName, { textAlign: "right" }]} numberOfLines={1}>{match.away_team}</Text>
          <Text style={[styles.teamDate, { textAlign: "right" }]}>Proj: {prediction.projected_scoreline}</Text>
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
        <View style={styles.oddsCell}>
          <Text style={styles.oddsLabel}>Fair</Text>
          <Text style={[styles.oddsVal, { color: "#00E676" }]}>{fmtOdds(fair_odds_home)}</Text>
        </View>
        <View style={styles.oddsCell}>
          <Text style={styles.oddsLabel}>Fair X</Text>
          <Text style={[styles.oddsVal, { color: "#8892A4" }]}>{fmtOdds(fair_odds_draw)}</Text>
        </View>
        <View style={styles.oddsCell}>
          <Text style={styles.oddsLabel}>Fair</Text>
          <Text style={[styles.oddsVal, { color: "#FF5252" }]}>{fmtOdds(fair_odds_away)}</Text>
        </View>
        {bookOdds && (
          <>
            <View style={[styles.oddsCell, styles.divider]} />
            <View style={styles.oddsCell}>
              <Text style={styles.oddsLabel}>{bookOdds.bookmaker.slice(0,3)}</Text>
              <Text style={styles.oddsVal}>{fmtOdds(bookOdds.home)}</Text>
            </View>
            <View style={styles.oddsCell}>
              <Text style={styles.oddsLabel}>Draw</Text>
              <Text style={styles.oddsVal}>{fmtOdds(bookOdds.draw)}</Text>
            </View>
            <View style={styles.oddsCell}>
              <Text style={styles.oddsLabel}>Away</Text>
              <Text style={styles.oddsVal}>{fmtOdds(bookOdds.away)}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.confidenceRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color="#8892A4" />
          <Text style={styles.confidence}>{Math.round(prediction.confidence * 100)}% confidence</Text>
        </View>
        <Text style={styles.scoreline}>
          <Ionicons name="trending-up-outline" size={11} color="#8892A4" /> {prediction.projected_scoreline}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1C2540",
  },
  cardHighlight: {
    borderColor: "#00E67630",
    backgroundColor: "#131B2E",
  },
  valuePill: {
    position: "absolute",
    top: -1,
    right: 12,
    backgroundColor: "#00E676",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  valuePillText: {
    color: "#0B0F1A",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  competition: {
    fontSize: 10,
    color: "#4A5568",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  badges: { flexDirection: "row", gap: 4 },
  badge: {
    backgroundColor: "#FF525220",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeBlue: { backgroundColor: "#3B82F620" },
  badgeText: { fontSize: 8, color: "#FF5252", fontFamily: "Inter_600SemiBold" },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  teamSide: { flex: 1 },
  teamRight: { alignItems: "flex-end" },
  teamName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  teamDate: {
    fontSize: 10,
    color: "#4A5568",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  vsBox: {
    width: 40,
    alignItems: "center",
  },
  vs: {
    fontSize: 11,
    color: "#4A5568",
    fontFamily: "Inter_600SemiBold",
  },
  score: {
    fontSize: 18,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  oddsRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1C2540",
  },
  oddsCell: { flex: 1, alignItems: "center" },
  oddsLabel: { fontSize: 9, color: "#4A5568", fontFamily: "Inter_400Regular", marginBottom: 2 },
  oddsVal: { fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  divider: { width: 1, backgroundColor: "#1C2540", flex: 0, marginHorizontal: 6 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  confidence: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_400Regular" },
  scoreline: { fontSize: 11, color: "#8892A4", fontFamily: "Inter_400Regular" },
});
