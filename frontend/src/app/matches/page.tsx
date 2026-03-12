"use client";

import { useEffect, useState } from "react";
import Filters from "@/components/Filters";
import type { Match } from "@/lib/api";
import { api } from "@/lib/api";

const DEMO: Match[] = [
  {
    id: 1, home_team: "United States", away_team: "Brazil",
    match_date: "2026-06-15", competition: "FIFA World Cup",
    competition_stage: "GROUP_STAGE", is_knockout: false,
    is_neutral_venue: false, home_goals: null, away_goals: null, status: "scheduled",
  },
  {
    id: 2, home_team: "France", away_team: "Argentina",
    match_date: "2026-06-16", competition: "FIFA World Cup",
    competition_stage: "GROUP_STAGE", is_knockout: false,
    is_neutral_venue: true, home_goals: null, away_goals: null, status: "scheduled",
  },
  {
    id: 10, home_team: "Brazil", away_team: "Germany",
    match_date: "2024-11-19", competition: "International Friendly",
    competition_stage: null, is_knockout: false,
    is_neutral_venue: false, home_goals: 3, away_goals: 2, status: "finished",
  },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>(DEMO);
  const [loading, setLoading] = useState(false);

  const loadMatches = async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const data = await api.getMatches(filters);
      if (data.length > 0) setMatches(data);
    } catch {
      // Keep demo data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">All Matches</h2>
        <p className="mt-1 text-sm text-gray-400">Browse match history and upcoming fixtures</p>
      </div>

      <Filters
        onFilter={(f) => {
          const params: Record<string, string> = {};
          if (f.competition) params.competition = f.competition;
          if (f.dateFrom) params.from_date = f.dateFrom;
          if (f.dateTo) params.to_date = f.dateTo;
          loadMatches(params);
        }}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-green-500" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Home</th>
                <th className="pb-3 pr-4 text-center">Score</th>
                <th className="pb-3 pr-4">Away</th>
                <th className="pb-3 pr-4">Competition</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 pr-4 text-xs text-gray-400">{m.match_date}</td>
                  <td className="py-3 pr-4 font-medium text-white">{m.home_team}</td>
                  <td className="py-3 pr-4 text-center font-mono font-bold text-white">
                    {m.status === "finished"
                      ? `${m.home_goals} - ${m.away_goals}`
                      : "-"}
                  </td>
                  <td className="py-3 pr-4 font-medium text-white">{m.away_team}</td>
                  <td className="py-3 pr-4 text-xs text-gray-400">{m.competition}</td>
                  <td className="py-3">
                    <span
                      className={
                        m.status === "finished"
                          ? "badge-green"
                          : m.status === "scheduled"
                          ? "badge-blue"
                          : "badge-yellow"
                      }
                    >
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
