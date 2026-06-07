import crypto from 'crypto';
import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { signToken } from "../utils/jwt.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { pgTable, serial, integer, text, timestamp, real, varchar, boolean, jsonb } from "drizzle-orm/pg-core";

const usersTable = pgTable("users", {
  id:                  serial("id").primaryKey(),
  name:                text("name").notNull(),
  email:               text("email").notNull(),
  passwordHash:        text("password_hash").notNull(),
  bio:                 text("bio"),
  avatar:              text("avatar"),
  skillsTeach:         text("skills_teach"),
  skillsLearn:         text("skills_learn"),
  credits:             integer("credits").notNull().default(50),
  trustScore:          integer("trust_score").notNull().default(0),
  sessionsCompleted:   integer("sessions_completed").notNull().default(0),
  averageRating:       real("average_rating").notNull().default(0),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  pricePerHour:        integer("price_per_hour").notNull().default(0),
  isAdmin:             integer("is_admin").default(0),
  currentStreak:       integer("current_streak").notNull().default(0),
  longestStreak:       integer("longest_streak").notNull().default(0),
  lastActiveDate:      text("last_active_date"),
  verifiedSkills:      jsonb("verified_skills"),
  badges:              jsonb("badges"),
  location:            varchar("location", { length: 100 }),
  microSessionsCount:  integer("micro_sessions_count").notNull().default(0),
  portfolioPublic:     boolean("portfolio_public").notNull().default(true),
  seoSlug:             varchar("seo_slug", { length: 100 }),
  isPremium:           boolean("is_premium").notNull().default(false),
  premiumExpiresAt:    timestamp("premium_expires_at"),
  notificationLastSent: timestamp("notification_last_sent"),
  referredBy:          integer("referred_by")
});

const transactionsTable = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  amount:      integer("amount").notNull(),
  type:        text("type").notNull(),
  description: text("description").notNull(),
  sessionId:   integer("session_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
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
    id: user.id, name: user.name, email: user.email,
    bio: user.bio, avatar: user.avatar,
    skillsTeach: parseJsonField(user.skillsTeach),
    skillsLearn: parseJsonField(user.skillsLearn),
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
    if (existing.length > 0) return res.status(409).json({ error: "Conflict", message: "Email already in use" });

    let referrerId: number | null = null;
    if (body.referralCode) {
      try {
        const potentialRefId = parseInt(body.referralCode.replace(/[^0-9]/g, ''));
        const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, potentialRefId)).limit(1);
        if (referrer) referrerId = referrer.id;
      } catch (e) { console.error("Bad referral code", e); }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name, 
      email: body.email, 
      passwordHash,
      skillsTeach: JSON.stringify(body.skillsTeach), 
      skillsLearn: JSON.stringify(body.skillsLearn),
      credits: 200, // ✅ FIX: Ab naye user ko strictly 200 credits milenge
      referredBy: referrerId
    }).returning();

    await db.insert(transactionsTable).values({
      userId: user.id, amount: 200, type: "bonus", description: "Welcome bonus - 200 credits to start your journey!",
    });

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await db.update(usersTable)
      .set({ emailVerifyToken: verifyToken })
      .where(eq(usersTable.id, user.id));

    // Send verification email (non-blocking)
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const verifyUrl = (process.env.FRONTEND_URL || 'https://skillswap.app') + '/verify-email?token=' + verifyToken + '&email=' + encodeURIComponent(user.email);
      await transporter.sendMail({
        from: '"SkillSwap" <' + process.env.EMAIL_USER + '>',
        to: user.email,
        subject: 'Verify your SkillSwap account',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><div style="background:linear-gradient(135deg,#5B5BF6,#7c3aed);padding:24px;border-radius:16px;text-align:center;margin-bottom:24px"><h1 style="color:white;margin:0;font-size:24px">SkillSwap</h1><p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Exchange Skills, Not Money</p></div><h2 style="color:#1a1a2e">Verify Your Email</h2><p style="color:#64748b">Hi ' + user.name + ', click below to verify your account and unlock all features.</p><a href="' + verifyUrl + '" style="display:inline-block;background:linear-gradient(135deg,#5B5BF6,#7c3aed);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:bold;margin:16px 0">Verify Email Address</a><p style="color:#94a3b8;font-size:12px;margin-top:24px">Link expires in 24 hours. If you did not create this account, ignore this email.</p></div>'
      });
    } catch (emailErr) {
      console.error('[register] Email send failed:', emailErr.message);
    }

    const jwtToken = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token: jwtToken, user: formatUser(user), emailSent: true });
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
    
    const referralCode = `${user.name.replace(/\s+/g, '').toLowerCase()}${user.id}`;
    const referralLink = (process.env.FRONTEND_URL || "https://skillswap.app") + "/register?ref=" + referralCode;
    res.json({ referralCode, referralLink });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
