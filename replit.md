# Football Betting AI - World Cup 2026

Probability-based football match prediction and value bet detection dashboard for the 2026 FIFA World Cup.

## Architecture

- **Frontend:** Next.js 14 + Tailwind CSS + Recharts (in `frontend/`)
- **Backend:** Python FastAPI + SQLAlchemy (in `backend/`) — requires PostgreSQL and Redis
- **ML:** scikit-learn, XGBoost, LightGBM, SciPy

## Running on Replit

The frontend runs standalone on port 5000 with built-in demo data. The backend requires additional setup (see below).

### Frontend (active workflow)
- Command: `cd frontend && npm run dev`
- Port: 5000
- The app displays demo World Cup 2026 predictions when no backend is connected.

### Backend (optional, requires external services)
The backend needs:
- PostgreSQL (`DATABASE_URL` env var)
- Redis (`REDIS_URL` env var)
- Optional: `FOOTBALL_DATA_API_KEY`, `ODDS_API_KEY`, `OPENAI_API_KEY`

To start the backend separately:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Environment Variables

See `.env.example` for all required variables. Set them as Replit secrets:
- `DATABASE_URL` — PostgreSQL async connection string
- `DATABASE_URL_SYNC` — PostgreSQL sync connection string
- `REDIS_URL` — Redis connection string
- `FOOTBALL_DATA_API_KEY` — football-data.org API key
- `ODDS_API_KEY` — The Odds API key
- `OPENAI_API_KEY` — OpenAI API key (for AI match reports)

## Replit Configuration Changes

- `frontend/package.json`: dev/start scripts now use `-p 5000 -H 0.0.0.0` for Replit compatibility
- `frontend/next.config.mjs`: API rewrites proxy `/api/*` to backend at `localhost:8000`
