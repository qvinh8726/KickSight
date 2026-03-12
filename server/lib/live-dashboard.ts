import { analyzeMatch } from "./analysis";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const LEAGUES: Record<string, { espnSlug: string; name: string }> = {
  epl: { espnSlug: "eng.1", name: "English Premier League" },
  laliga: { espnSlug: "esp.1", name: "La Liga" },
  bundesliga: { espnSlug: "ger.1", name: "Bundesliga" },
  seriea: { espnSlug: "ita.1", name: "Serie A" },
  ligue1: { espnSlug: "fra.1", name: "Ligue 1" },
  ucl: { espnSlug: "uefa.champions", name: "UEFA Champions League" },
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchESPN(url: string): Promise<any> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseEvent(e: any, leagueKey: string, leagueName: string): any | null {
  const comp = e.competitions?.[0];
  if (!comp) return null;
  const competitors = comp.competitors || [];
  const home = competitors.find((c: any) => c.homeAway === "home");
  const away = competitors.find((c: any) => c.homeAway === "away");
  if (!home || !away) return null;

  const dateStr = comp.date || e.date || "";
  const dateObj = new Date(dateStr);
  const isValid = !isNaN(dateObj.getTime());

  return {
    id: `${leagueKey}_${e.id}`,
    espn_id: e.id,
    home_team: home.team?.displayName || "TBD",
    away_team: away.team?.displayName || "TBD",
    home_badge: home.team?.logo || null,
    away_badge: away.team?.logo || null,
    date: isValid ? dateObj.toISOString().slice(0, 10) : "",
    time: isValid ? dateObj.toISOString().slice(11, 16) : "",
    league: leagueName,
    league_key: leagueKey,
    venue: comp.venue?.fullName || null,
    status: "scheduled",
    home_form: home.form || "",
    away_form: away.form || "",
    timestamp: dateStr,
  };
}

export async function buildLiveDashboard(): Promise<any | null> {
  try {
    const now = new Date();
    const future14 = new Date(now);
    future14.setDate(future14.getDate() + 14);
    const dateRange = `${formatDate(now)}-${formatDate(future14)}`;

    const leagueKeys = Object.keys(LEAGUES);
    const allPromises = leagueKeys.map(async (key) => {
      const league = LEAGUES[key];
      const url = `${ESPN_BASE}/${league.espnSlug}/scoreboard?dates=${dateRange}`;
      const data = await fetchESPN(url);
      if (!data?.events) return [];
      return data.events
        .map((e: any) => parseEvent(e, key, league.name))
        .filter(Boolean);
    });

    const allData = await Promise.all(allPromises);
    const upcoming: any[] = [];
    for (const matches of allData) {
      for (const m of matches) {
        if (m.status === "scheduled") upcoming.push(m);
      }
    }
    upcoming.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const selected = upcoming.slice(0, 15);
    if (selected.length === 0) return null;

    let totalValueBets = 0;
    let totalConfidence = 0;

    const matches = selected.map((m, idx) => {
      const analysis = analyzeMatch(m.home_team, m.away_team);

      const hasValue = analysis.confidence > 0.5 && Math.max(analysis.probHome, analysis.probAway) > 0.5;
      const valueBets: any[] = [];
      if (hasValue) {
        const bestProb = Math.max(analysis.probHome, analysis.probAway);
        const selection = analysis.probHome > analysis.probAway ? "home" : "away";
        const fairOdds = Math.round((1 / bestProb) * 100) / 100;
        valueBets.push({
          market: "1x2",
          selection,
          ev: Math.round((bestProb - 0.45) * 100) / 100,
          kelly_fraction: Math.round((bestProb - 0.45) * 0.25 * 100) / 100,
          suggested_stake: Math.round((bestProb - 0.45) * 0.25 * 1000 * 100) / 100,
          fair_odds: fairOdds,
        });
        totalValueBets++;
      }
      totalConfidence += analysis.confidence;

      return {
        match: {
          id: idx + 1,
          home_team: m.home_team,
          away_team: m.away_team,
          match_date: m.date,
          venue: m.venue,
          competition: m.league,
          competition_stage: null,
          is_knockout: false,
          is_neutral_venue: false,
          home_goals: null,
          away_goals: null,
          status: "scheduled",
        },
        prediction: {
          match_id: idx + 1,
          prob_home: analysis.probHome,
          prob_draw: analysis.probDraw,
          prob_away: analysis.probAway,
          prob_over_25: analysis.probOver25,
          prob_under_25: 1 - analysis.probOver25,
          prob_btts_yes: analysis.probBtts,
          prob_btts_no: 1 - analysis.probBtts,
          projected_home_goals: analysis.projectedHomeGoals,
          projected_away_goals: analysis.projectedAwayGoals,
          projected_scoreline: analysis.projectedScore,
          asian_handicap_lean: analysis.probHome > analysis.probAway ? "home" : "away",
          confidence: analysis.confidence,
        },
        odds: [{
          bookmaker: "KickSight AI",
          home: Math.round((1 / analysis.probHome) * 100) / 100,
          draw: Math.round((1 / analysis.probDraw) * 100) / 100,
          away: Math.round((1 / analysis.probAway) * 100) / 100,
        }],
        value_bets: valueBets,
        fair_odds_home: Math.round((1 / analysis.probHome) * 100) / 100,
        fair_odds_draw: Math.round((1 / analysis.probDraw) * 100) / 100,
        fair_odds_away: Math.round((1 / analysis.probAway) * 100) / 100,
      };
    });

    const avgConfidence = matches.length > 0 ? totalConfidence / matches.length : 0;

    return {
      matches,
      stats: {
        upcoming_matches: matches.length,
        value_bets: totalValueBets,
        avg_confidence: avgConfidence,
        model: "KickSight Poisson AI",
      },
    };
  } catch (err) {
    console.error("[LIVE-DASHBOARD] Error:", err);
    return null;
  }
}
