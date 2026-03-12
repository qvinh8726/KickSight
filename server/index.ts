import express from "express";
import cors from "cors";
import { DEMO_MATCHES, BACKTEST_RESULTS } from "./data/demo";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

app.get("/api/dashboard", (_req, res) => {
  const totalValueBets = DEMO_MATCHES.reduce(
    (sum, m) => sum + m.value_bets.length,
    0
  );
  const avgConfidence =
    DEMO_MATCHES.reduce((sum, m) => sum + m.prediction.confidence, 0) /
    DEMO_MATCHES.length;

  res.json({
    matches: DEMO_MATCHES,
    stats: {
      upcoming_matches: DEMO_MATCHES.length,
      value_bets: totalValueBets,
      avg_confidence: avgConfidence,
      model: "Ensemble v1",
    },
  });
});

app.get("/api/matches", (_req, res) => {
  res.json(DEMO_MATCHES.map((m) => m.match));
});

app.get("/api/value-bets", (_req, res) => {
  const allBets = DEMO_MATCHES.flatMap((m) =>
    m.value_bets.map((b) => ({
      ...b,
      home_team: m.match.home_team,
      away_team: m.match.away_team,
      match_date: m.match.match_date,
      competition: m.match.competition,
    }))
  ).sort((a, b) => b.ev - a.ev);

  res.json(allBets);
});

app.get("/api/backtest", (_req, res) => {
  res.json(BACKTEST_RESULTS);
});

app.listen(PORT, () => {
  console.log(`WC2026 Betting API running on port ${PORT}`);
});
