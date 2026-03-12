# WC2026 Betting AI — React Native iOS App

Football betting analysis app for the 2026 FIFA World Cup, built with React Native (Expo) and a Node.js backend.

## Architecture

```
server/                    # Node.js/Express API (port 3001)
  index.ts                 # Express app entry + static file serving for production
  data/demo.ts             # Demo WC2026 match/prediction data
  routes/auth.ts           # JWT auth (register/login/google/me) with PostgreSQL
  routes/football.ts       # Live football data from TheSportsDB
  routes/predictions.ts    # User predictions CRUD (GET/POST/DELETE/stats)
  middleware/auth.ts        # JWT verification middleware
  lib/analysis.ts          # Poisson AI match analysis engine
  lib/db.ts                # PostgreSQL connection pool
mobile/                    # Expo React Native app (port 5000 web preview)
  app/
    _layout.tsx            # Root layout + ThemeProvider + NotificationsProvider + AuthProvider + Google OAuth handler
    index.tsx              # Auth redirect (login or tabs)
    notifications.tsx      # Notifications screen (modal)
    (auth)/
      _layout.tsx          # Auth stack layout
      login.tsx            # Login screen (email/password + Google Sign-In)
      register.tsx         # Register screen with password strength
    (tabs)/
      _layout.tsx          # Tab navigator (5 visible tabs) with theme support
      index.tsx            # Dashboard with animated counters + notification badge
      matches.tsx          # WC2026 matches with filters
      value-bets.tsx       # AI-detected value bets
      history.tsx          # Saved predictions with stats
      backtest.tsx         # Historical performance metrics (hidden from tab bar)
      profile.tsx          # User profile + dark/light toggle + settings + logout
  components/
    MatchCard.tsx          # Animated match card with odds + save button
    ProbabilityBar.tsx     # 1X2 probability bar
  lib/
    types.ts               # TypeScript types
    query-client.ts        # React Query + API client
    auth-context.tsx       # Auth state (JWT + SecureStore)
    theme-context.tsx      # Dark/Light mode theme system
    notifications-context.tsx  # In-app notification system
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

### User Predictions
- `GET /api/predictions` — List user's saved predictions
- `POST /api/predictions` — Save a new prediction
- `DELETE /api/predictions/:id` — Delete a prediction
- `GET /api/predictions/stats` — Prediction stats (total, this week)

### Live Football (Real Data)
- `GET /api/football/leagues` — Available leagues (EPL, La Liga, Bundesliga, Serie A, Ligue 1, UCL)
- `GET /api/football/all-matches` — All upcoming & recent results from all leagues with team badges
- `GET /api/football/live-matches?league=epl` — Upcoming & recent results for a specific league
- `GET /api/football/standings?league=epl` — League standings/table with form, goals, points
- `GET /api/football/team/:name` — Team info

### AI Analysis
- `GET /api/analysis/:homeTeam/:awayTeam` — Poisson-based match prediction

## Screens

- **Login/Register** — Email+password auth with Google Sign-In (theme-aware)
- **Dashboard** — Animated stats + real recent results & upcoming matches + WC2026 predictions
- **Matches** — Real live matches from 6 leagues with Upcoming/Results/Standings views, team badges, league filter
- **Value Bets** — AI-detected betting opportunities with Kelly stakes
- **History** — Saved predictions list with stats, delete support
- **Notifications** — In-app notification center (match alerts, results, value bets, system)
- **Backtest** — Monthly ROI chart + Sharpe ratio + performance metrics (hidden from tab bar)
- **Profile** — User info, dark/light mode toggle, settings, sign out

## Features

### Dark/Light Mode
- ThemeProvider wraps entire app via `mobile/lib/theme-context.tsx`
- Toggle in Profile > Settings via Switch component
- Theme preference persisted in localStorage (web)
- All screens use dynamic `colors` from `useTheme()` hook

### In-App Notifications
- NotificationsProvider via `mobile/lib/notifications-context.tsx`
- Types: match alerts, results, value bets, system updates
- Notification badge on Dashboard header with unread count
- Full notification center screen (modal) with mark-as-read, clear all
- Auto-generates periodic match notifications (every 5 min)
- Persisted in localStorage (max 50)

### Deployment
- Configured for Replit autoscale deployment
- Build: Expo web export → server serves static files
- Production: Single server serves both API and web frontend
- JWT_SECRET set as env var for secure production auth

## Tech Stack

- **Frontend:** React Native (Expo SDK 51), Expo Router, React Query, Animated API
- **Backend:** Node.js, Express, TypeScript, JWT (jsonwebtoken), bcryptjs
- **Database:** PostgreSQL (Replit built-in) via `pg` driver
- **AI Engine:** Poisson distribution model for goal predictions
- **Football Data:** TheSportsDB free API
- **Auth:** JWT + Google OAuth (implicit flow with CSRF state)
- **Design:** Dark/Light theme system, green accent (#00E676 / #00C853), Inter font

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
- `JWT_SECRET` — JWT signing secret (production-secure random key)

## iOS Testing

Scan the QR code shown in the "Start application" workflow console with the **Expo Go** app on your iPhone to test on a real device.
