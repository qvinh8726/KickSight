"""Seed the database with sample international match data for testing."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
import random

from backend.database import sync_engine, Base, SyncSession
from backend.models.team import Team
from backend.models.match import Match
from backend.models.odds import Odds


TEAMS = [
    ("Brazil", "BRA", "CONMEBOL", 3),
    ("Argentina", "ARG", "CONMEBOL", 1),
    ("France", "FRA", "UEFA", 2),
    ("England", "ENG", "UEFA", 4),
    ("Germany", "GER", "UEFA", 14),
    ("Spain", "ESP", "UEFA", 8),
    ("Netherlands", "NED", "UEFA", 7),
    ("Portugal", "POR", "UEFA", 6),
    ("Belgium", "BEL", "UEFA", 5),
    ("Italy", "ITA", "UEFA", 9),
    ("Croatia", "CRO", "UEFA", 10),
    ("Uruguay", "URU", "CONMEBOL", 15),
    ("Colombia", "COL", "CONMEBOL", 12),
    ("Mexico", "MEX", "CONCACAF", 16),
    ("United States", "USA", "CONCACAF", 11),
    ("Canada", "CAN", "CONCACAF", 43),
    ("Japan", "JPN", "AFC", 18),
    ("South Korea", "KOR", "AFC", 22),
    ("Australia", "AUS", "AFC", 24),
    ("Morocco", "MAR", "CAF", 13),
    ("Senegal", "SEN", "CAF", 20),
    ("Nigeria", "NGA", "CAF", 28),
    ("Saudi Arabia", "KSA", "AFC", 56),
    ("Qatar", "QAT", "AFC", 37),
]

COMPETITIONS = [
    ("FIFA World Cup", 4.0),
    ("FIFA World Cup Qualification", 2.5),
    ("International Friendly", 1.0),
    ("UEFA Nations League", 2.0),
    ("Copa America", 3.0),
]


def seed():
    Base.metadata.create_all(sync_engine)

    with SyncSession() as session:
        existing = session.query(Team).count()
        if existing > 0:
            print(f"Database already has {existing} teams. Skipping seed.")
            return

        teams = []
        for name, code, conf, ranking in TEAMS:
            elo = 2100 - ranking * 25 + random.randint(-50, 50)
            t = Team(
                name=name, country_code=code, confederation=conf,
                fifa_ranking=ranking, elo_rating=elo, is_national_team=True,
            )
            session.add(t)
            teams.append(t)

        session.flush()
        print(f"Created {len(teams)} teams")

        match_count = 0
        base_date = date(2022, 1, 1)

        for i in range(500):
            home_team = random.choice(teams)
            away_team = random.choice([t for t in teams if t.id != home_team.id])
            match_date = base_date + timedelta(days=random.randint(0, 1500))
            comp_name, importance = random.choice(COMPETITIONS)

            home_goals = max(0, int(random.gauss(1.3, 1.1)))
            away_goals = max(0, int(random.gauss(1.1, 1.0)))

            m = Match(
                home_team_id=home_team.id,
                away_team_id=away_team.id,
                match_date=match_date,
                competition=comp_name,
                home_goals=home_goals,
                away_goals=away_goals,
                home_xg=round(max(0, random.gauss(home_goals, 0.4)), 2),
                away_xg=round(max(0, random.gauss(away_goals, 0.4)), 2),
                home_shots=random.randint(5, 20),
                away_shots=random.randint(4, 18),
                home_shots_on_target=random.randint(1, 8),
                away_shots_on_target=random.randint(1, 7),
                home_possession=round(random.uniform(35, 65), 1),
                home_corners=random.randint(2, 12),
                away_corners=random.randint(2, 10),
                home_yellow_cards=random.randint(0, 4),
                away_yellow_cards=random.randint(0, 4),
                is_neutral_venue=random.random() < 0.3,
                importance=importance,
                status="finished",
            )
            m.away_possession = round(100 - (m.home_possession or 50), 1)
            session.add(m)
            match_count += 1

        session.flush()

        scheduled_date = date.today() + timedelta(days=90)
        for i in range(20):
            home_team = random.choice(teams)
            away_team = random.choice([t for t in teams if t.id != home_team.id])
            m = Match(
                home_team_id=home_team.id,
                away_team_id=away_team.id,
                match_date=scheduled_date + timedelta(days=i),
                competition="FIFA World Cup",
                competition_stage="GROUP_STAGE",
                is_neutral_venue=True,
                importance=4.0,
                status="scheduled",
            )
            session.add(m)
            match_count += 1

        session.flush()

        odds_count = 0
        finished_matches = session.query(Match).filter(Match.status == "finished").all()
        for m in finished_matches[:300]:
            for bookie in ["pinnacle", "bet365", "betfair"]:
                home_true_prob = 0.45 if (m.home_goals or 0) > (m.away_goals or 0) else 0.30
                draw_true_prob = 0.25
                away_true_prob = 1 - home_true_prob - draw_true_prob
                margin = random.uniform(1.03, 1.08)

                o = Odds(
                    match_id=m.id,
                    bookmaker=bookie,
                    market="1x2",
                    home_current=round(margin / home_true_prob, 2),
                    draw_current=round(margin / draw_true_prob, 2),
                    away_current=round(margin / away_true_prob, 2),
                    over_25_current=round(random.uniform(1.7, 2.2), 2),
                    under_25_current=round(random.uniform(1.7, 2.2), 2),
                )
                o.home_open = round((o.home_current or 2.0) * random.uniform(0.95, 1.05), 2)
                o.draw_open = round((o.draw_current or 3.0) * random.uniform(0.95, 1.05), 2)
                o.away_open = round((o.away_current or 3.0) * random.uniform(0.95, 1.05), 2)
                o.home_close = round((o.home_current or 2.0) * random.uniform(0.97, 1.03), 2)
                o.draw_close = round((o.draw_current or 3.0) * random.uniform(0.97, 1.03), 2)
                o.away_close = round((o.away_current or 3.0) * random.uniform(0.97, 1.03), 2)

                session.add(o)
                odds_count += 1

        session.commit()
        print(f"Seeded {match_count} matches and {odds_count} odds records")


if __name__ == "__main__":
    seed()
