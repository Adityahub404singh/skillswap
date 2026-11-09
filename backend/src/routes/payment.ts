
import { Router, type Response } from "express";
import Razorpay from "razorpay";
import crypto from "node:crypto";
import { db, usersTable, transactionsTable } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { notify } from "../notify.js";

const router = Router();

// =====================================================
// RAZORPAY CONFIGURATION
// =====================================================

const KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!KEY_ID || !KEY_SECRET) {
  console.error("Payment configuration is missing.");
  throw new Error("Razorpay credentials are not configured.");
}

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

console.log("Razorpay payment service initialized.");

// =====================================================
// CREDIT PACKAGES
// =====================================================

const CREDIT_PACKAGES = [
  { id: "starter", credits: 100, price: 99, label: "Starter" },
  { id: "popular", credits: 300, price: 249, label: "Popular" },
  { id: "pro", credits: 700, price: 499, label: "Pro" },
  { id: "elite", credits: 1500, price: 999, label: "Elite" },
];

// =====================================================
// TYPES & HELPERS
// =====================================================

function paymentError(
  res: Response,
  status: number,
  message: string
) {
  return res.status(status).json({
    success: false,
    error: message,
  });
}

function getErrorDetails(error: any) {
  return {
    statusCode: error?.statusCode,
    code: error?.error?.code,
    description: error?.error?.description,
    message: error?.message,
  };
}

// =====================================================
// GET PACKAGES
// =====================================================

router.get("/packages", (_req, res) => {
  return res.json({
    success: true,
    currency: "INR",
    packages: CREDIT_PACKAGES,
  });
});

// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

router.post(
  "/create-order",
  requireAuth,
  async (req: AuthRequest, res) => {
    const requestId = crypto.randomUUID();

    try {
      const userId = req.userId;
      const { packageId } = req.body ?? {};

      if (!userId) {
        return paymentError(res, 401, "Authentication required");
      }

      if (typeof packageId !== "string") {
        return paymentError(res, 400, "Invalid package");
      }

      const pkg = CREDIT_PACKAGES.find(
        (item) => item.id === packageId
      );

      if (!pkg) {
        return paymentError(res, 400, "Invalid package");
      }

      const amount = pkg.price * 100;

      console.log("Creating Razorpay order:", {
        requestId,
        userId,
        packageId,
        amount,
      });

      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `order_${userId}_${Date.now()}`,
        notes: {
          userId: String(userId),
          packageId: pkg.id,
          credits: String(pkg.credits),
        },
      });

      console.log("Razorpay order created:", {
        requestId,
        status: order.status,
        amount: order.amount,
      });

      return res.status(201).json({
        success: true,
        orderId: order.id,
        amount,
        currency: "INR",
        credits: pkg.credits,
        keyId: KEY_ID,
      });

    } catch (error: any) {
      console.error("CREATE ORDER FAILED:", {
        requestId,
        ...getErrorDetails(error),
      });

      return paymentError(
        res,
        error?.statusCode || 500,
        error?.error?.description ||
          "Unable to create payment order"
      );
    }
  }
);

// =====================================================
// VERIFY RAZORPAY PAYMENT
// =====================================================

router.post(
  "/verify",
  requireAuth,
  async (req: AuthRequest, res) => {
    const requestId = crypto.randomUUID();

    try {
      const userId = req.userId;

      if (!userId) {
        return paymentError(res, 401, "Authentication required");
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body ?? {};

      // -------------------------------------------------
      // 1. VALIDATE REQUEST
      // -------------------------------------------------

      if (
        typeof razorpay_order_id !== "string" ||
        typeof razorpay_payment_id !== "string" ||
        typeof razorpay_signature !== "string" ||
        !/^order_[A-Za-z0-9]+$/.test(razorpay_order_id) ||
        !/^pay_[A-Za-z0-9]+$/.test(razorpay_payment_id) ||
        !/^[a-f0-9]{64}$/i.test(razorpay_signature)
      ) {
        return paymentError(res, 400, "Invalid payment details");
      }

      console.log("Verifying payment:", {
        requestId,
        userId,
      });

      // -------------------------------------------------
      // 2. VERIFY PAYMENT SIGNATURE
      // -------------------------------------------------

      const expectedSignature = crypto
        .createHmac("sha256", KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest();

      const receivedSignature = Buffer.from(
        razorpay_signature,
        "hex"
      );

      if (
        expectedSignature.length !== receivedSignature.length ||
        !crypto.timingSafeEqual(
          expectedSignature,
          receivedSignature
        )
      ) {
        console.error("Payment signature verification failed:", {
          requestId,
        });

        return paymentError(
          res,
          400,
          "Invalid payment signature"
        );
      }

      // -------------------------------------------------
      // 3. FETCH ORDER AND PAYMENT FROM RAZORPAY
      // -------------------------------------------------

      const [order, payment] = await Promise.all([
        razorpay.orders.fetch(razorpay_order_id),
        razorpay.payments.fetch(razorpay_payment_id),
      ]);

      // -------------------------------------------------
      // 4. VERIFY ORDER OWNERSHIP
      // -------------------------------------------------

      if (
        String(order.notes?.userId) !== String(userId)
      ) {
        return paymentError(
          res,
          403,
          "Order does not belong to your account"
        );
      }

      // -------------------------------------------------
      // 5. VERIFY PAYMENT-ORDER RELATIONSHIP
      // -------------------------------------------------

      if (payment.order_id !== order.id) {
        return paymentError(
          res,
          400,
          "Payment does not belong to this order"
        );
      }

      // -------------------------------------------------
      // 6. VERIFY PAYMENT STATUS
      // -------------------------------------------------

      if (payment.status !== "captured") {
        return res.status(202).json({
          success: false,
          status: payment.status,
          message: "Payment is not captured yet",
        });
      }

      // -------------------------------------------------
      // 7. VERIFY AMOUNT AND CURRENCY
      // -------------------------------------------------

      if (
        order.currency !== "INR" ||
        payment.currency !== "INR" ||
        Number(payment.amount) !== Number(order.amount)
      ) {
        return paymentError(
          res,
          400,
          "Payment amount or currency mismatch"
        );
      }

      // -------------------------------------------------
      // 8. VERIFY PACKAGE DETAILS
      // -------------------------------------------------

      const pkg = CREDIT_PACKAGES.find(
        (item) => item.id === order.notes?.packageId
      );

      if (
        !pkg ||
        pkg.credits !== Number(order.notes?.credits) ||
        pkg.price * 100 !== Number(order.amount)
      ) {
        return paymentError(
          res,
          400,
          "Invalid payment package"
        );
      }

      const verifiedCredits = pkg.credits;
      const amountPaid = Number(payment.amount) / 100;

      // -------------------------------------------------
      // 9. CHECK DUPLICATE AND UPDATE WALLET
      // -------------------------------------------------

      const result = await db.transaction(async (tx) => {
        const existingTransaction = await tx
          .select()
          .from(transactionsTable)
          .where(
            sql`${transactionsTable.description} LIKE ${`%${razorpay_payment_id}%`}`
          )
          .limit(1);

        if (existingTransaction.length > 0) {
          return {
            alreadyProcessed: true,
          };
        }

        const updatedUser = await tx
          .update(usersTable)
          .set({
            credits: sql`
              COALESCE(${usersTable.credits}, 0)
              + ${verifiedCredits}
            `,
          })
          .where(eq(usersTable.id, userId))
          .returning({ id: usersTable.id });

        if (updatedUser.length === 0) {
          throw new Error("USER_NOT_FOUND");
        }

        await tx.insert(transactionsTable).values({
          userId,
          amount: verifiedCredits,
          type: "purchase",
          description:
            `Credits purchased securely (Payment ID: ${razorpay_payment_id})`,
        });

        return {
          alreadyProcessed: false,
        };
      });

      // -------------------------------------------------
      // 10. HANDLE ALREADY PROCESSED PAYMENT
      // -------------------------------------------------

      if (result.alreadyProcessed) {
        console.log("Payment already processed:", {
          requestId,
          userId,
        });

        return res.json({
          success: true,
          alreadyProcessed: true,
          message: "Payment already processed",
        });
      }

      // -------------------------------------------------
      // 11. SEND NOTIFICATION
      // -------------------------------------------------

      console.log("Wallet credits added:", {
        requestId,
        userId,
        credits: verifiedCredits,
      });

      try {
        await notify.paymentSuccess(
          userId,
          verifiedCredits,
          amountPaid
        );
      } catch (notificationError: any) {
        console.error("PAYMENT NOTIFICATION FAILED:", {
          requestId,
          message: notificationError?.message,
        });
      }

      // -------------------------------------------------
      // 12. SUCCESS RESPONSE
      // -------------------------------------------------

      return res.json({
        success: true,
        credits: verifiedCredits,
        amount: amountPaid,
        message: `${verifiedCredits} credits added successfully`,
      });

    } catch (error: any) {
      if (error?.message === "USER_NOT_FOUND") {
        return paymentError(res, 404, "User account not found");
      }

      console.error("PAYMENT VERIFICATION FAILED:", {
        requestId,
        ...getErrorDetails(error),
      });

      return paymentError(
        res,
        500,
        "Payment verification failed"
      );
    }
  }
);

export default router;
