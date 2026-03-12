# KickSight

Football betting AI that predicts match probabilities and detects value bets. Focused on the 2026 FIFA World Cup.

**Disclaimer:** Predictions are probability-based estimates, not guarantees of profit. Bet responsibly.

## Quick Start (Demo Mode)

```bash
cd server
npm install
npm start
```

Open **http://localhost:3001**. Runs with World Cup 2026 demo data + live ESPN matches. No database needed.

## Full Setup (Real Data + Database)

### Step 1: Get a free cloud database

Sign up at [neon.tech](https://neon.tech) (free, no credit card). Create a project named `kicksight` and copy the connection string.

### Step 2: Get free API keys

| Service | Free Tier | Register |
|---------|-----------|----------|
| football-data.org | 10 req/min, 12 leagues | [Register](https://www.football-data.org/client/register) |
| the-odds-api.com | 500 req/month | [Register](https://the-odds-api.com/#get-access) |
| OpenAI (optional) | Pay-per-use ~$0.01/report | [Register](https://platform.openai.com) |

### Step 3: Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/kicksight?sslmode=require
JWT_SECRET=your-random-secret-here
FOOTBALL_DATA_API_KEY=your-key
ODDS_API_KEY=your-key
OPENAI_API_KEY=sk-your-key

# For Python backend (same DB, different driver):
DATABASE_URL_ASYNC=postgresql+asyncpg://user:pass@ep-xxx.neon.tech/kicksight?sslmode=require
DATABASE_URL_SYNC=postgresql+psycopg2://user:pass@ep-xxx.neon.tech/kicksight?sslmode=require
```

### Step 4: Initialize database and ingest data

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the full pipeline: create tables + ingest matches + ingest odds + train models
python scripts/ingest_real_data.py
```

Or step by step:

```bash
python scripts/ingest_real_data.py --seed       # Create tables + synthetic data
python scripts/ingest_real_data.py --matches    # Ingest real matches from football-data.org
python scripts/ingest_real_data.py --odds       # Ingest real odds from the-odds-api.com
python scripts/ingest_real_data.py --train      # Train ML models + generate predictions
```

### Step 5: Start the server

```bash
cd server
npm install
npm start
```

Open **http://localhost:3001**. The app now shows real data from the database.

## Architecture

```
server/             # Node.js Express API (port 3001)
├── routes/         # auth, football (ESPN), user predictions
├── lib/            # database, Poisson analysis, DB queries
├── data/           # World Cup 2026 demo fallback
└── index.ts        # Entry point (queries DB, falls back to demo)

mobile/             # Expo/React Native (pre-built in dist/)
├── app/(tabs)/     # Dashboard, Matches, Value Bets, History, Profile
├── components/     # MatchCard, ProbabilityBar
└── lib/            # Auth, theme, i18n, API client

backend/            # Python FastAPI ML backend (port 8000)
├── prediction/     # Poisson, XGBoost, LightGBM, Ensemble
├── betting/        # Value detection, Kelly criterion
├── backtest/       # Historical simulation engine
├── data/           # API clients, ingestion, processors
├── features/       # Elo, rolling stats, team strength
├── models/         # SQLAlchemy ORM (Team, Match, Odds, Prediction)
└── worldcup/       # Tournament-specific adjustments

scripts/            # CLI tools
├── ingest_real_data.py  # Full data pipeline (ingest + train + predict)
├── seed_data.py         # Synthetic data generator
├── train_models.py      # Model training
├── predict_upcoming.py  # Generate predictions
└── init-db.sql          # Database schema
```

## Data Flow

```
football-data.org --> ingest_real_data.py --> PostgreSQL (Neon)
the-odds-api.com  --> ingest_real_data.py --> PostgreSQL (Neon)
                                                    |
                              train_models.py <-----+
                                    |
                              ml_predictions ------> PostgreSQL (Neon)
                                                          |
                              Node.js server <------------+
                                    |
                              ESPN API (live matches)
                                    |
                              Web App (mobile/dist)
```

## ML Models

| Model | Weight | Purpose |
|-------|--------|---------|
| Poisson (Dixon-Coles) | 20% | Goal expectancy, scorelines |
| Logistic Regression | 15% | Calibrated 1X2 baseline |
| XGBoost | 40% | Primary gradient boosting |
| LightGBM | 25% | Ensemble diversity |

## API Endpoints

| Endpoint | Source | Description |
|----------|--------|-------------|
| `GET /api/dashboard` | DB or demo | Upcoming matches + predictions + value bets |
| `GET /api/matches` | DB or demo | All matches |
| `GET /api/value-bets` | DB or demo | Value bets sorted by EV |
| `GET /api/backtest` | DB or demo | Backtesting results |
| `GET /api/football/live-matches` | ESPN | Live match scores |
| `GET /api/football/standings` | ESPN | League standings |
| `GET /api/football/ai-analysis/:league/:id` | Computed | AI match analysis |
| `POST /api/auth/register` | DB | User registration |
| `POST /api/auth/login` | DB | User login |
| `GET /api/health` | - | Server status + DB connectivity |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | For real data | PostgreSQL connection string |
| `JWT_SECRET` | For auth | Token signing secret |
| `FOOTBALL_DATA_API_KEY` | For real matches | football-data.org API key |
| `ODDS_API_KEY` | For real odds | the-odds-api.com API key |
| `OPENAI_API_KEY` | Optional | AI report generation |

See `.env.example` for the complete list.

## License

MIT
