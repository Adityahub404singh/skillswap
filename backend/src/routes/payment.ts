import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, usersTable, transactionsTable } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { notify } from "../notify.js";

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_123",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "secret_123",
});

const CREDIT_PACKAGES = [
  { id: "starter", credits: 100, price: 99, label: "Starter" },
  { id: "popular", credits: 300, price: 249, label: "Popular" },
  { id: "pro", credits: 700, price: 499, label: "Pro" },
  { id: "elite", credits: 1500, price: 999, label: "Elite" },
];

router.get("/packages", (req, res) => res.json(CREDIT_PACKAGES));

router.post("/create-order", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { packageId } = req.body;
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: "Invalid package" });

    const order = await razorpay.orders.create({
      amount: pkg.price * 100,
      currency: "INR",
      receipt: `order_${req.userId}_${Date.now()}`
    });

    res.json({ orderId: order.id, amount: pkg.price * 100, currency: "INR", credits: pkg.credits, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err: any) {
    console.error("Razorpay Create Order Error:", err);
    res.status(500).json({ error: "Failed to create order. Please check Razorpay keys." });
  }
});

router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: "Invalid payment signature" });

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amountPaid = (order.amount as number) / 100;
    
    const pkg = CREDIT_PACKAGES.find(p => p.price === amountPaid);
    const verifiedCredits = pkg ? pkg.credits : Math.floor(amountPaid);

    const userId = req.userId!;
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${verifiedCredits}` }).where(eq(usersTable.id, userId));

    // 🚨 BUG FIXED HERE: Added missing db.insert command
    await db.insert(transactionsTable).values({
      userId, amount: verifiedCredits, type: "purchase",
      description: `Credits purchased securely (Payment ID: ${razorpay_payment_id})`,
    });

    await notify.paymentSuccess(userId, verifiedCredits, amountPaid);
    res.json({ success: true, credits: verifiedCredits });
  } catch (err: any) {
    console.error("Razorpay Verify Error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;