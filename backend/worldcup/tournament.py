"""World Cup 2026 tournament-specific logic and adjustments."""

from __future__ import annotations

from dataclasses import dataclass
import pandas as pd
import numpy as np


@dataclass
class TournamentContext:
    stage: str
    is_knockout: bool
    is_neutral_venue: bool
    host_advantage: float
    penalty_risk_note: str
    squad_alert: str


WC_2026_HOSTS = {"United States", "Mexico", "Canada"}

GROUP_STAGE_SCENARIOS = {
    "must_win": 1.15,
    "already_qualified": 0.90,
    "dead_rubber": 0.80,
    "normal": 1.00,
}


class WorldCup2026Mode:
    """Applies World Cup 2026 specific adjustments to predictions.

    Handles:
    - Co-hosting by USA/Mexico/Canada (partial home advantage)
    - 48-team format with 16 groups of 3
    - Knockout round penalty risk notes
    - Tournament stage importance weighting
    - Squad news integration
    """

    STAGE_IMPORTANCE = {
        "GROUP_STAGE": 3.5,
        "ROUND_OF_32": 5.0,
        "ROUND_OF_16": 6.0,
        "QUARTER_FINALS": 7.5,
        "SEMI_FINALS": 9.0,
        "THIRD_PLACE": 4.0,
        "FINAL": 10.0,
    }

    KNOCKOUT_STAGES = {"ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"}

    def __init__(self):
        self.squad_alerts: dict[str, list[str]] = {}

    def get_context(
        self,
        stage: str,
        home_team: str,
        away_team: str,
        venue_country: str = "United States",
    ) -> TournamentContext:
        is_knockout = stage in self.KNOCKOUT_STAGES
        is_neutral = True

        host_advantage = 0.0
        if home_team in WC_2026_HOSTS and venue_country in WC_2026_HOSTS:
            host_advantage = 0.08
            is_neutral = False
        elif away_team in WC_2026_HOSTS and venue_country in WC_2026_HOSTS:
            host_advantage = -0.05

        penalty_note = ""
        if is_knockout:
            penalty_note = (
                "Knockout match: if level after extra time, penalties decide the outcome. "
                "Consider team penalty records and goalkeeper quality."
            )

        alerts = []
        for team in [home_team, away_team]:
            if team in self.squad_alerts:
                alerts.extend([f"{team}: {a}" for a in self.squad_alerts[team]])
        squad_alert = "; ".join(alerts) if alerts else "No squad alerts."

        return TournamentContext(
            stage=stage,
            is_knockout=is_knockout,
            is_neutral_venue=is_neutral,
            host_advantage=host_advantage,
            penalty_risk_note=penalty_note,
            squad_alert=squad_alert,
        )

    def adjust_probabilities(
        self,
        prob_home: float,
        prob_draw: float,
        prob_away: float,
        context: TournamentContext,
    ) -> tuple[float, float, float]:
        """Apply tournament-specific probability adjustments."""
        if context.host_advantage > 0:
            prob_home += context.host_advantage
            prob_away -= context.host_advantage * 0.6
            prob_draw -= context.host_advantage * 0.4
        elif context.host_advantage < 0:
            prob_away += abs(context.host_advantage)
            prob_home -= abs(context.host_advantage) * 0.6
            prob_draw -= abs(context.host_advantage) * 0.4

        if context.is_knockout:
            draw_reduction = prob_draw * 0.15
            prob_draw -= draw_reduction
            prob_home += draw_reduction * 0.5
            prob_away += draw_reduction * 0.5

        total = prob_home + prob_draw + prob_away
        if total > 0:
            prob_home /= total
            prob_draw /= total
            prob_away /= total

        return (
            round(max(prob_home, 0.01), 4),
            round(max(prob_draw, 0.01), 4),
            round(max(prob_away, 0.01), 4),
        )

    def get_stage_importance(self, stage: str) -> float:
        return self.STAGE_IMPORTANCE.get(stage, 3.0)

    def set_squad_alert(self, team: str, alerts: list[str]) -> None:
        self.squad_alerts[team] = alerts

    def get_group_scenario_adjustment(self, scenario: str) -> float:
        return GROUP_STAGE_SCENARIOS.get(scenario, 1.0)

    def generate_tournament_context_text(self, context: TournamentContext) -> str:
        lines = [f"TOURNAMENT CONTEXT: World Cup 2026 - {context.stage}"]
        if context.is_knockout:
            lines.append(context.penalty_risk_note)
        if not context.is_neutral_venue:
            lines.append("Host nation advantage applies for this venue.")
        if context.squad_alert != "No squad alerts.":
            lines.append(f"SQUAD NEWS: {context.squad_alert}")
        return "\n".join(lines)
