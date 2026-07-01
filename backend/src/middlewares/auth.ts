import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

// 1. Basic Auth Middleware (Pehle jaisa)
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "singhaditya4560@gmail.com").split(",");

// 2. 🔥 BULLETPROOF Admin Middleware (Self-Auth check)
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  // Pehle check karo agar token already verify ho chuka hai (requireAuth middleware chala hai)
  // Agar nahi hua, toh yahi check kar lo
  if (!req.userEmail) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
      }
      const token = authHeader.split(" ")[1];
      try {
        const payload = verifyToken(token);
        req.userId = payload.userId;
    req.userEmail = payload.email;
      } catch {
        return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
      }
  }

  // Ab check karo agar email Admin list mein hai
  if (!req.userEmail || !ADMIN_EMAILS.includes(req.userEmail)) {
    return res.status(403).json({ error: "Forbidden", message: "Admin access only" });
  }
  
  next();
}

