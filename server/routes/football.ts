import { Router } from "express";

const router = Router();

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const LEAGUES: Record<string, { espnSlug: string; name: string; country: string }> = {
  epl: { espnSlug: "eng.1", name: "English Premier League", country: "England" },
  laliga: { espnSlug: "esp.1", name: "La Liga", country: "Spain" },
  bundesliga: { espnSlug: "ger.1", name: "Bundesliga", country: "Germany" },
  seriea: { espnSlug: "ita.1", name: "Serie A", country: "Italy" },
  ligue1: { espnSlug: "fra.1", name: "Ligue 1", country: "France" },
  ucl: { espnSlug: "uefa.champions", name: "UEFA Champions League", country: "Europe" },
};

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

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

function formatDateYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function parseESPNEvent(e: any, leagueKey: string, leagueName: string) {
  const comp = e.competitions?.[0];
  if (!comp) return null;

  const competitors = comp.competitors || [];
  const home = competitors.find((c: any) => c.homeAway === "home");
  const away = competitors.find((c: any) => c.homeAway === "away");
  if (!home || !away) return null;

  const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";
  const isFinished = statusType === "STATUS_FULL_TIME" || statusType === "STATUS_FINAL_AET" || statusType === "STATUS_FINAL_PEN";
  const isLive = statusType === "STATUS_IN_PROGRESS" || statusType === "STATUS_HALFTIME" || statusType === "STATUS_SECOND_HALF" || statusType === "STATUS_FIRST_HALF";

  const homeScore = isFinished || isLive ? parseInt(home.score) || 0 : null;
  const awayScore = isFinished || isLive ? parseInt(away.score) || 0 : null;

  let status = "scheduled";
  if (isFinished) status = "finished";
  else if (isLive) status = "live";

  const dateStr = comp.date || e.date || "";
  const dateObj = new Date(dateStr);
  const dateFormatted = dateObj.toISOString().slice(0, 10);
  const timeFormatted = dateObj.toISOString().slice(11, 16);

  return {
    id: `${leagueKey}_${e.id}`,
    home_team: home.team?.displayName || home.team?.name || "TBD",
    away_team: away.team?.displayName || away.team?.name || "TBD",
    home_score: homeScore,
    away_score: awayScore,
    date: dateFormatted,
    time: timeFormatted,
    venue: comp.venue?.fullName || null,
    league: leagueName,
    league_key: leagueKey,
    status,
    round: null,
    home_badge: home.team?.logo || null,
    away_badge: away.team?.logo || null,
    thumb: null,
    timestamp: dateStr,
    status_detail: comp.status?.type?.detail || comp.status?.type?.shortDetail || null,
  };
}

async function fetchLeagueMatches(leagueKey: string, dateRange: string): Promise<any[]> {
  const league = LEAGUES[leagueKey];
  if (!league) return [];

  const url = `${ESPN_BASE}/${league.espnSlug}/scoreboard?dates=${dateRange}`;
  const data = await fetchWithCache(url);
  if (!data?.events) return [];

  const matches: any[] = [];
  for (const e of data.events) {
    const parsed = parseESPNEvent(e, leagueKey, league.name);
    if (parsed) matches.push(parsed);
  }
  return matches;
}

router.get("/leagues", (_req, res) => {
  res.json(
    Object.entries(LEAGUES).map(([key, val]) => ({
      key,
      name: val.name,
      country: val.country,
    }))
  );
});

router.get("/live-matches", async (req, res) => {
  const league = (req.query.league as string) || "epl";
  const leagueInfo = LEAGUES[league];
  if (!leagueInfo) {
    return res.status(400).json({ error: "Unknown league" });
  }

  const now = new Date();
  const past14 = new Date(now);
  past14.setDate(past14.getDate() - 14);
  const future14 = new Date(now);
  future14.setDate(future14.getDate() + 14);
  const dateRange = `${formatDateYYYYMMDD(past14)}-${formatDateYYYYMMDD(future14)}`;

  const matches = await fetchLeagueMatches(league, dateRange);
  const upcoming = matches.filter(m => m.status === "scheduled" || m.status === "live");
  const results = matches.filter(m => m.status === "finished");

  upcoming.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ league: leagueInfo, upcoming, results });
});

router.get("/all-matches", async (_req, res) => {
  const now = new Date();
  const past14 = new Date(now);
  past14.setDate(past14.getDate() - 14);
  const future14 = new Date(now);
  future14.setDate(future14.getDate() + 14);
  const dateRange = `${formatDateYYYYMMDD(past14)}-${formatDateYYYYMMDD(future14)}`;

  const leagueKeys = Object.keys(LEAGUES);
  const allPromises = leagueKeys.map((key) => fetchLeagueMatches(key, dateRange));
  const allData = await Promise.all(allPromises);

  const upcoming: any[] = [];
  const results: any[] = [];

  for (const matches of allData) {
    for (const m of matches) {
      if (m.status === "finished") results.push(m);
      else upcoming.push(m);
    }
  }

  upcoming.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    leagues: Object.entries(LEAGUES).map(([key, val]) => ({ key, name: val.name, country: val.country })),
    upcoming: upcoming.slice(0, 80),
    results: results.slice(0, 80),
  });
});

router.get("/standings", async (req, res) => {
  const league = (req.query.league as string) || "epl";
  const leagueInfo = LEAGUES[league];
  if (!leagueInfo) {
    return res.status(400).json({ error: "Unknown league" });
  }

  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueInfo.espnSlug}/standings`;
  const data = await fetchWithCache(url);

  if (!data?.children?.length) {
    return res.json({ league: leagueInfo, standings: [] });
  }

  const entries = data.children[0]?.standings?.entries || [];

  const standings = entries.map((entry: any) => {
    const team = entry.team || {};
    const statsMap: Record<string, number> = {};
    for (const s of entry.stats || []) {
      statsMap[s.name] = parseFloat(s.value) || 0;
    }

    return {
      rank: statsMap["rank"] || 0,
      team: team.displayName || team.name || "Unknown",
      badge: team.logos?.[0]?.href || team.logo || null,
      played: statsMap["gamesPlayed"] || 0,
      win: statsMap["wins"] || 0,
      draw: statsMap["ties"] || 0,
      loss: statsMap["losses"] || 0,
      goals_for: statsMap["pointsFor"] || 0,
      goals_against: statsMap["pointsAgainst"] || 0,
      goal_diff: statsMap["pointDifferential"] || 0,
      points: statsMap["points"] || 0,
      form: "",
    };
  });

  standings.sort((a: any, b: any) => a.rank - b.rank);

  res.json({ league: leagueInfo, standings });
});

router.get("/team/:name", async (req, res) => {
  const teamName = req.params.name;
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams?limit=100`;
  const data = await fetchWithCache(url);

  if (!data?.sports?.[0]?.leagues?.[0]?.teams) {
    return res.status(404).json({ error: "Team not found" });
  }

  const teams = data.sports[0].leagues[0].teams;
  const found = teams.find((t: any) =>
    t.team?.displayName?.toLowerCase().includes(teamName.toLowerCase()) ||
    t.team?.shortDisplayName?.toLowerCase().includes(teamName.toLowerCase())
  );

  if (!found) {
    return res.status(404).json({ error: "Team not found" });
  }

  const t = found.team;
  res.json({
    id: t.id,
    name: t.displayName,
    badge: t.logos?.[0]?.href || t.logo || null,
    stadium: t.venue?.fullName || null,
    country: t.location || null,
    league: "English Premier League",
    description: null,
    formed: null,
  });
});

export default router;
