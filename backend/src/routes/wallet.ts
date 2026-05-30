import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import nodemailer from "nodemailer";

const router: IRouter = Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendWithdrawalAlert(userName: string, amount: number, userReceives: number, platformFee: number, upiId: string, userId: number) {
  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Withdrawal Request - Rs.${userReceives} to ${userName}`,
    html: `
      <div style="font-family: Arial; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #7c3aed;">New Withdrawal Request!</h2>
        <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
          <tr style="background:#f0f0ff;"><td style="padding:8px;"><strong>User:</strong></td><td style="padding:8px;">${userName} (ID: ${userId})</td></tr>
          <tr><td style="padding:8px;"><strong>Credits withdrawn:</strong></td><td style="padding:8px;">${amount} cr</td></tr>
          <tr style="background:#f0f0ff;"><td style="padding:8px;"><strong>Platform fee (5%):</strong></td><td style="padding:8px; color:green;">Rs.${platformFee} (yours!)</td></tr>
          <tr><td style="padding:8px;"><strong>User receives:</strong></td><td style="padding:8px; color:#e11d48;">Rs.${userReceives}</td></tr>
          <tr style="background:#f0f0ff;"><td style="padding:8px;"><strong>UPI ID:</strong></td><td style="padding:8px;">${upiId}</td></tr>
          <tr><td style="padding:8px;"><strong>Time:</strong></td><td style="padding:8px;">${new Date().toLocaleString("en-IN", {timeZone:"Asia/Kolkata"})}</td></tr>
        </table>
        <div style="background:#fee2e2; padding:15px; border-radius:8px; margin:20px 0;">
          <p style="color:red; margin:0;"><strong>Action needed: Transfer Rs.${userReceives} to UPI: ${upiId}</strong></p>
        </div>
        <p style="color:#666;">Go to Razorpay Dashboard or any UPI app to complete the transfer.</p>
      </div>
    `,
  });
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
    const totalEarned = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    res.json({ balance: user.credits, userId, totalEarned, totalSpent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/withdraw", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { amount, upiId } = req.body;
    if (!amount || !upiId) { res.status(400).json({ error: "Amount and UPI ID required" }); return; }
    if (amount < 500) { res.status(400).json({ error: "Minimum 500 credits required" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.credits < amount) { res.status(400).json({ error: "Insufficient credits" }); return; }
    const platformFee = Math.floor(amount * 0.05);
    const userReceives = amount - platformFee;
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${amount}` }).where(eq(usersTable.id, userId));
    await db.insert(transactionsTable).values({
      userId, amount: -amount, type: "withdrawal",
      description: "Withdrawal Rs." + userReceives + " to " + upiId + " (5% fee: Rs." + platformFee + ")"
    });
    sendWithdrawalAlert(user.name, amount, userReceives, platformFee, upiId, userId).catch(console.error);
    res.json({
      success: true,
      message: "Withdrawal of Rs." + userReceives + " submitted! (5% platform fee applied) Processing in 24-48 hours.",
      userReceives,
      platformFee
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
