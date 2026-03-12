import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  probHome: number;
  probDraw: number;
  probAway: number;
  homeLabel: string;
  awayLabel: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function ProbabilityBar({ probHome, probDraw, probAway, homeLabel, awayLabel }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: "#00E676" }]}>{homeLabel}</Text>
        <Text style={[styles.label, { color: "#8892A4" }]}>Draw</Text>
        <Text style={[styles.label, { color: "#FF5252" }]}>{awayLabel}</Text>
      </View>
      <View style={styles.barRow}>
        <View style={[styles.segment, { flex: probHome, backgroundColor: "#00E676" }]} />
        <View style={[styles.segment, { flex: probDraw, backgroundColor: "#4A5568", marginHorizontal: 2 }]} />
        <View style={[styles.segment, { flex: probAway, backgroundColor: "#FF5252" }]} />
      </View>
      <View style={styles.pctRow}>
        <Text style={[styles.pct, { color: "#00E676" }]}>{pct(probHome)}</Text>
        <Text style={[styles.pct, { color: "#8892A4" }]}>{pct(probDraw)}</Text>
        <Text style={[styles.pct, { color: "#FF5252" }]}>{pct(probAway)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  labels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  barRow: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" },
  segment: { height: 6 },
  pctRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  pct: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
