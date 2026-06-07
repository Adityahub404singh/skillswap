import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, usersTable, transactionsTable } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { notify } from "../notify.js";

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const CREDIT_PACKAGES = [
  { id: "starter", credits: 100, price: 99, label: "Starter" },
  { id: "popular", credits: 300, price: 249, label: "Popular" },
  { id: "pro", credits: 700, price: 499, label: "Pro" },
  { id: "elite", credits: 1500, price: 999, label: "Elite" },
];

router.get("/packages", (req, res) => {
  res.json(CREDIT_PACKAGES);
});

router.post("/create-order", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { packageId } = req.body;
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return; }

    const order = await razorpay.orders.create({
      amount: pkg.price * 100,
      currency: "INR",
      receipt: `order_${req.userId}_${Date.now()}`,
      notes: { userId: String(req.userId), credits: String(pkg.credits), packageId },
    });

    res.json({
      orderId: order.id,
      amount: pkg.price * 100,
      currency: "INR",
      credits: pkg.credits,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    const userId = req.userId!;
    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${credits}` })
      .where(eq(usersTable.id, userId));

    await db.insert(transactionsTable).values({
      userId,
      amount: credits,
      type: "purchase",
      description: "Credits purchased via Razorpay (Payment ID: " + razorpay_payment_id + ")",
    });

    // Fire email & app notification
    const pkg = CREDIT_PACKAGES.find(p => p.credits === credits);
    const amountPaid = pkg ? pkg.price : credits;
    await notify.paymentSuccess(userId, credits, amountPaid);

    res.json({ success: true, credits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

export default router;
