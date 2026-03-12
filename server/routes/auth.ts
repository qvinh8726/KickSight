import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken, verifyAuth, AuthRequest } from "../middleware/auth";

const router = Router();

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  avatar?: string;
}

const users = new Map<string, User>();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const existing = Array.from(users.values()).find((u) => u.email === email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id,
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.set(id, user);
    const token = generateToken({ id, email });
    res.status(201).json({
      token,
      user: { id, name, email, createdAt: user.createdAt },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = Array.from(users.values()).find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", verifyAuth, (req: AuthRequest, res: Response) => {
  const user = users.get(req.userId!);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  });
});

export default router;
