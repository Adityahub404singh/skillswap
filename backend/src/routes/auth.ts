import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { db } from "../db.js";
import { eq, sql, and } from "drizzle-orm";
import { signToken } from "../utils/jwt.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { usersTable } from "../schema/users.js";
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { generateOtp, sendVerificationEmail, sendPasswordResetEmail } from "../lib/mailer.js";

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
const OTP_TTL_MS = 10 * 60 * 1000; // 10 min

// 🔥 ANTI-SPAM: List of common disposable email domains
const DISPOSABLE_DOMAINS = [
  "tempmail.com", "10minutemail.com", "guerrillamail.com", "yopmail.com",
  "mailinator.com", "temp-mail.org", "throwawaymail.com", "fakemail.net",
  "getnada.com", "dispostable.com", "sharklasers.com", "tempmailaddress.com"
];

const registerSchema = z.object({
  name: z.string().min(1),
  // 🔥 UPDATED: Blocks fake emails before they even hit the database
  email: z.string().email("Invalid email").refine(
    (val) => {
      const domain = val.split('@')[1];
      return !DISPOSABLE_DOMAINS.includes(domain?.toLowerCase());
    },
    { message: "Temporary or disposable emails are not allowed for registration." }
  ),
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
    isVerified: !!user.isEmailVerifiedStatus,
  };
}

// ─────────────────────────────────────────
// OTP helpers — "otp:expiryTimestamp" string format
// Existing emailVerifyToken / phoneVerifyToken columns reuse — no migration needed ✓
// ─────────────────────────────────────────
function makeOtpToken(otp: string): string {
  return `${otp}:${Date.now() + OTP_TTL_MS}`;
}

function parseOtpToken(val: string | null | undefined): { otp: string; expiresAt: number; expired: boolean } | null {
  if (!val) return null;
  const idx = val.lastIndexOf(":");
  if (idx === -1) return null;
  const otp = val.slice(0, idx);
  const expiresAt = parseInt(val.slice(idx + 1));
  if (!otp || isNaN(expiresAt)) return null;
  return { otp, expiresAt, expired: Date.now() > expiresAt };
}

// ─────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "Conflict", message: "Email already in use" });

    // Referral code — trailing digits + full code verify
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
            if (expectedCode === code.toLowerCase()) referrerId = referrer.id;
          }
        }
      } catch (e) { console.error("Bad referral code", e); }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const otp = generateOtp();

    const [user] = await db.insert(usersTable).values({
      name: body.name,
      email: body.email,
      passwordHash,
      skillsTeachV2: body.skillsTeach,
      skillsLearnV2: body.skillsLearn,
      credits: 200,
      referredBy: referrerId ?? undefined,
      isEmailVerifiedStatus: false,
      emailVerifyToken: makeOtpToken(otp),
    }).returning();

    // Welcome bonus
    await db.insert(transactionsTable).values({
      userId: user.id, amount: 200, type: "bonus",
      description: "Welcome bonus - 200 credits!",
    } as any);

    // Referral bonus to referrer
    if (referrerId) {
      const REFERRAL_BONUS = 50;
      await db.update(usersTable)
        .set({ credits: sql`${usersTable.credits} + ${REFERRAL_BONUS}` })
        .where(eq(usersTable.id, referrerId));
      await db.insert(transactionsTable).values({
        userId: referrerId, amount: REFERRAL_BONUS, type: "referral",
        description: `Referral bonus — ${body.name} joined using your code!`,
      } as any);
      console.log(`✅ Referral bonus ${REFERRAL_BONUS}cr sent to user ${referrerId}`);
    }

    try {
      await sendVerificationEmail(body.email, body.name, otp);
      console.log(`✅ Verification OTP sent to ${body.email}`);
    } catch (emailErr) {
      console.error("📛 EMAIL SEND ERROR (register):", emailErr);
      console.log(`🔑 DEV OTP for ${body.email}: ${otp}`); // local debug only
    }

    // 🔥 FIX: Token register pe nahi diya jaata — verify-email se hi token milega
    res.status(201).json({
      user: formatUser(user),
      requiresVerification: true,
      message: "Account created! Check your email for OTP.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Bad Request", message: err.message });
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

// ─────────────────────────────────────────
// POST /auth/verify-email  { email, otp }
// ─────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isEmailVerifiedStatus) return res.status(400).json({ error: "Already verified" });

    const parsed = parseOtpToken(user.emailVerifyToken);
    if (!parsed) return res.status(400).json({ error: "No OTP found. Request a new one." });
    if (parsed.expired) return res.status(400).json({ error: "OTP expired. Request a new one." });
    if (parsed.otp !== otp.toString()) return res.status(400).json({ error: "Invalid OTP. Check your email." });

    await db.update(usersTable)
      .set({ isEmailVerifiedStatus: true, emailVerifyToken: null })
      .where(eq(usersTable.email, email));

    const [updated] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    const token = signToken({ userId: updated.id, email: updated.email! });
    res.json({ success: true, token, user: formatUser(updated), message: "Email verified! Welcome 🎉" });
  } catch (err: any) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /auth/resend-otp  { email }
// ─────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isEmailVerifiedStatus) return res.status(400).json({ error: "Already verified" });

    // Cooldown — agar 1 min se kam time hua hai last OTP ko, wait karwao
    const existing = parseOtpToken(user.emailVerifyToken);
    if (existing && !existing.expired) {
      const remainingMs = existing.expiresAt - Date.now();
      if (remainingMs > OTP_TTL_MS - 60 * 1000) {
        return res.status(429).json({ error: "Wait a minute before requesting another OTP." });
      }
    }

    const otp = generateOtp();
    await db.update(usersTable)
      .set({ emailVerifyToken: makeOtpToken(otp) })
      .where(eq(usersTable.email, email));

    try {
      await sendVerificationEmail(email, user.name!, otp);
      console.log(`✅ OTP resent to ${email}`);
    } catch (emailErr) {
      console.error("📛 EMAIL SEND ERROR (resend-otp):", emailErr);
      console.log(`🔑 DEV OTP for ${email}: ${otp}`);
    }

    res.json({ success: true, message: "OTP resent! Check your email." });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });

    const valid = await bcrypt.compare(body.password, user.passwordHash!);
    if (!valid) return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });

    if (!user.isEmailVerifiedStatus) {
      const otp = generateOtp();
      await db.update(usersTable)
        .set({ emailVerifyToken: makeOtpToken(otp) })
        .where(eq(usersTable.email, body.email));
      try {
        await sendVerificationEmail(body.email, user.name!, otp);
        console.log(`✅ OTP sent to ${body.email} (unverified login attempt)`);
      } catch (emailErr) {
        console.error("📛 EMAIL SEND ERROR (login/unverified):", emailErr);
        console.log(`🔑 DEV OTP for ${body.email}: ${otp}`);
      }

      return res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email. A new OTP has been sent.",
        requiresVerification: true,
        email: body.email,
      });
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Bad Request", message: err.message });
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

// ─────────────────────────────────────────
// POST /auth/google  { idToken }
// Works for BOTH web (GIS) and Android native (Capacitor plugin) —
// both produce an ID token whose audience is the WEB client ID, since
// the Android client only exists to verify the app's signing cert with
// Google Play Services; the actual token is always verified against the
// web client ID on the backend.
// ─────────────────────────────────────────
const googleClient = new OAuth2Client();

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "idToken is required" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ error: "Invalid Google token — no email found" });
    }

    const { email, name, sub: googleId, picture } = payload;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      // Naya user — Google se signup, koi OTP step nahi (Google ne already verify kiya)
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const [newUser] = await db.insert(usersTable).values({
        name: name || email.split("@")[0],
        email,
        passwordHash,
        avatar: picture,
        credits: 200,
        isEmailVerifiedStatus: true,
        googleId,
      }).returning();

      await db.insert(transactionsTable).values({
        userId: newUser.id, amount: 200, type: "bonus",
        description: "Welcome bonus - 200 credits!",
      } as any);

      user = newUser;
      console.log(`✅ New user via Google: ${email}`);
    } else if (!user.isEmailVerifiedStatus || !user.googleId) {
      // Existing user (purane email/password se bana) — Google se link + auto-verify
      await db.update(usersTable)
        .set({
          isEmailVerifiedStatus: true,
          googleId: user.googleId || googleId,
          emailVerifyToken: null,
        })
        .where(eq(usersTable.email, email));
      [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: formatUser(user) });
  } catch (err: any) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Google sign-in failed", message: err.message });
  }
});

// ─────────────────────────────────────────
// POST /auth/forgot-password  { email }
// (phoneVerifyToken column reuse — reset OTP ke liye, since alag column nahi hai)
// ─────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      const otp = generateOtp();
      await db.update(usersTable)
        .set({ phoneVerifyToken: makeOtpToken(otp) })
        .where(eq(usersTable.email, email));
      try {
        await sendPasswordResetEmail(email, user.name!, otp);
        console.log(`✅ Reset OTP sent to ${email}`);
      } catch (emailErr) {
        console.error("📛 EMAIL SEND ERROR (forgot-password):", emailErr);
        console.log(`🔑 DEV RESET OTP for ${email}: ${otp}`);
      }
    }
    // Email exist kare ya na kare — same response (enumeration-safe)
    res.json({ message: "If that email is registered, a reset OTP has been sent." });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// POST /auth/reset-password  { email, otp, newPassword }
// ─────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "email, otp, and newPassword are required" });
    }
    if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsed = parseOtpToken(user.phoneVerifyToken);
    if (!parsed) return res.status(400).json({ error: "No reset OTP found. Request a new one." });
    if (parsed.expired) return res.status(400).json({ error: "OTP expired. Request a new one." });
    if (parsed.otp !== otp.toString()) return res.status(400).json({ error: "Invalid OTP." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable)
      .set({ passwordHash, phoneVerifyToken: null })
      .where(eq(usersTable.email, email));

    res.json({ success: true, message: "Password reset! You can now login." });
  } catch (err: any) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /auth/referral
// ─────────────────────────────────────────
router.get("/referral", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) return res.status(404).json({ error: "Not Found" });
    const referralCode = `${user.name!.replace(/\s+/g, "").toLowerCase()}${user.id}`;
    const referralLink = (process.env.FRONTEND_URL || "https://skillswap-india.vercel.app") + "/register?ref=" + referralCode;

    // 🔥 FIX: Real referral count + earnings (invite.tsx pehle hardcoded "0 Friends" dikhata tha)
    const referredUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referredBy, user.id));
    const earnedRows = await db.select().from(transactionsTable).where(
      and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "referral"))
    );
    const totalEarned = earnedRows.reduce((sum, r) => sum + (r.amount || 0), 0);

    res.json({ referralCode, referralLink, referredCount: referredUsers.length, totalEarned });
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;