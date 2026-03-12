import { Router } from "express";

const router = Router();

const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUES: Record<string, { id: string; name: string; country: string }> = {
  epl: { id: "4328", name: "English Premier League", country: "England" },
  laliga: { id: "4335", name: "La Liga", country: "Spain" },
  bundesliga: { id: "4331", name: "Bundesliga", country: "Germany" },
  seriea: { id: "4332", name: "Serie A", country: "Italy" },
  ligue1: { id: "4334", name: "Ligue 1", country: "France" },
  ucl: { id: "4480", name: "UEFA Champions League", country: "Europe" },
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

  const upcoming = (nextData?.events || []).map((e: any) => ({
    id: e.idEvent,
    home_team: e.strHomeTeam,
    away_team: e.strAwayTeam,
    date: e.dateEvent,
    time: e.strTime,
    venue: e.strVenue,
    league: leagueInfo.name,
    status: "scheduled",
    round: e.intRound,
    home_badge: e.strHomeTeamBadge,
    away_badge: e.strAwayTeamBadge,
  }));

  const results = (pastData?.events || []).map((e: any) => ({
    id: e.idEvent,
    home_team: e.strHomeTeam,
    away_team: e.strAwayTeam,
    home_score: parseInt(e.intHomeScore) || 0,
    away_score: parseInt(e.intAwayScore) || 0,
    date: e.dateEvent,
    venue: e.strVenue,
    league: leagueInfo.name,
    status: "finished",
    round: e.intRound,
    home_badge: e.strHomeTeamBadge,
    away_badge: e.strAwayTeamBadge,
  }));

  res.json({ league: leagueInfo, upcoming, results });
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
