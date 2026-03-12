# WC2026 Betting AI — React Native iOS App

Football betting analysis app for the 2026 FIFA World Cup, built with React Native (Expo) and a Node.js backend.

## Architecture

```
server/                    # Node.js/Express API (port 3001)
  index.ts                 # Express app entry
  data/demo.ts             # Demo WC2026 match/prediction data
  routes/auth.ts           # JWT auth (register/login/google/me) with PostgreSQL
  routes/football.ts       # Live football data from TheSportsDB
  middleware/auth.ts        # JWT verification middleware
  lib/analysis.ts          # Poisson AI match analysis engine
  lib/db.ts                # PostgreSQL connection pool
mobile/                    # Expo React Native app (port 5000 web preview)
  app/
    _layout.tsx            # Root layout + AuthProvider + Google OAuth handler
    index.tsx              # Auth redirect (login or tabs)
    (auth)/
      _layout.tsx          # Auth stack layout
      login.tsx            # Login screen (email/password + Google Sign-In)
      register.tsx         # Register screen with password strength
    (tabs)/
      _layout.tsx          # Tab navigator (5 tabs)
      index.tsx            # Dashboard with animated counters
      matches.tsx          # WC2026 matches with filters
      value-bets.tsx       # AI-detected value bets
      backtest.tsx         # Historical performance metrics
      profile.tsx          # User profile + settings + logout
  components/
    MatchCard.tsx          # Animated match card with odds
    ProbabilityBar.tsx     # 1X2 probability bar
  lib/
    types.ts               # TypeScript types
    query-client.ts        # React Query + API client
    auth-context.tsx       # Auth state (JWT + SecureStore)
  metro.config.js          # Proxy /api/* → backend port 3001
backend/                   # (Legacy) Python FastAPI - not active
```

## Database

PostgreSQL (Replit built-in) with tables:
- `users` — User accounts (email/password + Google OAuth)
- `predictions` — Saved match predictions per user
- `favorites` — User's favorite teams

## Workflows

| Workflow | Command | Port | Type |
|---|---|---|---|
| Start Backend | `cd server && npm run dev` | 3001 | console |
| Start application | `cd mobile && npm run start` | 5000 | webview |

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account (name, email, password)
- `POST /api/auth/login` — Login (email, password) → JWT token
- `POST /api/auth/google` — Google OAuth login (accessToken/idToken)
- `GET /api/auth/me` — Verify token, get user info

### WC2026 Predictions
- `GET /api/dashboard` — Stats + match predictions
- `GET /api/matches` — All upcoming matches
- `GET /api/value-bets` — Value bets sorted by EV
- `GET /api/backtest` — Historical performance data

### Live Football
- `GET /api/football/leagues` — Available leagues
- `GET /api/football/live-matches?league=epl` — Upcoming & recent results
- `GET /api/football/team/:name` — Team info

### AI Analysis
- `GET /api/analysis/:homeTeam/:awayTeam` — Poisson-based match prediction

## Screens

- **Login/Register** — Email+password auth with Google Sign-In
- **Dashboard** — Animated stats counters + match prediction cards
- **Matches** — WC2026 matches with Group Stage / Knockout filters
- **Value Bets** — AI-detected betting opportunities with Kelly stakes
- **Backtest** — Monthly ROI chart + Sharpe ratio + performance metrics
- **Profile** — User info, settings, sign out

## Tech Stack

- **Frontend:** React Native (Expo SDK 51), Expo Router, React Query, Animated API
- **Backend:** Node.js, Express, TypeScript, JWT (jsonwebtoken), bcryptjs
- **Database:** PostgreSQL (Replit built-in) via `pg` driver
- **AI Engine:** Poisson distribution model for goal predictions
- **Football Data:** TheSportsDB free API
- **Auth:** JWT + Google OAuth (implicit flow with CSRF state)
- **Design:** Dark theme (#0B0F1A), green accent (#00E676), Inter font

## Auth Flow

1. App starts → checks for saved JWT in SecureStore (native) or localStorage (web)
2. No token → Login screen
3. Register/Login/Google → JWT saved → redirect to Dashboard
4. Protected API routes use `Authorization: Bearer <token>` header
5. Google OAuth: redirect to Google → access token → verify on server → create/find user → JWT
6. Users persisted in PostgreSQL (survives server restarts)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `GOOGLE_CLIENT_ID` — Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
- `JWT_SECRET` — JWT signing secret (uses fallback in dev)

## iOS Testing

Scan the QR code shown in the "Start application" workflow console with the **Expo Go** app on your iPhone to test on a real device.
