# WC2026 Betting AI — React Native iOS App

Football betting analysis app for the 2026 FIFA World Cup, built with React Native (Expo) and a Node.js backend.

## Architecture

```
server/          # Node.js/Express API (port 3001)
  index.ts       # Express app entry
  data/demo.ts   # Demo match/prediction data
mobile/          # Expo React Native app (port 5000 web preview)
  app/
    _layout.tsx         # Root layout + QueryClient
    (tabs)/
      index.tsx         # Dashboard screen
      matches.tsx       # All Matches screen
      value-bets.tsx    # Value Bets screen
      backtest.tsx      # Backtest Performance screen
  components/
    MatchCard.tsx       # Match card with probability bar
    ProbabilityBar.tsx  # Animated 1X2 probability bar
  lib/
    types.ts            # TypeScript types
    query-client.ts     # React Query + API client
backend/         # (Legacy) Python FastAPI backend - not active
```

## Workflows

| Workflow | Command | Port | Type |
|---|---|---|---|
| Start Backend | `cd server && npm run dev` | 3001 | console |
| Start application | `cd mobile && npm run start` | 5000 | webview |

## Screens

- **Dashboard** — Stats overview (matches, value bets, confidence) + match cards
- **Matches** — All upcoming matches with filters (Group Stage / Knockout)  
- **Value Bets** — Value bets sorted by Expected Value with Kelly stake
- **Backtest** — Monthly ROI bar chart + performance metrics

## iOS Testing

Scan the QR code shown in the "Start application" workflow console with the **Expo Go** app on your iPhone to test on a real device.

## Tech Stack

- **Frontend:** React Native (Expo SDK 51), Expo Router, React Query, Reanimated
- **Backend:** Node.js, Express, TypeScript, tsx
- **Design:** Dark theme (#0B0F1A), green accent (#00E676)

## Connecting Live Data

To connect to the Python ML backend (future):
1. Set `EXPO_PUBLIC_API_URL` to your deployed Python API URL
2. The mobile app reads this env var for API requests

## Missing Features (future work)

- Real-time odds from football-data.org / The Odds API
- User authentication and personal bankroll tracking
- Push notifications for new value bets
- In-play live match updates
- Asian Handicap market support
