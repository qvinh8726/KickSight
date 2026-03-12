"""LLM-powered match analysis report generator."""

from __future__ import annotations

import structlog
from openai import AsyncOpenAI

from backend.config import get_settings
from backend.prediction.ensemble import MatchPrediction
from backend.betting.value import ValueBet

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are a football betting analyst writing concise match previews.
Your analysis is data-driven, based on statistical models and probability calculations.
You never guarantee profits. You always present probabilities, edges, and risks honestly.
Write in a clear, professional tone. Be direct and avoid filler."""

MATCH_REPORT_TEMPLATE = """Generate a concise match analysis report for the following:

MATCH: {home_team} vs {away_team}
COMPETITION: {competition}
DATE: {match_date}

MODEL PREDICTIONS:
- Home Win: {prob_home:.1%} | Draw: {prob_draw:.1%} | Away Win: {prob_away:.1%}
- Over 2.5 Goals: {prob_over_25:.1%} | Under 2.5 Goals: {prob_under_25:.1%}
- BTTS Yes: {prob_btts_yes:.1%} | BTTS No: {prob_btts_no:.1%}
- Projected Score: {projected_scoreline}
- Model Confidence: {confidence:.0%}

ELO RATINGS:
- {home_team}: {home_elo:.0f} | {away_team}: {away_elo:.0f} | Diff: {elo_diff:+.0f}

RECENT FORM (last 5):
- {home_team}: {home_form}
- {away_team}: {away_form}

{value_bets_section}

{tournament_context}

Write the report with these sections:
1. Statistical Edge (2-3 sentences on where the model sees value)
2. Form & Context (2-3 sentences on recent performances)
3. Projected Score & Key Markets
4. Best Value Angle (the single best bet opportunity with fair odds vs market odds)
5. Confidence & Risks (1-2 sentences on model uncertainty and what could go wrong)

Keep the total report under 250 words. Be specific with numbers."""


class AnalysisWriter:
    """Generates match analysis reports using LLM after predictions are computed."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    async def generate_report(
        self,
        prediction: MatchPrediction,
        home_team: str,
        away_team: str,
        competition: str = "",
        match_date: str = "",
        home_elo: float = 1500,
        away_elo: float = 1500,
        home_form: str = "N/A",
        away_form: str = "N/A",
        value_bets: list[ValueBet] | None = None,
        tournament_context: str = "",
    ) -> str:
        value_section = self._format_value_bets(value_bets) if value_bets else "No value bets identified."

        prompt = MATCH_REPORT_TEMPLATE.format(
            home_team=home_team,
            away_team=away_team,
            competition=competition,
            match_date=match_date,
            prob_home=prediction.prob_home,
            prob_draw=prediction.prob_draw,
            prob_away=prediction.prob_away,
            prob_over_25=prediction.prob_over_25,
            prob_under_25=prediction.prob_under_25,
            prob_btts_yes=prediction.prob_btts_yes,
            prob_btts_no=prediction.prob_btts_no,
            projected_scoreline=prediction.projected_scoreline,
            confidence=prediction.confidence,
            home_elo=home_elo,
            away_elo=away_elo,
            elo_diff=home_elo - away_elo,
            home_form=home_form,
            away_form=away_form,
            value_bets_section=value_section,
            tournament_context=tournament_context,
        )

        if not self.client:
            return self._generate_fallback(prediction, home_team, away_team, value_bets)

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("llm_report_error", error=str(e))
            return self._generate_fallback(prediction, home_team, away_team, value_bets)

    def _format_value_bets(self, bets: list[ValueBet]) -> str:
        if not bets:
            return "VALUE BETS: None identified."
        lines = ["VALUE BETS IDENTIFIED:"]
        for b in bets[:3]:
            lines.append(
                f"- {b.market.upper()} {b.selection}: Model {b.model_prob:.1%} vs "
                f"Market {b.implied_prob:.1%} | Fair odds {b.fair_odds} vs "
                f"Bookie {b.bookmaker_odds} | EV: {b.ev:+.1%} | Risk: {b.risk_rating}"
            )
        return "\n".join(lines)

    @staticmethod
    def _generate_fallback(
        pred: MatchPrediction,
        home: str,
        away: str,
        value_bets: list[ValueBet] | None,
    ) -> str:
        """Template-based report when LLM is unavailable."""
        favorite = home if pred.prob_home > pred.prob_away else away
        fav_prob = max(pred.prob_home, pred.prob_away)

        report = f"## {home} vs {away}\n\n"
        report += f"**Statistical Edge:** The model rates {favorite} as "
        report += f"favorites at {fav_prob:.0%}. "
        report += f"Projected scoreline: {pred.projected_scoreline}. "

        if pred.prob_over_25 > 0.55:
            report += f"Goals market leans over (O2.5 at {pred.prob_over_25:.0%}). "
        elif pred.prob_under_25 > 0.55:
            report += f"Goals market leans under (U2.5 at {pred.prob_under_25:.0%}). "

        report += f"\n\n**Confidence:** {pred.confidence:.0%}. "

        if value_bets:
            best = value_bets[0]
            report += f"\n\n**Best Value:** {best.market} {best.selection} at "
            report += f"{best.bookmaker_odds} (fair odds {best.fair_odds}, EV {best.ev:+.1%}). "
            report += f"Risk: {best.risk_rating}."
        else:
            report += "\n\nNo value bets meeting threshold criteria."

        report += "\n\n*Disclaimer: Probabilities are model estimates, not guarantees. Bet responsibly.*"
        return report
