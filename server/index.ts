import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import path from "path";
import { DEMO_MATCHES, BACKTEST_RESULTS } from "./data/demo";
import authRoutes from "./routes/auth";
import footballRoutes from "./routes/football";
import predictionsRoutes from "./routes/predictions";
import { analyzeMatch } from "./lib/analysis";
import { getFreeTierAnalysis, getProTierAnalysis } from "./lib/ai-tiers";
import { isDbAvailable, isDbHealthy, closePool } from "./lib/db";
import {
  getDashboardFromDb,
  getMatchesFromDb,
  getValueBetsFromDb,
  getBacktestFromDb,
  initDbTables,
} from "./lib/matches-db";
import { buildLiveDashboard } from "./lib/live-dashboard";

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

// --- Security middleware ---
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(hpp());
app.disable("x-powered-by");

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later" },
});

// CORS
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(s => s.trim())
  : [
      "http://localhost:3000",  // CRA / Next.js dev
      "http://localhost:3001",  // server itself
      "http://localhost:5000",  // Expo web (npm start)
      "http://localhost:8081",  // Expo Metro bundler
      "http://localhost:19006", // Expo web (legacy port)
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (!isProduction) {
      callback(null, true); // Allow all in dev
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "1mb" }));
app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);

app.get("/api/health", (_req, res) => {
  const healthy = !isDbAvailable() || isDbHealthy();
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    version: "2.1.0",
    database: isDbAvailable() ? (isDbHealthy() ? "connected" : "unhealthy") : "not_configured",
    uptime: Math.floor(process.uptime()),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/football", footballRoutes);
app.use("/api/predictions", predictionsRoutes);

app.get("/api/analysis/:homeTeam/:awayTeam", (req, res) => {
  try {
    const { homeTeam, awayTeam } = req.params;
    const tier = req.query.tier as string || "free";
    if (tier === "pro") {
      res.json(getProTierAnalysis(decodeURIComponent(homeTeam), decodeURIComponent(awayTeam)));
    } else {
      res.json(getFreeTierAnalysis(decodeURIComponent(homeTeam), decodeURIComponent(awayTeam)));
    }
  } catch (err) {
    console.error("[ANALYSIS] Error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.get("/api/dashboard", async (_req, res) => {
  try {
    const dbData = await getDashboardFromDb();
    if (dbData) return res.json(dbData);
  } catch {}

  try {
    const liveData = await buildLiveDashboard();
    if (liveData) return res.json(liveData);
  } catch (err) {
    console.error("[DASHBOARD] Live data error:", err);
  }

  const totalValueBets = DEMO_MATCHES.reduce((sum, m) => sum + m.value_bets.length, 0);
  const avgConfidence = DEMO_MATCHES.length > 0
    ? DEMO_MATCHES.reduce((sum, m) => sum + m.prediction.confidence, 0) / DEMO_MATCHES.length
    : 0;
  res.json({
    matches: DEMO_MATCHES,
    stats: {
      upcoming_matches: DEMO_MATCHES.length,
      value_bets: totalValueBets,
      avg_confidence: avgConfidence,
      model: "Poisson AI v2 (demo)",
    },
  });
});

app.get("/api/matches", async (_req, res) => {
  try {
    const dbMatches = await getMatchesFromDb();
    if (dbMatches) {
      return res.json(dbMatches);
    }
  } catch (err) {
    console.error("[MATCHES] DB error, falling back to demo:", err);
  }
  res.json(DEMO_MATCHES.map((m) => m.match));
});

app.get("/api/value-bets", async (_req, res) => {
  try {
    const dbBets = await getValueBetsFromDb();
    if (dbBets) {
      return res.json(dbBets);
    }
  } catch (err) {
    console.error("[VALUE-BETS] DB error, falling back to demo:", err);
  }
  const allBets = DEMO_MATCHES.flatMap((m) =>
    m.value_bets.map((b) => ({
      ...b,
      home_team: m.match.home_team,
      away_team: m.match.away_team,
      match_date: m.match.match_date,
      competition: m.match.competition,
    }))
  ).sort((a, b) => b.ev - a.ev);
  res.json(allBets);
});

app.get("/api/backtest", async (_req, res) => {
  try {
    const dbBacktest = await getBacktestFromDb();
    if (dbBacktest) {
      return res.json(dbBacktest);
    }
  } catch (err) {
    console.error("[BACKTEST] DB error, falling back to demo:", err);
  }
  res.json(BACKTEST_RESULTS);
});

// Global error handler for async routes
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[UNHANDLED]", err);
  res.status(err.status || 500).json({ error: isProduction ? "Internal server error" : err.message });
});

const webDistPath = path.join(__dirname, "..", "mobile", "dist");
app.use(express.static(webDistPath, {
  maxAge: isProduction ? "1d" : 0,
  etag: true,
}));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(webDistPath, "index.html"));
});

const server = app.listen(PORT, async () => {
  console.log(`KickSight v2.0 running on http://localhost:${PORT}`);
  if (isDbAvailable()) {
    await initDbTables();
    console.log("  Database: connected (real data mode)");
  } else {
    console.log("  Database: not configured (demo mode)");
    console.log("  Set DATABASE_URL to enable real data + user accounts");
  }
});

function shutdown() {
  console.log("\nShutting down...");
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  shutdown();
});
