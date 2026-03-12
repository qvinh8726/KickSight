# Football Betting AI - World Cup 2026

Production-ready football betting analysis system that predicts match probabilities and detects value bets by comparing model outputs against bookmaker odds. Focused on the 2026 FIFA World Cup.

**Disclaimer:** Predictions are probability-based estimates, not guarantees of profit. Every recommendation shows fair odds, bookmaker odds, edge, EV, and confidence. Bet responsibly.

## Architecture

```
backend/
├── models/        # SQLAlchemy ORM (Team, Match, Odds, Prediction, Backtest)
├── data/          # Data pipeline (API clients, CSV/JSON loaders, processors)
├── features/      # Feature engineering (Elo, rolling stats, strength, venue)
├── prediction/    # ML models (Poisson, Logistic, XGBoost, LightGBM, Ensemble)
├── betting/       # Betting engine (odds conversion, value detection, Kelly)
├── backtest/      # Backtesting engine (time-based splits, metrics, walk-forward)
├── analysis/      # LLM report writer
├── worldcup/      # World Cup 2026 mode (tournament adjustments)
├── api/           # FastAPI routes
└── main.py        # Application entry point

frontend/          # Next.js dashboard
scripts/           # CLI tools (seed, train, predict, backtest)
```

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL
- **ML:** scikit-learn, XGBoost, LightGBM, SciPy
- **Frontend:** Next.js 14, React, Tailwind CSS, Recharts
- **Infrastructure:** Docker, Docker Compose

## Quick Start

### 1. Docker (recommended)

```bash
cp .env.example .env
# Edit .env with your API keys

docker-compose up -d
```

The backend runs at `http://localhost:8000`, frontend at `http://localhost:3000`.

### 2. Local Development

**Backend:**

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt

# Start PostgreSQL locally, then:
cp .env.example .env
# Edit .env with your database URL and API keys

# Create tables and seed data
python scripts/seed_data.py

# Train models
python scripts/train_models.py

# Generate predictions for upcoming matches
python scripts/predict_upcoming.py

# Start the API server
uvicorn backend.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Data Pipeline

### Supported Sources

| Source | Method | Coverage |
|--------|--------|----------|
| football-data.org API | `POST /api/data/ingest/competition` | International matches, World Cup |
| the-odds-api.com | `POST /api/data/ingest/odds` | Bookmaker odds (1X2, O/U, spreads) |
| CSV upload | `POST /api/data/upload/csv` | Custom datasets |
| JSON upload | `POST /api/data/upload/json` | Custom datasets |

### CSV Format

```csv
date,home_team,away_team,home_goals,away_goals,competition,home_xg,away_xg
2024-06-14,Germany,Scotland,5,1,UEFA Euro,3.2,0.8
```

## Features Engineered

- **Elo ratings** - World Football Elo with tournament importance weighting
- **Rolling averages** - Goals, xG, shots, possession over last 5 and 10 matches
- **Team strength** - Attack/defense strength relative to competition average
- **Head-to-head** - Historical record between the two teams
- **Venue** - Home/away/neutral adjustments, travel distance
- **Rest days** - Days since each team's previous match
- **Tournament context** - Importance weighting, knockout stage awareness

## Prediction Models

| Model | Type | Usage |
|-------|------|-------|
| Poisson (Dixon-Coles) | Goal expectancy | Scoreline probabilities, O/U, BTTS |
| Logistic Regression | Calibrated baseline | 1X2 probabilities |
| XGBoost | Gradient boosting | Primary 1X2, O/U, BTTS |
| LightGBM | Gradient boosting | Ensemble diversity |
| **Ensemble** | Weighted average | Final predictions (default) |

### Prediction Outputs

- Home/Draw/Away win probabilities
- Over/Under 2.5 goals probability
- Both teams to score probability
- Projected scoreline
- Asian handicap leaning
- Confidence score

## Betting Engine

1. Converts bookmaker odds to implied probabilities
2. Removes overround using multiplicative or Shin's method
3. Compares model vs market probabilities
4. Calculates expected value for each market
5. Flags bets with EV above threshold (default: 3%)
6. Sizes bets using fractional Kelly criterion (default: 25%)
7. Applies risk controls (max stake, daily limits, drawdown circuit breaker)

## Backtesting

```bash
# From command line
python scripts/run_backtest.py

# Via API
POST /api/backtest/run
{
  "train_pct": 0.6,
  "val_pct": 0.2,
  "min_ev": 0.03,
  "kelly_fraction": 0.25
}
```

Metrics reported: win rate, ROI, max drawdown, Sharpe ratio, CLV, profit by market, monthly P&L.

All splits are **time-based** (no random shuffling) to prevent data leakage.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/matches/` | GET | List matches (filter by competition, date, status) |
| `/api/matches/upcoming` | GET | Upcoming fixtures |
| `/api/matches/{id}` | GET | Single match details |
| `/api/matches/{id}/odds` | GET | Odds for a match |
| `/api/teams/` | GET | List teams by Elo rating |
| `/api/predictions/` | GET | List predictions |
| `/api/predictions/match/{id}` | GET | Predictions for a match |
| `/api/predictions/value-bets` | GET | Active value bets |
| `/api/predictions/dashboard` | GET | Dashboard data (matches + predictions + odds) |
| `/api/backtest/run` | POST | Run historical backtest |
| `/api/backtest/walk-forward` | POST | Walk-forward backtest |
| `/api/analysis/report` | POST | Generate AI match report |
| `/api/data/ingest/competition` | POST | Ingest from football-data.org |
| `/api/data/ingest/odds` | POST | Ingest bookmaker odds |
| `/api/data/upload/csv` | POST | Upload CSV match data |

## World Cup 2026 Mode

Special adjustments for the 48-team tournament:

- **Host advantage** for USA/Mexico/Canada at home venues
- **Neutral venue** adjustments for all other matches
- **Knockout stage** draw probability reduction + penalty risk notes
- **Tournament importance** weighting by stage (group through final)
- **Squad alerts** for injuries/suspensions

## Configuration

Key environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `KELLY_FRACTION` | 0.25 | Fractional Kelly multiplier |
| `MIN_EV_THRESHOLD` | 0.03 | Minimum EV to flag a value bet |
| `MAX_BET_FRACTION` | 0.05 | Max single bet as % of bankroll |
| `BANKROLL` | 1000.0 | Starting bankroll |

## License

MIT
