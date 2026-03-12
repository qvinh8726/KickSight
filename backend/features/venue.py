"""Venue, rest days, and travel distance features."""

from __future__ import annotations

import pandas as pd
import numpy as np
from geopy.distance import geodesic

CAPITAL_COORDS: dict[str, tuple[float, float]] = {
    "Argentina": (-34.6037, -58.3816),
    "Brazil": (-15.7975, -47.8919),
    "Germany": (52.5200, 13.4050),
    "France": (48.8566, 2.3522),
    "Spain": (40.4168, -3.7038),
    "England": (51.5074, -0.1278),
    "Italy": (41.9028, 12.4964),
    "Netherlands": (52.3676, 4.9041),
    "Portugal": (38.7223, -9.1393),
    "Belgium": (50.8503, 4.3517),
    "Croatia": (45.8150, 15.9819),
    "Uruguay": (-34.9011, -56.1645),
    "Colombia": (4.7110, -74.0721),
    "Mexico": (19.4326, -99.1332),
    "United States": (38.9072, -77.0369),
    "Canada": (45.4215, -75.6972),
    "Japan": (35.6762, 139.6503),
    "South Korea": (37.5665, 126.9780),
    "Australia": (-33.8688, 151.2093),
    "Saudi Arabia": (24.7136, 46.6753),
    "Qatar": (25.2854, 51.5310),
    "Morocco": (33.9716, -6.8498),
    "Senegal": (14.7167, -17.4677),
    "Nigeria": (9.0579, 7.4951),
    "Ghana": (5.6037, -0.1870),
    "Cameroon": (3.8480, 11.5021),
    "Egypt": (30.0444, 31.2357),
    "Iran": (35.6892, 51.3890),
}

WC_2026_VENUES: dict[str, tuple[float, float]] = {
    "MetLife Stadium": (40.8128, -74.0742),
    "Rose Bowl": (34.1613, -118.1676),
    "AT&T Stadium": (32.7473, -97.0945),
    "Hard Rock Stadium": (25.9580, -80.2389),
    "SoFi Stadium": (33.9535, -118.3390),
    "Lumen Field": (47.5952, -122.3316),
    "Lincoln Financial Field": (39.9008, -75.1675),
    "NRG Stadium": (29.6847, -95.4107),
    "Mercedes-Benz Stadium": (33.7554, -84.4010),
    "Gillette Stadium": (42.0909, -71.2643),
    "Arrowhead Stadium": (39.0489, -94.4839),
    "Azteca Stadium": (19.3029, -99.1505),
    "Estadio BBVA": (25.6698, -100.2464),
    "Estadio Akron": (20.6820, -103.4626),
    "BC Place": (49.2768, -123.1118),
    "BMO Field": (43.6332, -79.4186),
}


def compute_rest_days(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate days since each team's previous match."""
    df = df.sort_values("match_date").copy()
    team_last_match: dict[int, pd.Timestamp] = {}

    home_rest, away_rest = [], []
    for _, row in df.iterrows():
        h_id = row["home_team_id"]
        a_id = row["away_team_id"]
        match_dt = pd.Timestamp(row["match_date"])

        if h_id in team_last_match:
            home_rest.append((match_dt - team_last_match[h_id]).days)
        else:
            home_rest.append(np.nan)

        if a_id in team_last_match:
            away_rest.append((match_dt - team_last_match[a_id]).days)
        else:
            away_rest.append(np.nan)

        team_last_match[h_id] = match_dt
        team_last_match[a_id] = match_dt

    df["home_rest_days"] = home_rest
    df["away_rest_days"] = away_rest
    df["rest_diff"] = df["home_rest_days"] - df["away_rest_days"]
    return df


def compute_travel_distance(
    df: pd.DataFrame,
    team_countries: dict[int, str] | None = None,
    venue_name_col: str = "venue",
) -> pd.DataFrame:
    """Estimate travel distance for each team to the match venue.

    Uses capital city coordinates as rough proxy for team base location.
    """
    if team_countries is None:
        df["home_travel_km"] = np.nan
        df["away_travel_km"] = np.nan
        df["travel_diff_km"] = np.nan
        return df

    home_travel, away_travel = [], []
    for _, row in df.iterrows():
        venue = row.get(venue_name_col, "")
        venue_coords = WC_2026_VENUES.get(venue)

        h_country = team_countries.get(row["home_team_id"])
        a_country = team_countries.get(row["away_team_id"])

        if venue_coords and h_country and h_country in CAPITAL_COORDS:
            home_travel.append(geodesic(CAPITAL_COORDS[h_country], venue_coords).km)
        else:
            home_travel.append(np.nan)

        if venue_coords and a_country and a_country in CAPITAL_COORDS:
            away_travel.append(geodesic(CAPITAL_COORDS[a_country], venue_coords).km)
        else:
            away_travel.append(np.nan)

    df["home_travel_km"] = home_travel
    df["away_travel_km"] = away_travel
    df["travel_diff_km"] = df["home_travel_km"] - df["away_travel_km"]
    return df
