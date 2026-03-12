import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken, verifyAuth, AuthRequest } from "../middleware/auth";
import { query } from "../lib/db";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id, name, email, created_at",
      [id, name, email, passwordHash]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const user = result.rows[0];
    const token = generateToken({ id: user.id, email: user.email });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    console.error("[AUTH] Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await query("SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: "This account uses Google Sign-In. Please sign in with Google." });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/google", async (req: Request, res: Response) => {
  try {
    const { accessToken, userInfo, idToken } = req.body;
    let email: string;
    let name: string;
    let googleId: string;

    if (accessToken) {
      const googleRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!googleRes.ok) {
        return res.status(401).json({ error: "Invalid Google access token" });
      }
      const googleUser = await googleRes.json() as any;
      email = googleUser.email;
      name = googleUser.name || googleUser.given_name || email.split("@")[0];
      googleId = googleUser.id;
    } else if (idToken) {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!googleRes.ok) {
        return res.status(401).json({ error: "Invalid Google token" });
      }
      const googleUser = await googleRes.json() as any;
      email = googleUser.email;
      name = googleUser.name || googleUser.given_name || email.split("@")[0];
      googleId = googleUser.sub;
    } else {
      return res.status(400).json({ error: "Google token is required" });
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await query(
      `INSERT INTO users (id, name, email, google_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET google_id = COALESCE(users.google_id, $4)
       RETURNING id, name, email, created_at`,
      [id, name, email, googleId]
    );
    const user = result.rows[0];

    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    console.error("[AUTH] Google auth error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

router.get("/me", verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query("SELECT id, name, email, created_at FROM users WHERE id = $1", [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = result.rows[0];
    res.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    console.error("[AUTH] Me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
