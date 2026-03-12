import { Router, Response } from "express";
import { verifyAuth, AuthRequest } from "../middleware/auth";
import { query } from "../lib/db";

const router = Router();

router.use(verifyAuth);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      "SELECT * FROM predictions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[PREDICTIONS] List error:", err);
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { homeTeam, awayTeam, competition, predictedOutcome, confidence, homeWinProb, drawProb, awayWinProb, notes } = req.body;
    if (!homeTeam || !awayTeam || typeof homeTeam !== "string" || typeof awayTeam !== "string") {
      return res.status(400).json({ error: "Home team and away team are required" });
    }
    if (homeTeam.length > 100 || awayTeam.length > 100) {
      return res.status(400).json({ error: "Team name too long" });
    }
    if (notes && (typeof notes !== "string" || notes.length > 500)) {
      return res.status(400).json({ error: "Notes must be a string of max 500 characters" });
    }
    if (confidence !== null && confidence !== undefined && (typeof confidence !== "number" || confidence < 0 || confidence > 1)) {
      return res.status(400).json({ error: "Confidence must be between 0 and 1" });
    }
    const clean = (s: any) => typeof s === "string" ? s.slice(0, 200) : null;
    const clampProb = (v: any) => typeof v === "number" ? Math.max(0, Math.min(1, v)) : null;
    const result = await query(
      `INSERT INTO predictions (user_id, home_team, away_team, competition, predicted_outcome, confidence, home_win_prob, draw_prob, away_win_prob, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.userId, clean(homeTeam), clean(awayTeam), clean(competition), clean(predictedOutcome), clampProb(confidence), clampProb(homeWinProb), clampProb(drawProb), clampProb(awayWinProb), clean(notes)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[PREDICTIONS] Create error:", err);
    res.status(500).json({ error: "Failed to save prediction" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid prediction ID" });
    }
    const result = await query(
      "DELETE FROM predictions WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Prediction not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[PREDICTIONS] Delete error:", err);
    res.status(500).json({ error: "Failed to delete prediction" });
  }
});

router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const total = await query("SELECT COUNT(*) as count FROM predictions WHERE user_id = $1", [req.userId]);
    const recent = await query(
      "SELECT COUNT(*) as count FROM predictions WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'",
      [req.userId]
    );
    res.json({
      totalPredictions: parseInt(total.rows[0].count),
      recentPredictions: parseInt(recent.rows[0].count),
    });
  } catch (err) {
    console.error("[PREDICTIONS] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
