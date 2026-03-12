import { Router } from "express";

const router = Router();

const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUES: Record<string, { id: string; name: string; country: string; badge: string; season: string }> = {
  epl: { id: "4328", name: "English Premier League", country: "England", badge: "https://www.thesportsdb.com/images/media/league/badge/i6o0kh1549879062.png", season: "2024-2025" },
  laliga: { id: "4335", name: "La Liga", country: "Spain", badge: "https://www.thesportsdb.com/images/media/league/badge/7onmyv1534768460.png", season: "2024-2025" },
  bundesliga: { id: "4331", name: "Bundesliga", country: "Germany", badge: "https://www.thesportsdb.com/images/media/league/badge/0j55yv1534764799.png", season: "2024-2025" },
  seriea: { id: "4332", name: "Serie A", country: "Italy", badge: "https://www.thesportsdb.com/images/media/league/badge/ocy2fe1566216901.png", season: "2024-2025" },
  ligue1: { id: "4334", name: "Ligue 1", country: "France", badge: "https://www.thesportsdb.com/images/media/league/badge/8f5jmf1516458074.png", season: "2024-2025" },
  ucl: { id: "4480", name: "UEFA Champions League", country: "Europe", badge: "https://www.thesportsdb.com/images/media/league/badge/dqo6r91549878326.png", season: "2024-2025" },
};

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

async function fetchWithCache(url: string): Promise<any> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(url, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

function formatEvent(e: any, leagueName: string, leagueKey: string, status: string) {
  const homeScore = e.intHomeScore !== null && e.intHomeScore !== "" ? parseInt(e.intHomeScore) : null;
  const awayScore = e.intAwayScore !== null && e.intAwayScore !== "" ? parseInt(e.intAwayScore) : null;
  return {
    id: e.idEvent,
    home_team: e.strHomeTeam,
    away_team: e.strAwayTeam,
    home_score: homeScore,
    away_score: awayScore,
    date: e.dateEvent,
    time: e.strTime || e.strTimestamp?.split("T")[1]?.slice(0, 5) || "TBD",
    venue: e.strVenue,
    league: leagueName,
    league_key: leagueKey,
    status,
    round: e.intRound,
    home_badge: e.strHomeTeamBadge || null,
    away_badge: e.strAwayTeamBadge || null,
    thumb: e.strThumb || null,
    timestamp: e.strTimestamp || `${e.dateEvent}T${e.strTime || "00:00:00"}`,
  };
}

router.get("/leagues", (_req, res) => {
  res.json(
    Object.entries(LEAGUES).map(([key, val]) => ({
      key,
      ...val,
    }))
  );
});

router.get("/live-matches", async (req, res) => {
  const league = (req.query.league as string) || "epl";
  const leagueInfo = LEAGUES[league];
  if (!leagueInfo) {
    return res.status(400).json({ error: "Unknown league" });
  }

  const [nextData, pastData] = await Promise.all([
    fetchWithCache(`${SPORTS_DB_BASE}/eventsnextleague.php?id=${leagueInfo.id}`),
    fetchWithCache(`${SPORTS_DB_BASE}/eventspastleague.php?id=${leagueInfo.id}`),
  ]);

  const upcoming = (nextData?.events || []).map((e: any) => formatEvent(e, leagueInfo.name, league, "scheduled"));
  const results = (pastData?.events || []).map((e: any) => formatEvent(e, leagueInfo.name, league, "finished"));

  res.json({ league: leagueInfo, upcoming, results });
});

router.get("/all-matches", async (req, res) => {
  const leagueKeys = Object.keys(LEAGUES);

  const allPromises = leagueKeys.map(async (key) => {
    const league = LEAGUES[key];
    const [nextData, pastData] = await Promise.all([
      fetchWithCache(`${SPORTS_DB_BASE}/eventsnextleague.php?id=${league.id}`),
      fetchWithCache(`${SPORTS_DB_BASE}/eventspastleague.php?id=${league.id}`),
    ]);

    const upcoming = (nextData?.events || []).map((e: any) => formatEvent(e, league.name, key, "scheduled"));
    const results = (pastData?.events || []).map((e: any) => formatEvent(e, league.name, key, "finished"));

    return { key, upcoming, results };
  });

  const allData = await Promise.all(allPromises);

  const upcoming: any[] = [];
  const results: any[] = [];

  for (const d of allData) {
    upcoming.push(...d.upcoming);
    results.push(...d.results);
  }

  upcoming.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    leagues: Object.entries(LEAGUES).map(([key, val]) => ({ key, ...val })),
    upcoming: upcoming.slice(0, 50),
    results: results.slice(0, 50),
  });
});

router.get("/standings", async (req, res) => {
  const league = (req.query.league as string) || "epl";
  const leagueInfo = LEAGUES[league];
  if (!leagueInfo) {
    return res.status(400).json({ error: "Unknown league" });
  }

  const data = await fetchWithCache(
    `${SPORTS_DB_BASE}/lookuptable.php?l=${leagueInfo.id}&s=${leagueInfo.season}`
  );

  if (!data?.table) {
    return res.json({ league: leagueInfo, standings: [] });
  }

  const standings = data.table.map((t: any) => ({
    rank: parseInt(t.intRank) || 0,
    team: t.strTeam,
    badge: t.strBadge || null,
    played: parseInt(t.intPlayed) || 0,
    win: parseInt(t.intWin) || 0,
    draw: parseInt(t.intDraw) || 0,
    loss: parseInt(t.intLoss) || 0,
    goals_for: parseInt(t.intGoalsFor) || 0,
    goals_against: parseInt(t.intGoalsAgainst) || 0,
    goal_diff: parseInt(t.intGoalDifference) || 0,
    points: parseInt(t.intPoints) || 0,
    form: t.strForm || "",
  }));

  res.json({ league: leagueInfo, standings });
});

router.get("/team/:name", async (req, res) => {
  const data = await fetchWithCache(
    `${SPORTS_DB_BASE}/searchteams.php?t=${encodeURIComponent(req.params.name)}`
  );
  if (!data?.teams?.length) {
    return res.status(404).json({ error: "Team not found" });
  }
  const t = data.teams[0];
  res.json({
    id: t.idTeam,
    name: t.strTeam,
    badge: t.strBadge,
    stadium: t.strStadium,
    country: t.strCountry,
    league: t.strLeague,
    description: t.strDescriptionEN?.slice(0, 300),
    formed: t.intFormedYear,
  });
});

export default router;
