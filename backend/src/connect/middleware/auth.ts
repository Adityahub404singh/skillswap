import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  requireAuth,
  type AuthRequest,
} from "../../middlewares/auth.js";

type ConnectAuthRequest = AuthRequest & {
  user?: {
    id: string;
    email: string | null;
  };
};

/**
 * Reuse SkillSwap's existing JWT/session middleware.
 * The core middleware exposes a numeric userId; Connect
 * normalizes it to a string only at the module boundary.
 */
export function connectAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req as AuthRequest, res, () => {
    const authReq = req as ConnectAuthRequest;
    const numericUserId = authReq.userId;

    if (
      typeof numericUserId !== "number" ||
      !Number.isSafeInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Valid SkillSwap authentication is required",
      });
      return;
    }

    authReq.user = {
      id: String(numericUserId),
      email: authReq.userEmail ? String(authReq.userEmail) : null,
    };

    next();
  });
}
