import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? "" : `dev-${crypto.randomBytes(32).toString("hex")}`);

if (isProduction && !process.env.JWT_SECRET) {
  console.error("[AUTH] FATAL: JWT_SECRET is required in production. Exiting.");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn("[AUTH] Using auto-generated JWT secret (dev only). Set JWT_SECRET for persistence across restarts.");
}

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function generateToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as { id: string; email: string };
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
