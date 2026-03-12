"use client";

import type { ValueBet } from "@/lib/api";
import { evDisplay, pct, riskColor, confidenceColor } from "@/lib/utils";

export default function ValueBetsTable({ bets }: { bets: ValueBet[] }) {
  if (bets.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">No value bets above threshold</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <th className="pb-3 pr-4">Match</th>
            <th className="pb-3 pr-4">Market</th>
            <th className="pb-3 pr-4">Selection</th>
            <th className="pb-3 pr-4 text-right">Model Prob</th>
            <th className="pb-3 pr-4 text-right">Fair Odds</th>
            <th className="pb-3 pr-4 text-right">Bookie Odds</th>
            <th className="pb-3 pr-4 text-right">EV%</th>
            <th className="pb-3 pr-4 text-right">Confidence</th>
            <th className="pb-3 pr-4 text-right">Stake</th>
            <th className="pb-3 text-center">Risk</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet, i) => (
            <tr
              key={i}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              <td className="py-3 pr-4">
                <p className="font-medium text-white text-xs">
                  {bet.home_team} vs {bet.away_team}
                </p>
                <p className="text-[10px] text-gray-500">{bet.match_date}</p>
              </td>
              <td className="py-3 pr-4">
                <span className="badge-blue uppercase text-[10px]">{bet.market}</span>
              </td>
              <td className="py-3 pr-4 font-medium text-white uppercase text-xs">
                {bet.selection}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs">{pct(bet.model_prob)}</td>
              <td className="py-3 pr-4 text-right font-mono text-xs text-green-400">
                {bet.fair_odds.toFixed(2)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs text-white">
                {bet.bookmaker_odds.toFixed(2)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs font-bold text-green-400">
                {evDisplay(bet.ev)}
              </td>
              <td
                className={`py-3 pr-4 text-right font-mono text-xs ${confidenceColor(
                  bet.confidence
                )}`}
              >
                {pct(bet.confidence)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs text-white">
                ${bet.suggested_stake.toFixed(0)}
              </td>
              <td className={`py-3 text-center text-xs font-medium ${riskColor(bet.risk_rating)}`}>
                {bet.risk_rating}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
