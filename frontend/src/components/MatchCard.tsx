"use client";

import ProbabilityBar from "./ProbabilityBar";
import type { DashboardMatch } from "@/lib/api";
import { evDisplay, confidenceColor, riskColor, pct } from "@/lib/utils";

export default function MatchCard({ data }: { data: DashboardMatch }) {
  const { match, prediction, odds, fair_odds_home, fair_odds_draw, fair_odds_away, value_bets } =
    data;

  const bestOdds =
    odds.length > 0
      ? odds.reduce(
          (best, o) => ({
            home: Math.max(best.home, o.home_current ?? 0),
            draw: Math.max(best.draw, o.draw_current ?? 0),
            away: Math.max(best.away, o.away_current ?? 0),
          }),
          { home: 0, draw: 0, away: 0 }
        )
      : null;

  return (
    <div className="card group hover:border-gray-700 transition-colors">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
            {match.competition}
            {match.competition_stage ? ` - ${match.competition_stage}` : ""}
          </p>
          <p className="text-[11px] text-gray-600">{match.match_date}</p>
        </div>
        <div className="flex gap-1.5">
          {match.is_knockout && <span className="badge-red">KO</span>}
          {match.is_neutral_venue && <span className="badge-blue">Neutral</span>}
          {value_bets.length > 0 && (
            <span className="badge-green">
              {value_bets.length} value {value_bets.length === 1 ? "bet" : "bets"}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1 text-right">
          <p className="text-base font-semibold text-white">{match.home_team}</p>
        </div>
        <div className="mx-4 flex flex-col items-center">
          {match.status === "finished" ? (
            <span className="text-2xl font-bold text-white">
              {match.home_goals} - {match.away_goals}
            </span>
          ) : (
            <span className="text-sm font-medium text-gray-500">vs</span>
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-base font-semibold text-white">{match.away_team}</p>
        </div>
      </div>

      {prediction && (
        <>
          <ProbabilityBar
            probHome={prediction.prob_home}
            probDraw={prediction.prob_draw}
            probAway={prediction.prob_away}
            homeLabel={match.home_team.slice(0, 3).toUpperCase()}
            awayLabel={match.away_team.slice(0, 3).toUpperCase()}
          />

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="stat-label">Projected</p>
              <p className="text-sm font-bold text-white">{prediction.projected_scoreline}</p>
            </div>
            <div>
              <p className="stat-label">O/U 2.5</p>
              <p className="text-sm font-bold text-white">
                {prediction.prob_over_25 != null ? pct(prediction.prob_over_25) : "-"} /{" "}
                {prediction.prob_under_25 != null ? pct(prediction.prob_under_25) : "-"}
              </p>
            </div>
            <div>
              <p className="stat-label">Confidence</p>
              <p
                className={`text-sm font-bold ${confidenceColor(prediction.confidence ?? 0)}`}
              >
                {prediction.confidence != null ? pct(prediction.confidence) : "-"}
              </p>
            </div>
          </div>
        </>
      )}

      {(bestOdds || fair_odds_home) && (
        <div className="mt-4 rounded-lg bg-gray-900/50 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Odds Comparison
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-gray-500">Bookmaker</p>
              <p className="font-mono font-bold text-white">
                {bestOdds?.home?.toFixed(2) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Bookmaker</p>
              <p className="font-mono font-bold text-white">
                {bestOdds?.draw?.toFixed(2) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Bookmaker</p>
              <p className="font-mono font-bold text-white">
                {bestOdds?.away?.toFixed(2) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Fair</p>
              <p className="font-mono text-green-400">
                {fair_odds_home?.toFixed(2) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Fair</p>
              <p className="font-mono text-green-400">
                {fair_odds_draw?.toFixed(2) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Fair</p>
              <p className="font-mono text-green-400">
                {fair_odds_away?.toFixed(2) ?? "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {value_bets.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-green-500">
            Recommended Bets
          </p>
          {value_bets.map((vb, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-green-500/5 px-3 py-2 border border-green-500/20"
            >
              <div>
                <span className="text-xs font-semibold text-white uppercase">
                  {vb.market} {vb.selection}
                </span>
                <span className="ml-2 text-[11px] text-gray-400">
                  @ {vb.bookmaker_odds.toFixed(2)} (fair {vb.fair_odds.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400 font-bold">{evDisplay(vb.ev)} EV</span>
                <span className={riskColor(vb.risk_rating)}>{vb.risk_rating}</span>
                <span className="text-gray-400">${vb.suggested_stake.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
