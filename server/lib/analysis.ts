function poissonPmf(k: number, lambda: number): number {
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

function generateScoreMatrix(homeGoals: number, awayGoals: number, maxGoals = 6) {
  const matrix: number[][] = [];
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] = poissonPmf(h, homeGoals) * poissonPmf(a, awayGoals);
    }
  }
  return matrix;
}

export interface AnalysisResult {
  homeTeam: string;
  awayTeam: string;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  projectedScore: string;
  probHome: number;
  probDraw: number;
  probAway: number;
  probOver25: number;
  probBtts: number;
  confidence: number;
  analysis: string;
  keyFactors: string[];
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
}

const TEAM_RATINGS: Record<string, number> = {
  "Brazil": 92, "Argentina": 91, "France": 90, "England": 88,
  "Spain": 89, "Germany": 87, "Portugal": 88, "Netherlands": 86,
  "Italy": 85, "Belgium": 84, "Croatia": 83, "Uruguay": 82,
  "Colombia": 81, "United States": 78, "Mexico": 77, "Japan": 80,
  "South Korea": 79, "Australia": 75, "Canada": 76, "Morocco": 82,
  "Senegal": 80, "Nigeria": 79, "Ghana": 76, "Cameroon": 77,
  "Switzerland": 82, "Denmark": 83, "Poland": 79, "Sweden": 78,
  "Serbia": 80, "Ecuador": 78, "Wales": 76, "Tunisia": 77,
  "Iran": 76, "Saudi Arabia": 74, "Qatar": 73, "Costa Rica": 74,
};

function getTeamRating(team: string): number {
  return TEAM_RATINGS[team] ?? 75;
}

export function analyzeMatch(homeTeam: string, awayTeam: string): AnalysisResult {
  const homeRating = getTeamRating(homeTeam);
  const awayRating = getTeamRating(awayTeam);
  const homeAdvantage = 4;
  const adjustedHome = homeRating + homeAdvantage;
  const ratingDiff = adjustedHome - awayRating;

  const avgGoals = 2.6;
  const homeGoals = Math.max(0.4, avgGoals * 0.5 * (1 + ratingDiff / 100));
  const awayGoals = Math.max(0.4, avgGoals * 0.5 * (1 - ratingDiff / 100));

  const matrix = generateScoreMatrix(homeGoals, awayGoals);

  let probHome = 0, probDraw = 0, probAway = 0, probOver25 = 0, probBtts = 0;
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const p = matrix[h][a];
      if (h > a) probHome += p;
      else if (h === a) probDraw += p;
      else probAway += p;
      if (h + a > 2) probOver25 += p;
      if (h > 0 && a > 0) probBtts += p;
    }
  }

  const total = probHome + probDraw + probAway;
  probHome /= total;
  probDraw /= total;
  probAway /= total;

  let bestScore = [0, 0];
  let bestProb = 0;
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      if (matrix[h][a] > bestProb) {
        bestProb = matrix[h][a];
        bestScore = [h, a];
      }
    }
  }

  const confidence = Math.min(0.85, 0.35 + Math.abs(ratingDiff) / 80);

  const keyFactors: string[] = [];
  if (ratingDiff > 8) keyFactors.push(`${homeTeam} has a significant rating advantage (${homeRating} vs ${awayRating})`);
  else if (ratingDiff < -8) keyFactors.push(`${awayTeam} has a significant rating advantage (${awayRating} vs ${homeRating})`);
  else keyFactors.push("Teams are closely matched in overall quality");

  if (homeGoals > 1.5) keyFactors.push(`${homeTeam} expected to be offensive (${homeGoals.toFixed(1)} xG)`);
  if (awayGoals > 1.5) keyFactors.push(`${awayTeam} expected to be offensive (${awayGoals.toFixed(1)} xG)`);
  if (probOver25 > 0.6) keyFactors.push("High-scoring match expected");
  if (probBtts > 0.55) keyFactors.push("Both teams likely to score");
  keyFactors.push(`Home advantage factor applied (+${homeAdvantage} rating boost)`);

  let favorite = "";
  let favoriteProb = 0;
  if (probHome > probAway && probHome > probDraw) { favorite = homeTeam; favoriteProb = probHome; }
  else if (probAway > probHome && probAway > probDraw) { favorite = awayTeam; favoriteProb = probAway; }
  else { favorite = "Draw"; favoriteProb = probDraw; }

  let analysis = `Our Poisson-based model projects ${homeTeam} ${bestScore[0]} - ${bestScore[1]} ${awayTeam} as the most likely scoreline. `;
  if (Math.abs(ratingDiff) <= 5) {
    analysis += `This is an extremely tight contest with minimal separation between the sides. `;
  } else if (ratingDiff > 5) {
    analysis += `${homeTeam} holds the advantage both in quality and with home field. `;
  } else {
    analysis += `${awayTeam} is the stronger team but must overcome home disadvantage. `;
  }
  analysis += `Expected goals: ${homeTeam} ${homeGoals.toFixed(1)} - ${awayGoals.toFixed(1)} ${awayTeam}. `;
  if (probOver25 > 0.55) analysis += `The over 2.5 goals market looks attractive at ${(probOver25 * 100).toFixed(0)}% probability. `;
  if (probBtts > 0.55) analysis += `BTTS is favored at ${(probBtts * 100).toFixed(0)}%. `;

  let recommendation = "";
  let riskLevel: "low" | "medium" | "high" = "medium";
  if (favoriteProb > 0.55) {
    recommendation = `Back ${favorite} (${(favoriteProb * 100).toFixed(0)}% probability). Strong value if odds exceed ${(1 / favoriteProb).toFixed(2)}.`;
    riskLevel = "low";
  } else if (favoriteProb > 0.4) {
    recommendation = `Lean ${favorite} but consider draw/BTTS markets for better value.`;
    riskLevel = "medium";
  } else {
    recommendation = "Highly competitive match. Look for value in goal markets rather than match result.";
    riskLevel = "high";
  }

  return {
    homeTeam,
    awayTeam,
    projectedHomeGoals: Math.round(homeGoals * 10) / 10,
    projectedAwayGoals: Math.round(awayGoals * 10) / 10,
    projectedScore: `${bestScore[0]}-${bestScore[1]}`,
    probHome: Math.round(probHome * 1000) / 1000,
    probDraw: Math.round(probDraw * 1000) / 1000,
    probAway: Math.round(probAway * 1000) / 1000,
    probOver25: Math.round(probOver25 * 1000) / 1000,
    probBtts: Math.round(probBtts * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    analysis,
    keyFactors,
    recommendation,
    riskLevel,
  };
}
