import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateToken, verifyAuth, AuthRequest } from "../middleware/auth";
import { query, isDbAvailable } from "../lib/db";

const router = Router();

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;

function sanitizeName(name: string): string {
  return name.trim().replace(/[<>"'&]/g, "").slice(0, MAX_NAME_LENGTH);
}

function requireDb(_req: Request, res: Response): boolean {
  if (!isDbAvailable()) {
    res.status(503).json({ error: "Database not configured. Auth is unavailable." });
    return false;
  }
  return true;
}

router.post("/register", async (req: Request, res: Response) => {
  if (!requireDb(req, res)) return;
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid input types" });
    }
    if (!EMAIL_REGEX.test(email) || email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ error: "Password is too long" });
    }
    const cleanName = sanitizeName(name);
    if (cleanName.length < 1) {
      return res.status(400).json({ error: "Name is required" });
    }
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id, name, email, created_at",
      [id, cleanName, email.trim().toLowerCase(), passwordHash]
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
  if (!requireDb(req, res)) return;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await query(
      "SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );
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
  if (!requireDb(req, res)) return;
  try {
    const { accessToken, idToken } = req.body;
    let email: string;
    let name: string;
    let googleId: string;
    let emailVerified = false;

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
      emailVerified = googleUser.verified_email === true;
    } else if (idToken) {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!googleRes.ok) {
        return res.status(401).json({ error: "Invalid Google token" });
      }
      const googleUser = await googleRes.json() as any;
      email = googleUser.email;
      name = googleUser.name || googleUser.given_name || email.split("@")[0];
      googleId = googleUser.sub;
      emailVerified = googleUser.email_verified === "true";
    } else {
      return res.status(400).json({ error: "Google token is required" });
    }

    if (!emailVerified) {
      return res.status(401).json({ error: "Google email not verified" });
    }

    const existing = await query("SELECT id, name, email, google_id, password_hash, created_at FROM users WHERE email = $1", [email]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      if (user.password_hash && !user.google_id) {
        return res.status(409).json({
          error: "An account with this email already exists. Please log in with your password.",
        });
      }
      if (!user.google_id) {
        await query("UPDATE users SET google_id = $1 WHERE id = $2", [googleId, user.id]);
      }
    } else {
      const id = crypto.randomUUID();
      const result = await query(
        "INSERT INTO users (id, name, email, google_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, created_at",
        [id, name, email, googleId]
      );
      user = result.rows[0];
    }

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
  if (!requireDb(req, res)) return;
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

// Account deletion — required by Apple App Store Review Guidelines 5.1.1(v)
router.delete("/account", verifyAuth, async (req: AuthRequest, res: Response) => {
  if (!requireDb(req, res)) return;
  try {
    // Delete user predictions first (CASCADE should handle it, but be explicit)
    await query("DELETE FROM predictions WHERE user_id = $1", [req.userId]);
    // Delete user account
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, message: "Account and all data permanently deleted" });
  } catch (err) {
    console.error("[AUTH] Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// Password change
router.put("/password", verifyAuth, async (req: AuthRequest, res: Response) => {
  if (!requireDb(req, res)) return;
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ error: "Password is too long" });
    }
    const result = await query("SELECT password_hash FROM users WHERE id = $1", [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!result.rows[0].password_hash) {
      return res.status(400).json({ error: "This account uses Google Sign-In. Password cannot be changed." });
    }
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("[AUTH] Password change error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
