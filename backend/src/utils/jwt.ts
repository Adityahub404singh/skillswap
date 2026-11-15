
import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing. Please configure JWT_SECRET in backend/.env"
  );
}

export interface JwtPayload {
  userId: number;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "number" ||
    typeof decoded.email !== "string"
  ) {
    throw new Error("Invalid JWT payload");
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
  };
}
