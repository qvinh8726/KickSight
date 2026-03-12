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

  const homeStats: Record<string, string> = {};
  for (const s of home.statistics || []) homeStats[s.name] = s.displayValue;
  const awayStats: Record<string, string> = {};
  for (const s of away.statistics || []) awayStats[s.name] = s.displayValue;

  const broadcasts = (comp.broadcasts || []).flatMap((b: any) => b.names || []);

  return {
    id: `${leagueKey}_${e.id}`,
    espn_id: e.id,
    home_team: home.team?.displayName || home.team?.name || "TBD",
    away_team: away.team?.displayName || away.team?.name || "TBD",
    home_short: home.team?.shortDisplayName || home.team?.abbreviation || null,
    away_short: away.team?.shortDisplayName || away.team?.abbreviation || null,
    home_score: homeScore,
    away_score: awayScore,
    date: dateFormatted,
    time: timeFormatted,
    venue: comp.venue?.fullName || null,
    venue_city: comp.venue?.address?.city || null,
    league: leagueName,
    league_key: leagueKey,
    status,
    round: null,
    home_badge: home.team?.logo || null,
    away_badge: away.team?.logo || null,
    home_color: home.team?.color || null,
    away_color: away.team?.color || null,
    thumb: null,
    timestamp: dateStr,
    status_detail: comp.status?.type?.detail || comp.status?.type?.shortDetail || null,
    home_form: home.form || null,
    away_form: away.form || null,
    home_record: home.records?.[0]?.summary || null,
    away_record: away.records?.[0]?.summary || null,
    attendance: comp.attendance || null,
    broadcasts,
    stats: (Object.keys(homeStats).length > 0 || Object.keys(awayStats).length > 0) ? {
      home: homeStats,
      away: awayStats,
    } : null,
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

router.get("/match-detail/:leagueKey/:espnId", async (req, res) => {
  const { leagueKey, espnId } = req.params;
  const leagueInfo = LEAGUES[leagueKey];
  if (!leagueInfo) {
    return res.status(400).json({ error: "Unknown league" });
  }

  const url = `${ESPN_BASE}/${leagueInfo.espnSlug}/summary?event=${espnId}`;
  const data = await fetchWithCache(url);
  if (!data) {
    return res.status(404).json({ error: "Match not found" });
  }

  const header = data.header?.competitions?.[0] || {};
  const competitors = header.competitors || [];
  const home = competitors.find((c: any) => c.homeAway === "home");
  const away = competitors.find((c: any) => c.homeAway === "away");

  const boxTeams = data.boxscore?.teams || [];
  const homeBox = boxTeams.find((t: any) => t.team?.displayName === home?.team?.displayName) || boxTeams[0];
  const awayBox = boxTeams.find((t: any) => t.team?.displayName === away?.team?.displayName) || boxTeams[1];

  const parseStats = (team: any) => {
    if (!team?.statistics) return {};
    const s: Record<string, string> = {};
    for (const stat of team.statistics) {
      s[stat.label || stat.name] = stat.displayValue;
    }
    return s;
  };

  const keyEvents = (data.keyEvents || []).filter((ke: any) => {
    const type = ke.type?.text || "";
    return ["Goal", "Yellow Card", "Red Card", "Penalty", "Substitution", "Own Goal"].some(t => type.includes(t));
  }).map((ke: any) => ({
    clock: ke.clock?.displayValue || "",
    type: ke.type?.text || "",
    text: ke.text || "",
    team: ke.team?.displayName || null,
  }));

  const h2h = (data.headToHeadGames || []).slice(0, 5).map((g: any) => {
    const c = g.competitions?.[0];
    if (!c) return null;
    const teams = c.competitors || [];
    return {
      date: c.date?.slice(0, 10) || "",
      home: teams[0]?.team?.displayName || "?",
      away: teams[1]?.team?.displayName || "?",
      home_score: teams[0]?.score || "0",
      away_score: teams[1]?.score || "0",
    };
  }).filter(Boolean);

  const gameInfo = data.gameInfo || {};
  const officials = (gameInfo.officials || []).map((o: any) => o.displayName).filter(Boolean);

  res.json({
    home_team: home?.team?.displayName || "TBD",
    away_team: away?.team?.displayName || "TBD",
    home_badge: home?.team?.logo || null,
    away_badge: away?.team?.logo || null,
    home_score: home?.score || null,
    away_score: away?.score || null,
    home_form: data.boxscore?.form?.[0]?.displayValue || home?.form || null,
    away_form: data.boxscore?.form?.[1]?.displayValue || away?.form || null,
    home_record: home?.record || null,
    away_record: away?.record || null,
    venue: gameInfo.venue?.fullName || null,
    venue_city: gameInfo.venue?.address?.city || null,
    venue_country: gameInfo.venue?.address?.country || null,
    attendance: gameInfo.attendance || null,
    referee: officials[0] || null,
    officials,
    league: leagueInfo.name,
    league_key: leagueKey,
    home_stats: parseStats(homeBox),
    away_stats: parseStats(awayBox),
    key_events: keyEvents,
    head_to_head: h2h,
    broadcasts: (data.broadcasts || []).flatMap((b: any) => b.market ? [`${b.station} (${b.market})`] : [b.station]).filter(Boolean),
  });
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
