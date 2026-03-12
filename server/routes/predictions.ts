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
    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: "Home team and away team are required" });
    }
    const result = await query(
      `INSERT INTO predictions (user_id, home_team, away_team, competition, predicted_outcome, confidence, home_win_prob, draw_prob, away_win_prob, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.userId, homeTeam, awayTeam, competition || null, predictedOutcome || null, confidence || null, homeWinProb || null, drawProb || null, awayWinProb || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[PREDICTIONS] Create error:", err);
    res.status(500).json({ error: "Failed to save prediction" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      "DELETE FROM predictions WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
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
