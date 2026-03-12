import { analyzeMatch, AnalysisResult } from "./analysis";

export interface FreeTierAnalysis {
  tier: "free";
  homeTeam: string;
  awayTeam: string;
  probHome: number;
  probDraw: number;
  probAway: number;
  projectedScore: string;
  confidence: number;
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
  keyFactors: string[];
  upgradeHint: string;
}

export interface ProTierAnalysis {
  tier: "pro";
  homeTeam: string;
  awayTeam: string;
  probHome: number;
  probDraw: number;
  probAway: number;
  probOver25: number;
  probBtts: number;
  projectedScore: string;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  confidence: number;
  analysis: string;
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
  keyFactors: string[];
  picks: ProPick[];
  valueBets: ProValueBet[];
}

export interface ProPick {
  market: string;
  pick: string;
  odds: number;
  probability: number;
  confidence: number;
  edge: number;
  verdict: "strong" | "moderate" | "risky";
}

export interface ProValueBet {
  market: string;
  selection: string;
  fairOdds: number;
  impliedProb: number;
  modelProb: number;
  ev: number;
  stake: string;
}

export function getFreeTierAnalysis(homeTeam: string, awayTeam: string): FreeTierAnalysis {
  const r = analyzeMatch(homeTeam, awayTeam);
  return {
    tier: "free",
    homeTeam,
    awayTeam,
    probHome: r.probHome,
    probDraw: r.probDraw,
    probAway: r.probAway,
    projectedScore: r.projectedScore,
    confidence: r.confidence,
    recommendation: r.recommendation,
    riskLevel: r.riskLevel,
    keyFactors: r.keyFactors.slice(0, 3),
    upgradeHint: "Upgrade to Pro for detailed picks, value bets & handicap analysis",
  };
}

export function getProTierAnalysis(homeTeam: string, awayTeam: string): ProTierAnalysis {
  const r = analyzeMatch(homeTeam, awayTeam);

  const picks: ProPick[] = [];

  const bestProb = Math.max(r.probHome, r.probAway, r.probDraw);
  const bestSelection = r.probHome >= r.probAway && r.probHome >= r.probDraw
    ? homeTeam
    : r.probAway >= r.probHome && r.probAway >= r.probDraw
      ? awayTeam
      : "Draw";
  const bestOdds = Math.round((1 / bestProb) * 100) / 100;

  picks.push({
    market: "1X2",
    pick: bestSelection,
    odds: bestOdds,
    probability: bestProb,
    confidence: r.confidence,
    edge: Math.round((bestProb - 1 / bestOdds) * 100) / 100,
    verdict: bestProb > 0.55 ? "strong" : bestProb > 0.4 ? "moderate" : "risky",
  });

  const handicapLine = r.probHome > r.probAway
    ? (r.probHome > 0.6 ? -1.5 : r.probHome > 0.5 ? -1 : -0.5)
    : (r.probAway > 0.6 ? 1.5 : r.probAway > 0.5 ? 1 : 0.5);
  const handicapTeam = r.probHome > r.probAway ? homeTeam : awayTeam;
  const handicapProb = r.probHome > r.probAway ? r.probHome * 0.85 : r.probAway * 0.85;

  picks.push({
    market: "Asian Handicap",
    pick: `${handicapTeam} ${handicapLine > 0 ? "+" : ""}${handicapLine}`,
    odds: 1.90,
    probability: handicapProb,
    confidence: r.confidence * 0.9,
    edge: Math.round((handicapProb - 0.526) * 100) / 100,
    verdict: handicapProb > 0.55 ? "strong" : handicapProb > 0.45 ? "moderate" : "risky",
  });

  const totalGoals = r.projectedHomeGoals + r.projectedAwayGoals;
  const ouLine = totalGoals > 2.8 ? 3.5 : 2.5;
  const ouPick = totalGoals > ouLine ? `Over ${ouLine}` : `Under ${ouLine}`;
  const ouProb = totalGoals > ouLine ? r.probOver25 : 1 - r.probOver25;

  picks.push({
    market: "Over/Under",
    pick: ouPick,
    odds: 1.85,
    probability: ouProb,
    confidence: r.confidence * 0.85,
    edge: Math.round((ouProb - 0.54) * 100) / 100,
    verdict: ouProb > 0.55 ? "strong" : ouProb > 0.45 ? "moderate" : "risky",
  });

  picks.push({
    market: "BTTS",
    pick: r.probBtts > 0.5 ? "Yes" : "No",
    odds: r.probBtts > 0.5 ? Math.round((1 / r.probBtts) * 100) / 100 : Math.round((1 / (1 - r.probBtts)) * 100) / 100,
    probability: r.probBtts > 0.5 ? r.probBtts : 1 - r.probBtts,
    confidence: r.confidence * 0.8,
    edge: Math.round(((r.probBtts > 0.5 ? r.probBtts : 1 - r.probBtts) - 0.5) * 100) / 100,
    verdict: Math.abs(r.probBtts - 0.5) > 0.1 ? "moderate" : "risky",
  });

  const valueBets: ProValueBet[] = picks
    .filter(p => p.edge > 0.03)
    .map(p => ({
      market: p.market,
      selection: p.pick,
      fairOdds: Math.round((1 / p.probability) * 100) / 100,
      impliedProb: Math.round((1 / p.odds) * 1000) / 1000,
      modelProb: p.probability,
      ev: p.edge,
      stake: p.edge > 0.1 ? "3-5%" : p.edge > 0.05 ? "2-3%" : "1-2%",
    }));

  return {
    tier: "pro",
    homeTeam,
    awayTeam,
    probHome: r.probHome,
    probDraw: r.probDraw,
    probAway: r.probAway,
    probOver25: r.probOver25,
    probBtts: r.probBtts,
    projectedScore: r.projectedScore,
    projectedHomeGoals: r.projectedHomeGoals,
    projectedAwayGoals: r.projectedAwayGoals,
    confidence: r.confidence,
    analysis: r.analysis,
    recommendation: r.recommendation,
    riskLevel: r.riskLevel,
    keyFactors: r.keyFactors,
    picks,
    valueBets,
  };
}
