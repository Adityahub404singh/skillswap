import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "../db.js";
import { transactionsTable } from "../schema/transactions.js";
import { eq, sql } from "drizzle-orm";
import { signToken } from "../utils/jwt.js";
import { z } from "zod";

const router: IRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  skillsTeach: z.array(z.string()).default([]),
  skillsLearn: z.array(z.string()).default([]),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, email: user.email,
    bio: user.bio, avatar: user.avatar,
    skillsTeach: user.skillsTeach || [],
    skillsLearn: user.skillsLearn || [],
    credits: user.credits, trustScore: user.trustScore,
    sessionsCompleted: user.sessionsCompleted,
    averageRating: user.averageRating,
    createdAt: user.createdAt,
  };
}

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name, email: body.email, passwordHash,
      skillsTeach: body.skillsTeach, skillsLearn: body.skillsLearn,
      credits: 200,
    }).returning();

    // Referral bonus
    if (body.referralCode) {
      const referralEmail = Buffer.from(body.referralCode, "base64").toString("utf-8");
      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.email, referralEmail)).limit(1);
      if (referrer && referrer.id !== user.id) {
        // Give referrer 50 credits
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} + 50` }).where(eq(usersTable.id, referrer.id));
        await db.insert(transactionsTable).values({
          userId: referrer.id, amount: 50, type: "referral",
          description: `Referral bonus - ${user.name} joined!`,
        });
        // Give new user 25 extra credits
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} + 25` }).where(eq(usersTable.id, user.id));
        await db.insert(transactionsTable).values({
          userId: user.id, amount: 25, type: "referral",
          description: `Welcome bonus - referred by ${referrer.name}!`,
        });
      }
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: formatUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Bad Request", message: err.message }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (!user) { res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" }); return; }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" }); return; }
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Bad Request", message: err.message }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

// Get referral link
router.get("/referral", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { verifyToken } = await import("../utils/jwt.js");
    const token = authHeader.replace("Bearer ", "");
    const payload = verifyToken(token) as any;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }
    const referralCode = Buffer.from(user.email).toString("base64");
    res.json({ referralCode, referralLink: `${process.env.FRONTEND_URL}/register?ref=${referralCode}` });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;