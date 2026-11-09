
import {
  Request,
  Response,
  NextFunction,
} from "express";

import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

// ==========================================
// USER AUTHENTICATION MIDDLEWARE
// ==========================================

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  // Debug: Never print the actual token.
  console.log("AUTH CHECK:", {
    authorizationPresent: Boolean(authHeader),
    bearerTokenPresent: Boolean(
      authHeader?.startsWith("Bearer ")
    ),
  });

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Empty authentication token",
    });
  }

  try {
    const payload = verifyToken(token);

    req.userId = payload.userId;
    req.userEmail = payload.email;

    console.log("AUTH SUCCESS:", {
      userId: req.userId,
      emailPresent: Boolean(req.userEmail),
    });

    return next();
  } catch (error) {
    console.error("AUTH TOKEN ERROR:", error);

    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
}

// ==========================================
// ADMIN EMAIL CONFIGURATION
// ==========================================

const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ||
  "singhaditya4560@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

// ==========================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ==========================================

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // If user authentication has not already happened,
  // verify the token here.
  if (!req.userEmail) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Empty authentication token",
      });
    }

    try {
      const payload = verifyToken(token);

      req.userId = payload.userId;
      req.userEmail = payload.email;
    } catch (error) {
      console.error("ADMIN TOKEN ERROR:", error);

      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }
  }

  // Verify admin email.
  const userEmail = req.userEmail?.toLowerCase();

  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Admin access only",
    });
  }

  console.log("ADMIN AUTH SUCCESS:", {
    userId: req.userId,
  });

  return next();
}
