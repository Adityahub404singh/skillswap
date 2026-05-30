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

async function sendWithdrawalAlert(userName: string, amount: number, upiId: string, userId: number) {
  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `Withdrawal Request - Rs.${amount} from ${userName}`,
    html: `
      <div style="font-family: Arial; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #7c3aed;">New Withdrawal Request!</h2>
        <table style="width:100%; border-collapse:collapse;">
          <tr><td><strong>User:</strong></td><td>${userName} (ID: ${userId})</td></tr>
          <tr><td><strong>Amount:</strong></td><td>Rs.${amount}</td></tr>
          <tr><td><strong>UPI ID:</strong></td><td>${upiId}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${new Date().toLocaleString("en-IN", {timeZone:"Asia/Kolkata"})}</td></tr>
        </table>
        <p style="color:red;"><strong>Action needed: Transfer Rs.${amount} to ${upiId} via UPI</strong></p>
        <p>Go to Razorpay Dashboard to make the transfer.</p>
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
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${amount}` }).where(eq(usersTable.id, userId));
    await db.insert(transactionsTable).values({
      userId, amount: -amount, type: "withdrawal",
      description: "Withdrawal to UPI: " + upiId + " (Processing in 24-48hrs)"
    });
    sendWithdrawalAlert(user.name, amount, upiId, userId).catch(console.error);
    res.json({ success: true, message: "Withdrawal request submitted! Will be processed in 24-48 hours." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
