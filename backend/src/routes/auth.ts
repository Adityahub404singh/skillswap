import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { signToken } from "../utils/jwt.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { usersTable } from "../schema/users.js"; 
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  sessionId: integer("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

function parseJsonField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    skillsTeach: parseJsonField(user.skillsTeachV2),
    skillsLearn: parseJsonField(user.skillsLearnV2),
    credits: user.credits,
    trustScore: user.trustScore,
    sessionsCompleted: user.sessionsCompleted,
    averageRating: user.averageRating,
    createdAt: user.createdAt,
    currentStreak: user.currentStreak,
    isPremium: user.isPremiumUser,
  };
}

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "Conflict", message: "Email already in use" });

    // 🔥 FIX 1: Strict Referral Code parsing (Trailing digits only)
    let referrerId: number | null = null;
    if (body.referralCode) {
      try {
        const code = body.referralCode as string;
        const match = code.match(/(\d+)$/);
        const potentialRefId = match ? parseInt(match[1]) : NaN;
        
        if (!isNaN(potentialRefId) && potentialRefId > 0) {
          const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, potentialRefId)).limit(1);
          if (referrer) {
            const expectedCode = `${referrer.name!.replace(/\s+/g, "").toLowerCase()}${referrer.id}`;
            // Case-insensitive exact match
            if (expectedCode === code.toLowerCase()) {
              referrerId = referrer.id;
            }
          }
        }
      } catch (e) { console.error("Bad referral code", e); }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name,
      email: body.email,
      passwordHash,
      skillsTeachV2: body.skillsTeach,
      skillsLearnV2: body.skillsLearn,
      credits: 200,
      referredBy: referrerId ?? undefined,
    }).returning();

    // Welcome bonus transaction
    await db.insert(transactionsTable).values({
      userId: user.id,
      amount: 200,
      type: "bonus",
      description: "Welcome bonus - 200 credits!",
    } as any);

    // 🔥 FIX 2: Give Referrer the Bonus IMMEDIATELY
    if (referrerId) {
      const REFERRAL_BONUS = 50;
      await db.update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${REFERRAL_BONUS}` })
        .where(eq(usersTable.id, referrerId));

      await db.insert(transactionsTable).values({
        userId: referrerId,
        amount: REFERRAL_BONUS,
        type: "referral", // Optional: Change to "earned" if "referral" is not in your DB enum
        description: `Referral bonus — ${body.name} joined using your code!`,
      } as any);
      
      console.log(`✅ Referral bonus ${REFERRAL_BONUS}cr sent to user ${referrerId}`);
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: formatUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Bad Request", message: err.message });
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Bad Request", message: err.message });
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

router.get("/referral", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) return res.status(404).json({ error: "Not Found" });
    const referralCode = `${user.name!.replace(/\s+/g, "").toLowerCase()}${user.id}`;
    const referralLink = (process.env.FRONTEND_URL || "https://skillswap.app") + "/register?ref=" + referralCode;
    res.json({ referralCode, referralLink });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// 🔥 10x Feature: Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    if (users[0]) {
      // Mocking email dispatch in terminal
      console.log(`\n======================================================`);
      console.log(`📧 [MOCK EMAIL DISPATCHED] To: ${email}`);
      console.log(`Subject: Reset Your SkillSwap Password`);
      console.log(`Body: Click here to reset -> http://localhost:5173/reset-password?token=${resetToken}`);
      console.log(`======================================================\n`);
    }

    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err: any) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;